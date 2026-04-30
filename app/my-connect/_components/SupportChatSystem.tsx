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

const MESSAGE_PAGE_SIZE = 10;
const PRESENCE_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

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
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevRoomIdRef = useRef("");
  const shouldScrollToBottomRef = useRef(false);
  const messagesRef = useRef<ChatMessageView[]>([]);
  const roomsRef = useRef<ChatRoomView[]>([]);
  const selectedRoomIdRef = useRef("");
  const roomsRefreshInFlightRef = useRef(false);
  const pendingRoomsRefreshRef = useRef(false);
  const messagesRefreshInFlightRef = useRef<Record<string, boolean>>({});
  const pendingMessagesRefreshRef = useRef<Record<string, boolean>>({});
  const readReceiptInFlightRef = useRef<Record<string, boolean>>({});
  const refreshRoomsTimeoutRef = useRef<number | null>(null);
  const refreshMessageTimeoutsRef = useRef<Record<string, number>>({});
  const lastPresenceUpdateRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

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

  const toMessageView = useCallback(
    (message: ChatMessageRow): ChatMessageView => ({
      ...message,
      file_url: message.file_url ? buildStorageObjectUrl(CHAT_FILE_BUCKET, message.file_url) : null,
      isMine: message.sender_id === userId,
      timeLabel: formatMessageTime(message.created_at),
    }),
    [userId]
  );

  const replaceMessage = useCallback((message: ChatMessageView) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === message.id);
      if (existingIndex === -1) {
        return [...prev, message].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }

      const next = [...prev];
      next[existingIndex] = message;
      return next;
    });
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
  }, []);

  const fetchMessagePage = useCallback(
    async (roomId: string, beforeCreatedAt?: string | null, pageSize = MESSAGE_PAGE_SIZE) => {
      let query = supabase
        .from("chat_messages")
        .select("id, room_id, sender_id, content, message_type, is_read, created_at, file_url, file_name, file_size")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(pageSize + 1);

      if (beforeCreatedAt) {
        query = query.lt("created_at", beforeCreatedAt);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      const rows = ((data as ChatMessageRow[] | null) || []).filter(Boolean);
      const hasMore = rows.length > pageSize;
      const pageRows = (hasMore ? rows.slice(0, pageSize) : rows).slice().reverse();

      return {
        messages: pageRows.map(toMessageView),
        hasMore,
      };
    },
    [toMessageView]
  );

  const markRoomMessagesRead = useCallback(
    async (roomId: string) => {
      if (!roomId || readReceiptInFlightRef.current[roomId]) {
        return;
      }

      readReceiptInFlightRef.current[roomId] = true;
      try {
        await supabase.from("chat_messages").update({ is_read: true }).eq("room_id", roomId).neq("sender_id", userId).eq("is_read", false);
      } finally {
        readReceiptInFlightRef.current[roomId] = false;
      }

      setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)));
    },
    [userId]
  );

  const loadPresenceMap = useCallback(async (profileIds: string[]) => {
    if (!profileIds.length) {
      return {};
    }

    try {
      const response = await authFetch("/api/chat/presence/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds: profileIds }),
      });

      if (!response.ok) {
        return {};
      }

      const result = (await response.json()) as {
        presence?: Record<string, string | null>;
      };

      return result.presence || {};
    } catch {
      return {};
    }
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

  const touchPresence = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastPresenceUpdateRef.current < PRESENCE_UPDATE_INTERVAL_MS) {
      return;
    }

    lastPresenceUpdateRef.current = now;
    await authFetch("/api/chat/presence/heartbeat", {
      method: "POST",
    });
  }, []);

  useEffect(() => {
    void touchPresence(true);

    const handleFocus = () => {
      void touchPresence(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void touchPresence(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [touchPresence]);

  useEffect(() => {
    if (!selectedRoomId) return;
    void touchPresence();
  }, [selectedRoomId, touchPresence]);

  const refreshRooms = useCallback(async () => {
    if (roomsRefreshInFlightRef.current) {
      pendingRoomsRefreshRef.current = true;
      return;
    }

    roomsRefreshInFlightRef.current = true;
    const roomQuery = isMaster
      ? supabase
          .from("chat_rooms")
          .select("id, client_id, master_profile_id, approval_status, support_request_message, last_message, last_message_at")
          .eq("room_type", "support")
      : supabase
          .from("chat_rooms")
          .select("id, client_id, master_profile_id, approval_status, support_request_message, last_message, last_message_at")
          .eq("room_type", "support")
          .eq("client_id", userId);

    try {
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
    const presenceMap = await loadPresenceMap(profileIds);

    const profileMap = new Map((((profiles as ProfileRow[] | null) || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
    const unreadMap = new Map<string, number>();

    ((unreadMessages as Array<{ room_id: string }> | null) || []).forEach((message) => {
      unreadMap.set(message.room_id, (unreadMap.get(message.room_id) || 0) + 1);
    });

    const resolvePresence = (profileId: string | null | undefined, fallbackLastSeen: string | null | undefined) => {
      if (!profileId) return fallbackLastSeen || null;
      return presenceMap[profileId] || fallbackLastSeen || null;
    };

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
        isOnline:
          approvalStatus === "approved"
            ? isRecentlyOnline(resolvePresence(counterpartProfile?.id, counterpartProfile?.last_seen_at))
            : false,
        // 상태 라벨
        lastSeenLabel:
          approvalStatus === "pending"
            ? "수락 대기 중"
            : approvalStatus === "closed"
              ? "상담 종료"
              : getPresenceLabel(resolvePresence(counterpartProfile?.id, counterpartProfile?.last_seen_at)),
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
    } finally {
      roomsRefreshInFlightRef.current = false;

      if (pendingRoomsRefreshRef.current) {
        pendingRoomsRefreshRef.current = false;
        void refreshRooms();
      }
    }
  }, [initialRoomId, isMaster, loadPresenceMap, userId]);

  const refreshMessages = useCallback(
    async (roomId: string) => {
      if (!roomId) {
        return;
      }

      if (messagesRefreshInFlightRef.current[roomId]) {
        pendingMessagesRefreshRef.current[roomId] = true;
        return;
      }

      messagesRefreshInFlightRef.current[roomId] = true;

      try {
        const wasNearBottom = isNearBottom();
        const targetPageSize = Math.max(messagesRef.current.length || 0, MESSAGE_PAGE_SIZE);
        const { messages: nextMessages, hasMore } = await fetchMessagePage(roomId, null, targetPageSize);

        const currentMessages = messagesRef.current;
        const prevLastMessageId = currentMessages[currentMessages.length - 1]?.id;
        const nextLastMessage = nextMessages[nextMessages.length - 1];
        const hasNewLastMessage = !!nextLastMessage && nextLastMessage.id !== prevLastMessageId;
        const isMyNewMessage = !!nextLastMessage && nextLastMessage.sender_id === userId;

        if (hasNewLastMessage && (wasNearBottom || isMyNewMessage)) {
          shouldScrollToBottomRef.current = true;
        }

        setMessages(nextMessages);
        setHasOlderMessages(hasMore);

        const hasUnread = nextMessages.some((message) => !message.isMine && !message.is_read);
        if (hasUnread) {
          await markRoomMessagesRead(roomId);
          void refreshRooms();
        }
      } finally {
        messagesRefreshInFlightRef.current[roomId] = false;

        if (pendingMessagesRefreshRef.current[roomId]) {
          pendingMessagesRefreshRef.current[roomId] = false;
          void refreshMessages(roomId);
        }
      }
    },
    [fetchMessagePage, isNearBottom, markRoomMessagesRead, refreshRooms, userId]
  );

  const scheduleRoomsRefresh = useCallback(
    (delay = 150) => {
      if (refreshRoomsTimeoutRef.current) {
        window.clearTimeout(refreshRoomsTimeoutRef.current);
      }

      refreshRoomsTimeoutRef.current = window.setTimeout(() => {
        refreshRoomsTimeoutRef.current = null;
        void refreshRooms();
      }, delay);
    },
    [refreshRooms]
  );

  const scheduleMessagesRefresh = useCallback(
    (roomId: string, delay = 150) => {
      if (!roomId) return;

      const existingTimer = refreshMessageTimeoutsRef.current[roomId];
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      refreshMessageTimeoutsRef.current[roomId] = window.setTimeout(() => {
        delete refreshMessageTimeoutsRef.current[roomId];
        void refreshMessages(roomId);
      }, delay);
    },
    [refreshMessages]
  );

  const loadOlderMessages = useCallback(async () => {
    if (!selectedRoomId || isLoadingOlderMessages || !hasOlderMessages) {
      return;
    }

    const oldestCreatedAt = messagesRef.current[0]?.created_at;
    if (!oldestCreatedAt) {
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const { messages: olderMessages, hasMore } = await fetchMessagePage(selectedRoomId, oldestCreatedAt);
      setMessages((prev) => [...olderMessages, ...prev]);
      setHasOlderMessages(hasMore);
    } catch (error) {
      console.error("Failed to load older support messages:", error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [fetchMessagePage, hasOlderMessages, isLoadingOlderMessages, selectedRoomId]);

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
      setHasOlderMessages(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshMessages, selectedRoomId]);

  useEffect(() => {
    const handleFocus = () => {
      scheduleRoomsRefresh(0);
      if (selectedRoomIdRef.current) {
        scheduleMessagesRefresh(selectedRoomIdRef.current, 0);
      }
    };

    const channel = supabase
      .channel(`support-chat-${userId}-${isMaster ? "master" : "client"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (payload) => {
        const payloadRoomId =
          typeof payload.new === "object" && payload.new && "room_id" in payload.new
            ? String(payload.new.room_id || "")
            : typeof payload.old === "object" && payload.old && "room_id" in payload.old
              ? String(payload.old.room_id || "")
              : "";
        const isKnownRoom = payloadRoomId ? roomsRef.current.some((room) => room.id === payloadRoomId) : false;

        if (!isKnownRoom) {
          return;
        }

        if (payloadRoomId && payloadRoomId === selectedRoomIdRef.current) {
          if (payload.eventType === "INSERT" && payload.new) {
            const nextMessage = toMessageView(payload.new as ChatMessageRow);
            const wasNearBottom = isNearBottom();

            setRooms((prev) => {
              const roomIndex = prev.findIndex((room) => room.id === payloadRoomId);
              if (roomIndex === -1) {
                return prev;
              }

              const targetRoom = prev[roomIndex];
              const updatedRoom = {
                ...targetRoom,
                lastMessage: nextMessage.content || targetRoom.lastMessage,
                lastTime: formatRelativeTime(nextMessage.created_at),
                unreadCount: nextMessage.isMine ? targetRoom.unreadCount : 0,
              };

              return [updatedRoom, ...prev.slice(0, roomIndex), ...prev.slice(roomIndex + 1)];
            });

            if (!nextMessage.isMine) {
              void markRoomMessagesRead(payloadRoomId);
            }

            if (wasNearBottom || nextMessage.isMine) {
              shouldScrollToBottomRef.current = true;
            }

            replaceMessage(nextMessage);
            return;
          }

          if (payload.eventType === "UPDATE" && payload.new) {
            replaceMessage(toMessageView(payload.new as ChatMessageRow));
            return;
          }

          if (payload.eventType === "DELETE" && payload.old && "id" in payload.old) {
            removeMessage(String(payload.old.id || ""));
            return;
          }

          scheduleMessagesRefresh(payloadRoomId);
          return;
        }

        if (payload.eventType === "INSERT" && payload.new) {
          const nextMessage = toMessageView(payload.new as ChatMessageRow);

          setRooms((prev) => {
            const roomIndex = prev.findIndex((room) => room.id === payloadRoomId);
            if (roomIndex === -1) {
              return prev;
            }

            const targetRoom = prev[roomIndex];
            const updatedRoom = {
              ...targetRoom,
              lastMessage: nextMessage.content || targetRoom.lastMessage,
              lastTime: formatRelativeTime(nextMessage.created_at),
              unreadCount: nextMessage.isMine ? targetRoom.unreadCount : targetRoom.unreadCount + 1,
            };

            return [updatedRoom, ...prev.slice(0, roomIndex), ...prev.slice(roomIndex + 1)];
          });
          return;
        }

        scheduleRoomsRefresh();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_rooms",
          filter: isMaster ? `master_profile_id=eq.${userId}` : `client_id=eq.${userId}`,
        },
        () => {
          scheduleRoomsRefresh();
        }
      )
      .subscribe();
 
    window.addEventListener("focus", handleFocus);

    return () => {
      if (refreshRoomsTimeoutRef.current) {
        window.clearTimeout(refreshRoomsTimeoutRef.current);
      }
      Object.values(refreshMessageTimeoutsRef.current).forEach((timer) => window.clearTimeout(timer));
      refreshMessageTimeoutsRef.current = {};
      window.removeEventListener("focus", handleFocus);
      void supabase.removeChannel(channel);
    };
  }, [isMaster, isNearBottom, markRoomMessagesRead, removeMessage, replaceMessage, scheduleMessagesRefresh, scheduleRoomsRefresh, toMessageView, userId]);

  const sendMessage = async (content: string, file?: File | null) => {
    if (!selectedRoomId) return;

    const trimmedContent = content.trim();
    if (!trimmedContent && !file) return;

    setIsSending(true);
    shouldScrollToBottomRef.current = true;
    void touchPresence();

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
    const result = (await response.json()) as { error?: string; data?: ChatMessageRow };

    if (!response.ok) {
      alert(result.error || "메시지 전송에 실패했습니다.");
      setIsSending(false);
      return;
    }

    setMessageInput("");
    if (result.data) {
      replaceMessage(toMessageView(result.data));
    } else {
      void refreshMessages(selectedRoomId);
    }
    void refreshRooms();
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
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        messageInput={messageInput}
        isSending={isSending}
        isUploading={isUploading}
        messageListRef={messageListRef}
        messagesEndRef={messagesEndRef}
        onInputChange={setMessageInput}
        onSend={() => void sendMessage(messageInput)}
        onFileClick={() => fileInputRef.current?.click()}
        onLoadOlderMessages={() => void loadOlderMessages()}

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
