import { fail, mapRouteError, ok } from "@/lib/server/http";
import { requireServerUser } from "@/lib/server/supabase";
import { getPresenceStatuses, isUpstashConfigured } from "@/lib/server/upstash";

export async function POST(request: Request) {
  try {
    await requireServerUser(request);
    const body = (await request.json()) as { userIds?: string[] };
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((value): value is string => typeof value === "string") : [];

    if (userIds.length > 100) {
      return fail("Too many users requested.", 400);
    }

    if (!isUpstashConfigured()) {
      return ok({ success: false, configured: false, presence: {} });
    }

    const presence = await getPresenceStatuses(userIds);
    return ok({ success: true, configured: true, presence });
  } catch (error) {
    return mapRouteError(error);
  }
}
