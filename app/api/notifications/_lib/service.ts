import type { NotificationPayload } from "./types";
import { buildChatNotifications } from "./chat";
import { buildTradeNotifications } from "./trade";
import { getReadKeySet, type NotificationSupabase } from "./utils";

export async function buildNotifications(
  supabase: NotificationSupabase,
  userId: string,
  role: string
): Promise<NotificationPayload> {
  const readKeys = await getReadKeySet(supabase, userId);
  const [tradeNotifications, chatNotifications] = await Promise.all([
    buildTradeNotifications(supabase, userId, role, readKeys),
    buildChatNotifications(supabase, userId, role, readKeys),
  ]);

  const notifications = [...tradeNotifications, ...chatNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    trade: tradeNotifications,
    chat: chatNotifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
  };
}
