import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const { supabase } = await requireMasterUser(request);

    const { error } = await supabase.from("manufacturers").update(payload).eq("id", Number(id));
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { supabase } = await requireMasterUser(request);

    const { error } = await supabase.from("manufacturers").delete().eq("id", Number(id));
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
