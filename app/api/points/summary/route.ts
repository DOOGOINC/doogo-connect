import { mapRouteError, ok } from "@/lib/server/http";
import { getPointSummary } from "@/lib/server/points";
import { requireServerUser } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireServerUser(request);
    const summary = await getPointSummary(supabase, user.id);
    return ok({ success: true, ...summary });
  } catch (error) {
    return mapRouteError(error);
  }
}
