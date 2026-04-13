import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { supabase } = await requireMasterUser(request);

    const { error } = await supabase.from("manufacturers").insert([payload]);
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
