import { mapRouteError, ok } from "@/lib/server/http";
import { getOwnedManufacturerId, requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { viewMode } = await request.json();
    const { supabase, user } = await requireServerUser(request);
    const ownedManufacturer = await getOwnedManufacturerId(supabase, user.id);

    const rfqQuery =
      viewMode === "manufacturer" && ownedManufacturer.id
        ? supabase.from("rfq_requests").select("client_id, manufacturer_id").eq("manufacturer_id", ownedManufacturer.id)
        : supabase.from("rfq_requests").select("client_id, manufacturer_id").eq("client_id", user.id);

    const { data, error } = await rfqQuery;
    if (error) {
      throw new Error(error.message);
    }

    const manufacturerIds = Array.from(new Set(((data || []).map((row) => row.manufacturer_id).filter(Boolean) as number[])));
    const { data: manufacturers, error: manufacturerError } = manufacturerIds.length
      ? await supabase.from("manufacturers").select("id, owner_id").in("id", manufacturerIds)
      : { data: [], error: null };

    if (manufacturerError) {
      throw new Error(manufacturerError.message);
    }

    const ownerMap = new Map((manufacturers || []).map((row) => [row.id, row.owner_id]));
    const roomPairs = new Map<string, { client_id: string; manufacturer_id: number }>();
    (data || []).forEach((row) => {
      if (!row.client_id || !row.manufacturer_id) return;
      if (ownerMap.get(row.manufacturer_id) === row.client_id) return;

      roomPairs.set(`${row.client_id}-${row.manufacturer_id}`, {
        client_id: row.client_id,
        manufacturer_id: row.manufacturer_id,
      });
    });

    if (roomPairs.size) {
      const { error: upsertError } = await supabase.from("chat_rooms").upsert(Array.from(roomPairs.values()), {
        onConflict: "client_id,manufacturer_id",
        ignoreDuplicates: true,
      });

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
