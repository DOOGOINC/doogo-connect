import { fail, mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const admin = createServiceRoleClient();
    const body = (await request.json()) as { manufacturerId?: number };
    const manufacturerId = Number(body.manufacturerId);

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    if (!Number.isInteger(manufacturerId) || manufacturerId <= 0) {
      return fail("제조사 정보가 올바르지 않습니다.", 400);
    }

    const [{ data: profile, error: profileError }, { data: manufacturer, error: manufacturerError }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("manufacturers").select("id, owner_id").eq("id", manufacturerId).maybeSingle(),
    ]);

    if (profileError) {
      throw new Error(profileError.message);
    }
    if (manufacturerError) {
      throw new Error(manufacturerError.message);
    }
    if (!manufacturer) {
      return fail("제조사를 찾을 수 없습니다.", 404);
    }
    if (profile?.role === "master" || profile?.role === "manufacturer") {
      return fail("의뢰자 계정만 제조사와 채팅을 시작할 수 있습니다.", 403);
    }
    if (manufacturer.owner_id === user.id) {
      return fail("본인 제조사와는 채팅을 시작할 수 없습니다.", 400);
    }

    const { data: existingRoom, error: existingRoomError } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("client_id", user.id)
      .eq("manufacturer_id", manufacturerId)
      .or("room_type.is.null,room_type.eq.manufacturer")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRoomError) {
      throw new Error(existingRoomError.message);
    }

    if (existingRoom?.id) {
      return ok({ roomId: existingRoom.id });
    }

    const now = new Date().toISOString();
    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .insert({
        client_id: user.id,
        manufacturer_id: manufacturerId,
        room_type: "manufacturer",
        approval_status: "approved",
        last_message: null,
        last_message_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (roomError) {
      throw new Error(roomError.message);
    }

    return ok({ roomId: room.id });
  } catch (error) {
    return mapRouteError(error);
  }
}
