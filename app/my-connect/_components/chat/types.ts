export type ViewMode = "client" | "manufacturer";

export type ChatRoomRow = {
  id: string;
  client_id: string;
  manufacturer_id: number;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: string | null;
  is_read: boolean | null;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  last_seen_at: string | null;
};

export type ManufacturerRow = {
  id: number;
  name: string;
  owner_id: string | null;
  image: string | null;
  logo: string | null;
};

export type ChatRoomView = {
  id: string;
  counterpartName: string;
  counterpartSubtitle: string;
  avatar: string;
  unreadCount: number;
  lastMessage: string;
  lastTime: string;
  isOnline: boolean;
  lastSeenLabel: string;
};

export type ChatMessageView = ChatMessageRow & {
  isMine: boolean;
  timeLabel: string;
};
