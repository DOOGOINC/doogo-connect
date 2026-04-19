"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { buildStorageObjectUrl, CHAT_FILE_BUCKET } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { ChatMessagePanel } from "./chat/ChatMessagePanel";
import { CHAT_FILE_ACCEPT, getChatFileValidationMessage, isAllowedChatFile } from "./chat/fileConstraints";
import { ChatRoomSidebar } from "./chat/ChatRoomSidebar";
import type {
  ChatMessageRow,
  ChatMessageView,
  ChatRoomRow,
  ChatRoomView,
  ManufacturerRow,
  ProfileRow,
  ViewMode,
} from "./chat/types";
import { formatMessageTime, formatRelativeTime, getAvatarInitial, getPresenceLabel, getProfileDisplayName, isRecentlyOnline } from "./chat/utils";

type SendMessagePayload = {
  content: string;
  file?: File | null;
};

export function ChatSystem({
  userId,
  viewMode,
}: {
  userId: string;
  viewMode: ViewMode;
}) {
  const [rooms, setRooms] = useState<ChatRoomView[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState<"all" | "unread" | "active">("all");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);

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

  useEffect(() => {
    const bootstrapManufacturer = async () => {
      if (viewMode !== "manufacturer") return;

      const { data: manufacturer } = await supabase.from("manufacturers").select("id").eq("owner_id", userId).maybeSingle();
      setManufacturerId(manufacturer?.id ?? null);
    };

    void bootstrapManufacturer();
  }, [userId, viewMode]);

  const refreshRooms = useCallback(async () => {
    let effectiveManufacturerId = manufacturerId;

    if (viewMode === "manufacturer" && !effectiveManufacturerId) {
      const { data: manufacturer } = await supabase.from("manufacturers").select("id").eq("owner_id", userId).maybeSingle();
      effectiveManufacturerId = manufacturer?.id ?? null;

      if (effectiveManufacturerId) {
        setManufacturerId(effectiveManufacturerId);
      }
    }

    const syncResponse = await authFetch("/api/chat/rooms/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ viewMode }),
    });

    if (!syncResponse.ok) {
      console.error("Failed to sync chat rooms");
    }

    const roomQuery =
      viewMode === "manufacturer" && effectiveManufacturerId
        ? supabase
            .from("chat_rooms")
            .select("*")
            .eq("manufacturer_id", effectiveManufacturerId)
            .or("room_type.is.null,room_type.eq.manufacturer")
        : supabase
            .from("chat_rooms")
            .select("*")
            .eq("client_id", userId)
            .or("room_type.is.null,room_type.eq.manufacturer");

    const { data: roomRows, error: roomError } = await roomQuery.order("updated_at", { ascending: false });
    if (roomError) {
      console.error("Failed to load chat rooms:", roomError.message);
      return;
    }

    const roomsData = ((roomRows as ChatRoomRow[] | null) || []).filter(
      (room): room is ChatRoomRow => Boolean(room) && (!room.room_type || room.room_type === "manufacturer")
    );
    if (!roomsData.length) {
      setRooms([]);
      setSelectedRoomId("");
      return;
    }

    const clientIds = Array.from(new Set(roomsData.map((room) => room.client_id)));
    const manufacturerIds = Array.from(
      new Set(roomsData.map((room) => room.manufacturer_id).filter((id): id is number => typeof id === "number"))
    );

    const { data: manufacturers } = await supabase.from("manufacturers").select("id, name, owner_id, image, logo").in("id", manufacturerIds);

    const manufacturerRows = ((manufacturers as ManufacturerRow[] | null) || []).filter(Boolean);
    const manufacturerMap = new Map(manufacturerRows.map((manufacturer) => [manufacturer.id, manufacturer]));
    const ownerIds = manufacturerRows.map((manufacturer) => manufacturer.owner_id).filter((id): id is string => Boolean(id));
    const profileIds = Array.from(new Set([...clientIds, ...ownerIds]));

    const [{ data: profiles }, { data: unreadMessages }] = await Promise.all([
      profileIds.length
        ? supabase.from("profiles").select("id, full_name, email, last_seen_at").in("id", profileIds)
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
      if (viewMode === "manufacturer") {
        const clientProfile = profileMap.get(room.client_id);
        const counterpartName = getProfileDisplayName(clientProfile, "의뢰자");

        return {
          id: room.id,
          counterpartName,
          counterpartSubtitle: "의뢰자",
          avatar: `initial:${getAvatarInitial(counterpartName)}`,
          unreadCount: unreadMap.get(room.id) || 0,
          lastMessage: room.last_message || "상담이 시작되었습니다.",
          lastTime: room.last_message_at ? formatRelativeTime(room.last_message_at) : "",
          isOnline: isRecentlyOnline(clientProfile?.last_seen_at || null),
          lastSeenLabel: getPresenceLabel(clientProfile?.last_seen_at || null),
        };
      }

      const manufacturer = typeof room.manufacturer_id === "number" ? manufacturerMap.get(room.manufacturer_id) : undefined;
      const ownerProfile = manufacturer?.owner_id ? profileMap.get(manufacturer.owner_id) : null;

      return {
        id: room.id,
        counterpartName: manufacturer?.name || "제조사",
        counterpartSubtitle: "제조사",
        avatar: manufacturer?.logo || manufacturer?.image || `initial:${getAvatarInitial(manufacturer?.name || "제조사")}`,
        unreadCount: unreadMap.get(room.id) || 0,
        lastMessage: room.last_message || "상담이 시작되었습니다.",
        lastTime: room.last_message_at ? formatRelativeTime(room.last_message_at) : "",
        isOnline: isRecentlyOnline(ownerProfile?.last_seen_at || null),
        lastSeenLabel: getPresenceLabel(ownerProfile?.last_seen_at || null),
      };
    });

    setRooms(nextRooms);
    setSelectedRoomId((prev) => (nextRooms.some((room) => room.id === prev) ? prev : nextRooms[0]?.id || ""));
  }, [manufacturerId, userId, viewMode]);

  const refreshMessages = useCallback(
    async (roomId: string) => {
      const wasNearBottom = isNearBottom();
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, room_id, sender_id, content, message_type, is_read, created_at, file_url, file_name, file_size")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load messages:", error.message);
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
    } else {
      const timer = window.setTimeout(() => {
        setMessages([]);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [refreshMessages, selectedRoomId]);

  useEffect(() => {
    const refreshAll = () => {
      void refreshRooms();
      if (selectedRoomIdRef.current) {
        void refreshMessages(selectedRoomIdRef.current);
      }
    };

    const channel = supabase
      .channel(`chat-system-${userId}-${viewMode}`)
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
  }, [refreshMessages, refreshRooms, userId, viewMode]);

  const sendMessage = async (payload: SendMessagePayload & { file?: File | null }) => {
    if (!selectedRoomId) return;

    const content = payload.content.trim();
    if (!content && !payload.file) return;

    setIsSending(true);
    shouldScrollToBottomRef.current = true;

    const formData = new FormData();
    formData.append("roomId", selectedRoomId);
    formData.append("content", content);
    if (payload.file) {
      formData.append("file", payload.file);
    }

    const response = await authFetch("/api/chat/messages", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      alert(`메시지 전송 실패: ${result.error || "알 수 없는 오류"}`);
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
    await sendMessage({
      content: file.name,
      file,
    });
    setIsUploading(false);
  };

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
        onSend={() => void sendMessage({ content: messageInput })}
        onFileClick={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
