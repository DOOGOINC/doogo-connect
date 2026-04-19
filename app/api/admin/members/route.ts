import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

type SortField = "full_name" | "email" | "role" | "created_at" | "updated_at";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || "10")));
    const search = url.searchParams.get("search")?.trim() || "";
    const roleFilter = url.searchParams.get("roleFilter")?.trim() || "all";
    const sortByParam = url.searchParams.get("sortBy")?.trim() || "updated_at";
    const sortOrder = url.searchParams.get("sortOrder")?.trim() === "asc" ? "asc" : "desc";
    const sortBy = (["full_name", "email", "role", "created_at", "updated_at"].includes(sortByParam)
      ? sortByParam
      : "updated_at") as SortField;

    let query = supabase
      .from("profiles")
      .select("id, email, full_name, phone_number, business_registration_number, business_attachment_url, business_attachment_name, role, created_at, updated_at, is_kakao, auth_provider", { count: "exact" });

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      members: data || [],
      totalCount: count || 0,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.replace(/\D/g, "").slice(0, 11) : "";

    if (!userId) {
      throw new Error("User ID is required.");
    }

    if (!fullName) {
      throw new Error("Name is required.");
    }

    if (!phoneNumber) {
      throw new Error("Phone number is required.");
    }

    const { data: member, error: memberError } = await supabase.from("profiles").select("id, is_kakao").eq("id", userId).maybeSingle();
    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!member) {
      throw new Error("User not found.");
    }

    if (member.is_kakao) {
      throw new Error("Kakao accounts cannot be edited from master member management.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      success: true,
      member: {
        userId,
        full_name: fullName,
        phone_number: phoneNumber,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
