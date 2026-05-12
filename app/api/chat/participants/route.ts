import { fail, mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

type ChatParticipantProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  last_seen_at: string | null;
  business_company_name: string | null;
  business_owner_name: string | null;
};

type RequestContactRow = {
  client_id: string;
  manufacturer_id: number;
  contact_name: string | null;
  updated_at: string | null;
};

export async function POST(request: Request) {
  try {
    const { supabase } = await requireServerUser(request);
    const admin = createServiceRoleClient();
    const body = (await request.json()) as { roomIds?: string[] };
    const roomIds = Array.from(new Set((body.roomIds || []).map((value) => String(value || "").trim()).filter(Boolean)));

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    if (!roomIds.length) {
      return ok({ profiles: [], requestContacts: [] });
    }

    const { data: visibleRooms, error: visibleRoomsError } = await supabase
      .from("chat_rooms")
      .select("id, client_id, manufacturer_id")
      .in("id", roomIds)
      .or("room_type.is.null,room_type.eq.manufacturer");

    if (visibleRoomsError) {
      throw new Error(visibleRoomsError.message);
    }

    const roomRows =
      (((visibleRooms as Array<{ id: string; client_id: string; manufacturer_id: number | null }> | null) || []) as Array<{
        id: string;
        client_id: string;
        manufacturer_id: number | null;
      }>) || [];

    if (!roomRows.length) {
      return fail("접근 가능한 채팅방이 없습니다.", 403);
    }

    const clientIds = Array.from(new Set(roomRows.map((room) => room.client_id).filter(Boolean)));
    const manufacturerIds = Array.from(
      new Set(roomRows.map((room) => room.manufacturer_id).filter((value): value is number => typeof value === "number"))
    );

    const { data: manufacturers, error: manufacturersError } = manufacturerIds.length
      ? await admin.from("manufacturers").select("id, owner_id").in("id", manufacturerIds)
      : { data: [], error: null };

    if (manufacturersError) {
      throw new Error(manufacturersError.message);
    }

    const ownerIds = ((((manufacturers as Array<{ id: number; owner_id: string | null }> | null) || []) as Array<{
      id: number;
      owner_id: string | null;
    }>) || [])
      .map((manufacturer) => manufacturer.owner_id)
      .filter((value): value is string => Boolean(value));

    const profileIds = Array.from(new Set([...clientIds, ...ownerIds]));

    const [{ data: profiles, error: profilesError }, { data: requestContacts, error: requestContactsError }] = await Promise.all([
      profileIds.length
        ? admin
            .from("profiles")
            .select("id, full_name, email, last_seen_at, business_company_name, business_owner_name")
            .in("id", profileIds)
        : Promise.resolve({ data: [], error: null }),
      manufacturerIds.length && clientIds.length
        ? admin
            .from("rfq_requests")
            .select("client_id, manufacturer_id, contact_name, updated_at")
            .in("manufacturer_id", manufacturerIds)
            .in("client_id", clientIds)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesError) {
      throw new Error(profilesError.message);
    }
    if (requestContactsError) {
      throw new Error(requestContactsError.message);
    }

    return ok({
      profiles: ((profiles as ChatParticipantProfile[] | null) || []) as ChatParticipantProfile[],
      requestContacts: ((requestContacts as RequestContactRow[] | null) || []) as RequestContactRow[],
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
