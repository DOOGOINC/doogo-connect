import { mapRouteError, ok } from "@/lib/server/http";
import { getProfileRole, requireServerUser } from "@/lib/server/supabase";
import { buildNotifications } from "./_lib/service";
import type { NotificationCategory } from "./_lib/types";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const role = await getProfileRole(supabase, user.id);
    const mode = new URL(request.url).searchParams.get("mode");
    const payload = await buildNotifications(supabase, user.id, role);

    if (mode === "summary") {
      return ok({ unreadCount: payload.unreadCount });
    }

    return ok(payload);
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const role = await getProfileRole(supabase, user.id);
    const body = (await request.json()) as {
      category?: NotificationCategory;
      keys?: string[];
      markAll?: boolean;
    };

    let keys = Array.isArray(body.keys) ? body.keys.filter(Boolean) : [];

    if (body.markAll) {
      const payload = await buildNotifications(supabase, user.id, role);
      const target =
        body.category === "trade"
          ? payload.trade
          : body.category === "chat"
            ? payload.chat
            : [...payload.trade, ...payload.chat];
      keys = target.filter((item) => !item.isRead).map((item) => item.key);
    }

    if (keys.length === 0) {
      return ok({ success: true });
    }

    const rows = keys.map((key) => ({
      user_id: user.id,
      notification_key: key,
      category: key.startsWith("trade:") ? "trade" : "chat",
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("user_notification_reads").upsert(rows, {
      onConflict: "user_id,notification_key",
    });

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
