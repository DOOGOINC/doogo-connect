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

const MESSAGE_PAGE_SIZE = 10;
const PRESENCE_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export function ChatSystem({
  userId,
  viewMode,
  initialRoomId = "",
}: {
  userId: string;
  viewMode: ViewMode;
  initialRoomId?: string;
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

  useEffect(() => {
    const bootstrapManufacturer = async () => {
      if (viewMode !== "manufacturer") return;

      const { data: manufacturer } = await supabase.from("manufacturers").select("id").eq("owner_id", userId).maybeSingle();
      setManufacturerId(manufacturer?.id ?? null);
    };

    void bootstrapManufacturer();
  }, [userId, viewMode]);

  const refreshRooms = useCallback(async () => {
    if (roomsRefreshInFlightRef.current) {
      pendingRoomsRefreshRef.current = true;
      return;
    }

    roomsRefreshInFlightRef.current = true;
    let effectiveManufacturerId = manufacturerId;

    try {
      if (viewMode === "manufacturer" && !effectiveManufacturerId) {
        const { data: manufacturer } = await supabase.from("manufacturers").select("id").eq("owner_id", userId).maybeSingle();
        effectiveManufacturerId = manufacturer?.id ?? null;

        if (effectiveManufacturerId) {
          setManufacturerId(effectiveManufacturerId);
        }
      }

      const roomQuery =
        viewMode === "manufacturer" && effectiveManufacturerId
          ? supabase
              .from("chat_rooms")
              .select("id, client_id, manufacturer_id, room_type, last_message, last_message_at")
              .eq("manufacturer_id", effectiveManufacturerId)
              .or("room_type.is.null,room_type.eq.manufacturer")
          : supabase
              .from("chat_rooms")
              .select("id, client_id, manufacturer_id, room_type, last_message, last_message_at")
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
          isOnline: isRecentlyOnline(resolvePresence(clientProfile?.id, clientProfile?.last_seen_at)),
          lastSeenLabel: getPresenceLabel(resolvePresence(clientProfile?.id, clientProfile?.last_seen_at)),
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
        isOnline: isRecentlyOnline(resolvePresence(ownerProfile?.id, ownerProfile?.last_seen_at)),
        lastSeenLabel: getPresenceLabel(resolvePresence(ownerProfile?.id, ownerProfile?.last_seen_at)),
      };
    });

      setRooms(nextRooms);
      setSelectedRoomId((prev) => {
        if (initialRoomId && nextRooms.some((room) => room.id === initialRoomId)) {
          return initialRoomId;
        }
        return nextRooms.some((room) => room.id === prev) ? prev : nextRooms[0]?.id || "";
      });
    } finally {
      roomsRefreshInFlightRef.current = false;

      if (pendingRoomsRefreshRef.current) {
        pendingRoomsRefreshRef.current = false;
        void refreshRooms();
      }
    }
  }, [initialRoomId, loadPresenceMap, manufacturerId, userId, viewMode]);

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
      console.error("Failed to load older messages:", error);
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
    } else {
      const timer = window.setTimeout(() => {
        setMessages([]);
        setHasOlderMessages(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [refreshMessages, selectedRoomId]);

  useEffect(() => {
    const handleFocus = () => {
      scheduleRoomsRefresh(0);
      if (selectedRoomIdRef.current) {
        scheduleMessagesRefresh(selectedRoomIdRef.current, 0);
      }
    };

    const channel = supabase
      .channel(`chat-system-${userId}-${viewMode}`)
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
          filter:
            viewMode === "manufacturer" && manufacturerId
              ? `manufacturer_id=eq.${manufacturerId}`
              : `client_id=eq.${userId}`,
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
  }, [isNearBottom, manufacturerId, markRoomMessagesRead, removeMessage, replaceMessage, scheduleMessagesRefresh, scheduleRoomsRefresh, toMessageView, userId, viewMode]);

  const sendMessage = async (payload: SendMessagePayload & { file?: File | null }) => {
    if (!selectedRoomId) return;

    const content = payload.content.trim();
    if (!content && !payload.file) return;

    setIsSending(true);
    shouldScrollToBottomRef.current = true;
    void touchPresence();

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
    const result = (await response.json()) as { error?: string; data?: ChatMessageRow };

    if (!response.ok) {
      alert(`메시지 전송 실패: ${result.error || "알 수 없는 오류"}`);
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
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        messageInput={messageInput}
        isSending={isSending}
        isUploading={isUploading}
        messageListRef={messageListRef}
        messagesEndRef={messagesEndRef}
        onInputChange={setMessageInput}
        onSend={() => void sendMessage({ content: messageInput })}
        onFileClick={() => fileInputRef.current?.click()}
        onLoadOlderMessages={() => void loadOlderMessages()}
      />
    </div>
  );
}
