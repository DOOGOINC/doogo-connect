import { mapRouteError, ok } from "@/lib/server/http";
import { requireServerUser } from "@/lib/server/supabase";
import { isUpstashConfigured, setPresenceHeartbeat } from "@/lib/server/upstash";

export async function POST(request: Request) {
  try {
    const { user } = await requireServerUser(request);

    if (!isUpstashConfigured()) {
      return ok({ success: false, configured: false });
    }

    await setPresenceHeartbeat(user.id);
    return ok({ success: true, configured: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
