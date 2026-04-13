import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { fullName, email, phoneNumber } = await request.json();
    const { user } = await requireServerUser(request);
    const adminClient = createServiceRoleClient();

    if (!adminClient) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for profile sync.");
    }

    const metadataRole = user.user_metadata?.role;
    const safeRole =
      metadataRole === "master" || metadataRole === "manufacturer" || metadataRole === "member" ? metadataRole : undefined;

    const payload = {
      id: user.id,
      full_name: typeof fullName === "string" ? fullName.trim() : null,
      email: typeof email === "string" ? email.trim() : user.email || null,
      phone_number: typeof phoneNumber === "string" ? phoneNumber.trim() : null,
      updated_at: new Date().toISOString(),
      ...(safeRole ? { role: safeRole } : {}),
    };

    const { error } = await adminClient.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
