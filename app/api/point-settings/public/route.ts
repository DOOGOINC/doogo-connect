import { mapRouteError, ok } from "@/lib/server/http";
import { ensurePointSettings } from "@/lib/server/points";
import { createServiceRoleClient } from "@/lib/server/supabase";

export async function GET() {
  try {
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const settings = await ensurePointSettings(admin);

    return ok({
      refereeRewardPoints: settings.refereeRewardPoints,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
