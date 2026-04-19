import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "all";
    const sortBy = url.searchParams.get("sortBy")?.trim() || "created_at";
    const sortOrder = url.searchParams.get("sortOrder")?.trim() === "asc";

    let query = supabase.from("support_inquiries").select("*");

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error } = await query.order(sortBy, { ascending: sortOrder });
    if (error) {
      throw new Error(error.message);
    }

    return ok({ inquiries: data || [] });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const body = await request.json();
    const inquiryId = typeof body.id === "string" ? body.id : "";
    const status = typeof body.status === "string" ? body.status : "";

    if (!inquiryId) {
      throw new Error("문의 ID가 필요합니다.");
    }

    if (status !== "pending" && status !== "resolved") {
      throw new Error("허용되지 않은 상태입니다.");
    }

    const { error } = await supabase
      .from("support_inquiries")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", inquiryId);

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
