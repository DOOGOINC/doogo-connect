import { createServiceRoleClient, getOwnedManufacturerId } from "@/lib/server/supabase";
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

  const latestRooms = Array.from(latestByRoom.values())
    .map((message) => chatRooms.find((room) => room.id === message.room_id))
    .filter((room): room is ChatRoomRow => Boolean(room));
  const senderIds = Array.from(new Set(Array.from(latestByRoom.values()).map((message) => message.sender_id).filter(Boolean)));
  const clientIds = Array.from(new Set(latestRooms.map((room) => room.client_id).filter(Boolean)));
  const manufacturerIds = Array.from(
    new Set(latestRooms.map((room) => room.manufacturer_id).filter((value): value is number => typeof value === "number"))
  );

  const admin = createServiceRoleClient();
  const dataClient = admin || supabase;

  const [{ data: senderProfiles }, { data: requestContacts }, { data: manufacturers }] = await Promise.all([
    senderIds.length
      ? dataClient.from("profiles").select("id, full_name, email, business_company_name, business_owner_name").in("id", senderIds)
      : Promise.resolve({ data: [] }),
    manufacturerIds.length && clientIds.length
      ? dataClient
        .from("rfq_requests")
        .select("client_id, manufacturer_id, contact_name, updated_at")
        .in("manufacturer_id", manufacturerIds)
        .in("client_id", clientIds)
        .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    manufacturerIds.length
      ? dataClient.from("manufacturers").select("id, name").in("id", manufacturerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const senderProfileMap = new Map((((senderProfiles as ProfileRow[] | null) || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const manufacturerNameMap = new Map(
    ((((manufacturers as Array<{ id: number; name: string | null }> | null) || []) as Array<{ id: number; name: string | null }>) || [])
      .map((manufacturer) => [manufacturer.id, manufacturer.name?.trim() || ""])
      .filter((entry): entry is [number, string] => Boolean(entry[1]))
  );
  const requestContactMap = new Map<string, string>();

  (((requestContacts as Array<{ client_id: string; manufacturer_id: number; contact_name: string | null }> | null) || []) as Array<{
    client_id: string;
    manufacturer_id: number;
    contact_name: string | null;
  }>).forEach((row) => {
    const contactName = row.contact_name?.trim();
    const key = `${row.client_id}:${row.manufacturer_id}`;
    if (contactName && !requestContactMap.has(key)) {
      requestContactMap.set(key, contactName);
    }
  });

  return Array.from(latestByRoom.values())
    .slice(0, MAX_NOTIFICATIONS)
    .map((message) => {
      const room = chatRooms.find((item) => item.id === message.room_id);
      const key = `chat:${message.id}`;
      const senderFallback =
        room && room.room_type !== "support" && typeof room.manufacturer_id === "number"
          ? room.client_id === message.sender_id
            ? requestContactMap.get(`${room.client_id}:${room.manufacturer_id}`) || "상대방"
            : manufacturerNameMap.get(room.manufacturer_id) || "상대방"
          : "상대방";
      const senderName = getDisplayName(senderProfileMap.get(message.sender_id), senderFallback);
      const notificationText =
        message.message_type === "file"
          ? `${senderName}님께서 보낸 파일이 도착했습니다.`
          : `${senderName}님께서 보낸 메세지가 도착했습니다.`;

      return {
        key,
        category: "chat" as const,
        title: "[DOOGO CONNECT - 채팅 알림]",
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
