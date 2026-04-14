import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function POST(request: Request, context: Params) {
  try {
    const { roomId } = await context.params;
    const { supabase, user } = await requireMasterUser(request);

    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("id, room_type, approval_status, master_profile_id")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError || !room) {
      throw new Error("고객센터 채팅방을 찾을 수 없습니다.");
    }

    if (room.room_type !== "support") {
      throw new Error("고객센터 대화만 종료할 수 있습니다.");
    }

    if (room.master_profile_id && room.master_profile_id !== user.id) {
      throw new Error("이 대화는 다른 마스터가 담당 중입니다.");
    }

    const { error: updateError } = await supabase
      .from("chat_rooms")
      .update({
        approval_status: "closed",
        master_profile_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
