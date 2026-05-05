import { getOwnedManufacturerId } from "@/lib/server/supabase";
import type { ChatMessageRow, ChatRoomRow, NotificationItem, ProfileRow } from "./types";
import { getAvatarInitial, getCutoffIso, getDisplayName, MAX_NOTIFICATIONS, type NotificationSupabase } from "./utils";

export async function buildChatNotifications(supabase: NotificationSupabase, userId: string, role: string, readKeys: Set<string>) {
  let rooms: ChatRoomRow[] = [];
  let roomsErrorMessage: string | null = null;

  if (role === "manufacturer") {
    const ownedManufacturer = await getOwnedManufacturerId(supabase, userId);
    if (!ownedManufacturer.id) {
      return [] as NotificationItem[];
    }

    const { data, error } = await supabase
      .from("chat_rooms")
      .select("id, client_id, manufacturer_id, room_type, master_profile_id")
      .eq("manufacturer_id", ownedManufacturer.id)
      .or("room_type.is.null,room_type.eq.manufacturer")
      .order("updated_at", { ascending: false });

    rooms = (data as ChatRoomRow[] | null) || [];
    roomsErrorMessage = error?.message || null;
  } else if (role === "master") {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("id, client_id, manufacturer_id, room_type, master_profile_id")
      .eq("room_type", "support")
      .eq("master_profile_id", userId)
      .order("updated_at", { ascending: false });

    rooms = (data as ChatRoomRow[] | null) || [];
    roomsErrorMessage = error?.message || null;
  } else {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("id, client_id, manufacturer_id, room_type, master_profile_id")
      .eq("client_id", userId)
      .order("updated_at", { ascending: false });

    rooms = (data as ChatRoomRow[] | null) || [];
    roomsErrorMessage = error?.message || null;
  }

  if (roomsErrorMessage) {
    return [] as NotificationItem[];
  }

  const chatRooms = rooms.filter((room) => room.id);
  const roomIds = chatRooms.map((room) => room.id);

  if (roomIds.length === 0) {
    return [] as NotificationItem[];
  }

  const cutoffIso = getCutoffIso();
  const { data: unreadMessages, error: unreadError } = await supabase
    .from("chat_messages")
    .select("id, room_id, sender_id, content, created_at, message_type, file_name")
    .in("room_id", roomIds)
    .neq("sender_id", userId)
    .eq("is_read", false)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(MAX_NOTIFICATIONS * 3);

  if (unreadError) {
    return [] as NotificationItem[];
  }

  const latestByRoom = new Map<string, ChatMessageRow>();
  for (const message of (unreadMessages as ChatMessageRow[] | null) || []) {
    if (!latestByRoom.has(message.room_id)) {
      latestByRoom.set(message.room_id, message);
    }
  }

  const senderIds = Array.from(new Set(Array.from(latestByRoom.values()).map((message) => message.sender_id).filter(Boolean)));
  const { data: senderProfiles } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", senderIds)
    : { data: [] };
  const senderProfileMap = new Map((((senderProfiles as ProfileRow[] | null) || []) as ProfileRow[]).map((profile) => [profile.id, profile]));

  return Array.from(latestByRoom.values())
    .slice(0, MAX_NOTIFICATIONS)
    .map((message) => {
      const room = chatRooms.find((item) => item.id === message.room_id);
      const key = `chat:${message.id}`;
      const senderName = getDisplayName(senderProfileMap.get(message.sender_id), "상대방");
      const notificationText =
        message.message_type === "file"
          ? `${senderName}님께서 보낸 파일이 도착했습니다.`
          : `${senderName}님께서 보낸 메세지가 도착했습니다.`;

      return {
        key,
        category: "chat" as const,
        title: "채팅 알림",
        message: notificationText,
        linkUrl:
          room?.room_type === "support"
            ? role === "master"
              ? "/master?tab=support"
              : `/my-connect?tab=support&roomId=${encodeURIComponent(message.room_id)}`
            : `/my-connect?tab=chat&roomId=${encodeURIComponent(message.room_id)}`,
        createdAt: message.created_at,
        isRead: readKeys.has(key),
        avatarInitial: getAvatarInitial(senderName),
      };
    });
}
