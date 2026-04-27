import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

const ALLOWED_STATUSES = ["new", "in_progress", "resolved", "disputing", "refunded"] as const;

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "all";
    const start = url.searchParams.get("start")?.trim() || "";
    const end = url.searchParams.get("end")?.trim() || "";

    let query = supabase
      .from("master_disputes")
      .select("id, dispute_number, applicant_name, counterparty_name, reason, amount, currency_code, status, created_at, detail, request_id")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
        throw new Error("허용되지 않은 상태입니다.");
      }
      query = query.eq("status", status);
    }

    if (start) {
      query = query.gte("created_at", start);
    }

    if (end) {
      query = query.lte("created_at", end);
    }

    if (search) {
      query = query.or(
        `dispute_number.ilike.%${search}%,applicant_name.ilike.%${search}%,counterparty_name.ilike.%${search}%,reason.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return ok({ disputes: data || [] });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const body = await request.json();
    const disputeId = typeof body.id === "string" ? body.id.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";

    if (!disputeId) {
      throw new Error("분쟁 ID가 필요합니다.");
    }

    if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      throw new Error("허용되지 않은 상태입니다.");
    }

    const { data, error } = await supabase
      .from("master_disputes")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true, dispute: data });
  } catch (error) {
    return mapRouteError(error);
  }
}
