import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    await requireServerUser(request);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 2), 1), 10);
    const supabase = createServiceRoleClient();

    if (!supabase) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const { data, error } = await supabase
      .from("admin_notices")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return ok({ notices: data || [] });
  } catch (error) {
    return mapRouteError(error);
  }
}
