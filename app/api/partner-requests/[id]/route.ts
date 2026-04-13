import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { status } = await request.json();
    const { supabase } = await requireMasterUser(request);

    if (!["pending", "reviewing", "approved", "rejected"].includes(status)) {
      throw new Error("허용되지 않은 상태입니다.");
    }

    const { error } = await supabase.from("partner_requests").update({ status }).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
