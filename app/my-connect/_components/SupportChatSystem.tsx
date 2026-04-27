"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { buildStorageObjectUrl, CHAT_FILE_BUCKET } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { SupportHeaderActions } from "./support/SupportHeaderActions";
import { SupportRequestComposer } from "./support/SupportRequestComposer";
import { SupportStatusNotice } from "./support/SupportStatusNotice";
import { ChatMessagePanel } from "./chat/ChatMessagePanel";
import { CHAT_FILE_ACCEPT, getChatFileValidationMessage, isAllowedChatFile } from "./chat/fileConstraints";
import { ChatRoomSidebar } from "./chat/ChatRoomSidebar";
import type { ChatMessageRow, ChatMessageView, ChatRoomRow, ChatRoomView, ProfileRow } from "./chat/types";
import { formatMessageTime, formatRelativeTime, getAvatarInitial, getPresenceLabel, getProfileDisplayName, isRecentlyOnline } from "./chat/utils";

type SupportChatSystemProps = {
  userId: string;
  isMaster?: boolean;
  initialRoomId?: string;
};

export function SupportChatSystem({ userId, isMaster = false, initialRoomId = "" }: SupportChatSystemProps) {
  const [rooms, setRooms] = useState<ChatRoomView[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [requestInput, setRequestInput] = useState("");
  const [isCreatingNewRequest, setIsCreatingNewRequest] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState<"all" | "unread" | "active">("all");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isApprovingRoom, setIsApprovingRoom] = useState(false);
  const [isClosingRoom, setIsClosingRoom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevRoomIdRef = useRef("");
  const shouldScrollToBottomRef = useRef(false);
  const messagesRef = useRef<ChatMessageView[]>([]);
  const selectedRoomIdRef = useRef("");

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId) || null, [rooms, selectedRoomId]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        !query ||
        room.counterpartName.toLowerCase().includes(query) ||
        room.lastMessage.toLowerCase().includes(query) ||
        room.counterpartSubtitle.toLowerCase().includes(query);

      const matchesFilter =
        roomFilter === "all" ||
        (roomFilter === "unread" && room.unreadCount > 0) ||
        (roomFilter === "active" && room.isOnline);

      return matchesSearch && matchesFilter;
    });
  }, [roomFilter, rooms, searchQuery]);

  const isNearBottom = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= 100;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    const roomChanged = prevRoomIdRef.current !== selectedRoomId;
    if (!roomChanged) return;

    prevRoomIdRef.current = selectedRoomId;
    shouldScrollToBottomRef.current = true;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!messages.length || !shouldScrollToBottomRef.current) return;

    shouldScrollToBottomRef.current = false;
    scrollToBottom("auto");
  }, [messages, scrollToBottom]);

  const touchPresence = useCallback(async () => {
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
  }, [userId]);

  useEffect(() => {
    void touchPresence();

    const handleFocus = () => {
      void touchPresence();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void touchPresence();
      }
    };

    const interval = window.setInterval(() => {
      void touchPresence();
    }, 30000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [touchPresence]);

  const refreshRooms = useCallback(async () => {
    const roomQuery = isMaster
      ? supabase.from("chat_rooms").select("*").eq("room_type", "support")
      : supabase.from("chat_rooms").select("*").eq("room_type", "support").eq("client_id", userId);

    const { data: roomRows, error: roomError } = await roomQuery.order("updated_at", { ascending: false });
    if (roomError) {
      console.error("Failed to load support rooms:", roomError.message);
      return;
    }

    const roomsData = ((roomRows as ChatRoomRow[] | null) || []).filter(Boolean);
    if (!roomsData.length) {
      setRooms([]);
      setSelectedRoomId("");
      return;
    }

    const profileIds = Array.from(
      new Set(
        roomsData.flatMap((room) => [room.client_id, room.master_profile_id].filter((value): value is string => Boolean(value)))
      )
    );

    const [{ data: profiles }, { data: unreadMessages }] = await Promise.all([
      profileIds.length
        ? supabase.from("profiles").select("id, full_name, email, last_seen_at, role").in("id", profileIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("chat_messages")
        .select("room_id, sender_id, is_read")
        .in("room_id", roomsData.map((room) => room.id))
        .neq("sender_id", userId)
        .eq("is_read", false),
    ]);

    const profileMap = new Map((((profiles as ProfileRow[] | null) || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
    const unreadMap = new Map<string, number>();

    ((unreadMessages as Array<{ room_id: string }> | null) || []).forEach((message) => {
      unreadMap.set(message.room_id, (unreadMap.get(message.room_id) || 0) + 1);
    });

    const nextRooms: ChatRoomView[] = roomsData.map((room) => {
      const clientProfile = profileMap.get(room.client_id);
      const masterProfile = room.master_profile_id ? profileMap.get(room.master_profile_id) : null;
      const approvalStatus = room.approval_status || "pending";

      // 상대방 이름 처리
      const counterpartName = isMaster
        ? getProfileDisplayName(clientProfile, "고객")
        : approvalStatus === "approved" || approvalStatus === "closed"
          ? getProfileDisplayName(masterProfile, "고객센터")
          : "고객센터";

      // 상대방 서브타이틀(역할/상태) 처리
      const counterpartSubtitle = isMaster
        ? clientProfile?.role === "manufacturer"
          ? "제조사"
          : "의뢰자"
        : approvalStatus === "approved"
          ? "마스터 상담"
          : approvalStatus === "closed"
            ? "상담 종료"
            : "승인 대기";

      const counterpartProfile = isMaster ? clientProfile : masterProfile;

      return {
        id: room.id,
        counterpartName,
        counterpartSubtitle,
        avatar: `initial:${getAvatarInitial(counterpartName)}`,
        unreadCount: unreadMap.get(room.id) || 0,
        // 마지막 메시지 기본값
        lastMessage: room.last_message || room.support_request_message || "상담 요청이 접수되었습니다.",
        lastTime: room.last_message_at ? formatRelativeTime(room.last_message_at) : "",
        isOnline: approvalStatus === "approved" ? isRecentlyOnline(counterpartProfile?.last_seen_at || null) : false,
        // 상태 라벨
        lastSeenLabel:
          approvalStatus === "pending"
            ? "수락 대기 중"
            : approvalStatus === "closed"
              ? "상담 종료"
              : getPresenceLabel(counterpartProfile?.last_seen_at || null),
        roomType: "support",
        approvalStatus,
        requestMessage: room.support_request_message || "",
      };
    });

    setRooms(nextRooms);
    setSelectedRoomId((prev) => {
      if (initialRoomId && nextRooms.some((room) => room.id === initialRoomId)) return initialRoomId;
      return nextRooms.some((room) => room.id === prev) ? prev : nextRooms[0]?.id || "";
    });
  }, [initialRoomId, isMaster, userId]);

  const refreshMessages = useCallback(
    async (roomId: string) => {
      const wasNearBottom = isNearBottom();
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, room_id, sender_id, content, message_type, is_read, created_at, file_url, file_name, file_size")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load support messages:", error.message);
        return;
      }

      const nextMessages = (((data as ChatMessageRow[] | null) || [])).map((message) => ({
        ...message,
        file_url: message.file_url ? buildStorageObjectUrl(CHAT_FILE_BUCKET, message.file_url) : null,
        isMine: message.sender_id === userId,
        timeLabel: formatMessageTime(message.created_at),
      }));

      const currentMessages = messagesRef.current;
      const prevLastMessageId = currentMessages[currentMessages.length - 1]?.id;
      const nextLastMessage = nextMessages[nextMessages.length - 1];
      const hasNewLastMessage = !!nextLastMessage && nextLastMessage.id !== prevLastMessageId;
      const isMyNewMessage = !!nextLastMessage && nextLastMessage.sender_id === userId;

      if (hasNewLastMessage && (wasNearBottom || isMyNewMessage)) {
        shouldScrollToBottomRef.current = true;
      }

      setMessages(nextMessages);

      const hasUnread = nextMessages.some((message) => !message.isMine && !message.is_read);
      if (hasUnread) {
        await supabase.from("chat_messages").update({ is_read: true }).eq("room_id", roomId).neq("sender_id", userId).eq("is_read", false);
        setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)));
      }
    },
    [isNearBottom, userId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshRooms();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshRooms]);

  useEffect(() => {
    if (selectedRoomId) {
      const timer = window.setTimeout(() => {
        void refreshMessages(selectedRoomId);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setMessages([]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshMessages, selectedRoomId]);

  useEffect(() => {
    const refreshAll = () => {
      void refreshRooms();
      if (selectedRoomIdRef.current) {
        void refreshMessages(selectedRoomIdRef.current);
      }
    };

    const channel = supabase
      .channel(`support-chat-${userId}-${isMaster ? "master" : "client"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void refreshRooms();
      })
      .subscribe();

    const polling = window.setInterval(refreshAll, 10000);

    return () => {
      window.clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [isMaster, refreshMessages, refreshRooms, userId]);

  const sendMessage = async (content: string, file?: File | null) => {
    if (!selectedRoomId) return;

    const trimmedContent = content.trim();
    if (!trimmedContent && !file) return;

    setIsSending(true);
    shouldScrollToBottomRef.current = true;

    const formData = new FormData();
    formData.append("roomId", selectedRoomId);
    formData.append("content", trimmedContent);
    if (file) {
      formData.append("file", file);
    }

    const response = await authFetch("/api/chat/messages", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      alert(result.error || "메시지 전송에 실패했습니다.");
      setIsSending(false);
      return;
    }

    setMessageInput("");
    void refreshRooms();
    void refreshMessages(selectedRoomId);
    setIsSending(false);
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedRoomId) return;
    if (!isAllowedChatFile(file)) {
      alert(getChatFileValidationMessage());
      return;
    }

    setIsUploading(true);
    shouldScrollToBottomRef.current = true;
    await sendMessage(file.name, file);
    setIsUploading(false);
  };

  const handleCreateRequest = async () => {
    const requestMessage = requestInput.trim();
    if (!requestMessage) {
      alert("상담 요청 내용을 입력해 주세요.");
      return;
    }

    setIsCreatingRoom(true);

    const response = await authFetch("/api/support/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestMessage }),
    });
    const result = (await response.json()) as { error?: string; data?: { id?: string } };

    if (!response.ok) {
      alert(result.error || "상담 요청 생성에 실패했습니다.");
      setIsCreatingRoom(false);
      return;
    }

    setRequestInput("");
    await refreshRooms();
    if (result.data?.id) {
      setSelectedRoomId(result.data.id);
    }
    setIsCreatingNewRequest(false);
    setIsCreatingRoom(false);
  };

  const handleApproveRoom = async () => {
    if (!selectedRoomId) return;

    setIsApprovingRoom(true);

    const response = await authFetch(`/api/support/rooms/${selectedRoomId}/approve`, {
      method: "POST",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      alert(result.error || "상담 요청 수락에 실패했습니다.");
      setIsApprovingRoom(false);
      return;
    }

    await refreshRooms();
    await refreshMessages(selectedRoomId);
    setIsApprovingRoom(false);
  };

  const handleCloseRoom = async () => {
    if (!selectedRoomId) return;

    setIsClosingRoom(true);

    const response = await authFetch(`/api/support/rooms/${selectedRoomId}/close`, {
      method: "POST",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      alert(result.error || "상담 종료에 실패했습니다.");
      setIsClosingRoom(false);
      return;
    }

    await refreshRooms();
    await refreshMessages(selectedRoomId);
    setIsClosingRoom(false);
  };

  const openNewRequestForm = () => {
    setRequestInput("");
    setIsCreatingNewRequest(true);
  };

  const statusNotice = selectedRoom?.requestMessage ? (
    <SupportStatusNotice
      requestMessage={selectedRoom.requestMessage}
      approvalStatus={selectedRoom.approvalStatus || "pending"}
      isMaster={isMaster}
      onCreateNewRequest={openNewRequestForm}
    />
  ) : null;

  if (!isMaster && (!rooms.length || isCreatingNewRequest)) {
    return (
      <SupportRequestComposer
        hasExistingRooms={rooms.length > 0}
        requestInput={requestInput}
        isCreatingRoom={isCreatingRoom}
        onRequestInputChange={setRequestInput}
        onSubmit={() => void handleCreateRequest()}
        onBackToRoom={() => setIsCreatingNewRequest(false)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#F8F9FA]">
      <input ref={fileInputRef} type="file" hidden accept={CHAT_FILE_ACCEPT} onChange={handleFileSelect} />

      <ChatRoomSidebar
        rooms={filteredRooms}
        roomFilter={roomFilter}
        searchQuery={searchQuery}
        selectedRoomId={selectedRoomId}
        onFilterChange={setRoomFilter}
        onSearchChange={setSearchQuery}
        onRoomSelect={setSelectedRoomId}
        title={isMaster ? "고객센터 요청" : "고객센터"}
        searchPlaceholder={isMaster ? "요청 검색..." : "상담 내역 검색..."}
        emptyLabel={isMaster ? "접수된 고객센터 요청이 없습니다." : "상담 내역이 없습니다."}
        showActiveFilter
      />

      <ChatMessagePanel
        selectedRoom={selectedRoom}
        messages={messages}
        messageInput={messageInput}
        isSending={isSending}
        isUploading={isUploading}
        messageListRef={messageListRef}
        messagesEndRef={messagesEndRef}
        onInputChange={setMessageInput}
        onSend={() => void sendMessage(messageInput)}
        onFileClick={() => fileInputRef.current?.click()}

        title={isMaster ? selectedRoom?.counterpartName || "고객 문의" : "고객센터"}
        statusNotice={selectedRoom ? statusNotice : null}
        inputDisabled={!selectedRoom || selectedRoom.approvalStatus !== "approved"}

        inputPlaceholder={
          selectedRoom?.approvalStatus === "approved"
            ? "메시지를 입력해 주세요..."
            : "고객센터 담당자 수락 후 메시지를 보낼 수 있습니다."
        }

        composerHint={
          selectedRoom?.approvalStatus === "approved"
            ? "Shift + Enter로 줄바꿈"
            : selectedRoom?.approvalStatus === "closed"
              ? "종료된 고객센터 대화입니다."
              : "상담 요청이 승인되면 채팅이 열립니다."
        }
        headerAction={
          <SupportHeaderActions
            isMaster={isMaster}
            selectedRoom={selectedRoom}
            isApprovingRoom={isApprovingRoom}
            isClosingRoom={isClosingRoom}
            onApprove={() => void handleApproveRoom()}
            onClose={() => void handleCloseRoom()}
            onCreateNewRequest={openNewRequestForm}
          />
        }
      />
    </div>
  );
}
