import { mapRouteError, ok } from "@/lib/server/http";
import { getPopupSettings } from "@/lib/server/popup-settings";
import { requireRoleUser } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireRoleUser(["member"], request);
    const settings = await getPopupSettings(supabase, { allowMissingTable: true });

    return ok({
      success: true,
      settings: settings.enabled ? settings : { ...settings, enabled: false },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
