import type { RfqRequestStatus } from "@/lib/rfq";

export type NotificationCategory = "trade" | "chat";

export type NotificationItem = {
  key: string;
  category: NotificationCategory;
  title: string;
  message: string;
  linkUrl: string | null;
  createdAt: string;
  isRead: boolean;
  avatarInitial?: string | null;
};

export type NotificationPayload = {
  trade: NotificationItem[];
  chat: NotificationItem[];
  unreadCount: number;
};

export type ReadRow = {
  notification_key: string;
};

export type TradeRow = {
  id: string;
  product_name: string | null;
  status: RfqRequestStatus;
  updated_at: string;
  created_at: string;
  manufacturer_settlement_requested_at?: string | null;
  is_settled?: boolean | null;
  settled_at?: string | null;
  client_id?: string;
};

export type ChatRoomRow = {
  id: string;
  client_id: string;
  manufacturer_id: number | null;
  master_profile_id?: string | null;
  room_type: "manufacturer" | "support" | null;
};

export type ChatMessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  message_type: string | null;
  file_name: string | null;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type ReferralMemberRow = {
  id: string;
  full_name: string | null;
  created_at: string | null;
};
