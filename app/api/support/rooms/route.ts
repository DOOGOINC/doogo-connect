import { fail, mapRouteError, ok } from "@/lib/server/http";
import { requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const body = (await request.json()) as { requestMessage?: string };
    const requestMessage = body.requestMessage?.trim() || "";

    if (!requestMessage) {
      return fail("상담 요청 내용을 입력해 주세요.");
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) {
      throw new Error(profileError.message);
    }

    if (profile?.role === "master") {
      return fail("마스터 계정은 고객센터 상담 요청을 생성할 수 없습니다.", 403);
    }

    const { data: existingRoom, error: existingRoomError } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("room_type", "support")
      .eq("client_id", user.id)
      .in("approval_status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRoomError) {
      throw new Error(existingRoomError.message);
    }

    if (existingRoom?.id) {
      return ok({ data: existingRoom });
    }

    const { data, error } = await supabase
      .from("chat_rooms")
      .insert({
        client_id: user.id,
        manufacturer_id: null,
        room_type: "support",
        approval_status: "pending",
        support_request_message: requestMessage,
        last_message: requestMessage,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return ok({ data });
  } catch (error) {
    return mapRouteError(error);
  }
}
