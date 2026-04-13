import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

function trimOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, supabase } = await requireServerUser(request);
    const adminClient = createServiceRoleClient();
    const profileClient = adminClient ?? supabase;

    const metadataRole = user.user_metadata?.role;
    const safeRole =
      metadataRole === "master" || metadataRole === "manufacturer" || metadataRole === "member" ? metadataRole : undefined;

    const fullName = trimOrNull(body.fullName);
    const email = trimOrNull(body.email) || user.email || null;
    const phoneNumber = trimOrNull(body.phoneNumber);

    const { data: existingProfile, error: profileReadError } = await profileClient
      .from("profiles")
      .select("full_name, email, phone_number, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      throw new Error(profileReadError.message);
    }

    const payload = {
      id: user.id,
      full_name: fullName ?? existingProfile?.full_name ?? null,
      email: email ?? existingProfile?.email ?? null,
      phone_number: phoneNumber ?? existingProfile?.phone_number ?? null,
      role: safeRole ?? existingProfile?.role ?? "member",
      updated_at: new Date().toISOString(),
    };

    const { error } = await profileClient.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true, profile: payload });
  } catch (error) {
    return mapRouteError(error);
  }
}
