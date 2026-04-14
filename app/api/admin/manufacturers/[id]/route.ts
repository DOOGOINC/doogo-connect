import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const { supabase } = await requireMasterUser(request);
    const manufacturerId = Number(id);

    const { data: currentManufacturer, error: currentError } = await supabase
      .from("manufacturers")
      .select("owner_id")
      .eq("id", manufacturerId)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (currentManufacturer?.owner_id && payload.owner_id !== currentManufacturer.owner_id) {
      throw new Error("한번 연결한 제조사는 변경할 수 없습니다.");
    }

    const { error } = await supabase.from("manufacturers").update(payload).eq("id", manufacturerId);
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
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
