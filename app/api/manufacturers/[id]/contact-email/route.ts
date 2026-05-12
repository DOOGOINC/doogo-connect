import { NextResponse } from "next/server";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireServerUser(request);
    const { id } = await context.params;
    const manufacturerId = Number(id);

    if (!Number.isInteger(manufacturerId) || manufacturerId <= 0) {
      return NextResponse.json({ error: "INVALID_MANUFACTURER_ID" }, { status: 400 });
    }

    const { data: manufacturer, error: manufacturerError } = await supabase
      .from("manufacturers")
      .select("owner_id")
      .eq("id", manufacturerId)
      .maybeSingle();

    if (manufacturerError) {
      return NextResponse.json({ error: manufacturerError.message }, { status: 500 });
    }

    if (!manufacturer?.owner_id) {
      return NextResponse.json({ email: null });
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json({ email: null });
    }

    const { data: ownerProfile, error: ownerProfileError } = await admin
      .from("profiles")
      .select("email")
      .eq("id", manufacturer.owner_id)
      .maybeSingle();

    if (ownerProfileError) {
      return NextResponse.json({ error: ownerProfileError.message }, { status: 500 });
    }

    return NextResponse.json({ email: ownerProfile?.email?.trim() || null });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
