import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildDisputeNumber() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const suffix = `${now.getTime()}`.slice(-5);
  return `DSP-${year}${month}-${suffix}`;
}

const DISPUTE_ELIGIBLE_STATUSES = new Set([
  "payment_completed",
  "production_waiting",
  "production_started",
  "ordered",
  "production_in_progress",
  "manufacturing_completed",
  "completed",
  "delivery_completed",
]);

export async function GET(request: Request) {
  try {
    const { supabase: userSupabase, user } = await requireServerUser(request);
    const supabase = createServiceRoleClient();
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope")?.trim() || "client";

    if (!supabase) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    let query = supabase
      .from("master_disputes")
      .select("id, dispute_number, applicant_name, counterparty_name, reason, amount, currency_code, status, created_at, detail, request_id")
      .order("created_at", { ascending: false });

    if (scope === "manufacturer") {
      const { data: manufacturer, error: manufacturerError } = await userSupabase
        .from("manufacturers")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (manufacturerError) {
        throw new Error(manufacturerError.message);
      }
      if (!manufacturer?.id) {
        return ok({ disputes: [] });
      }

      const { data: ownedRequests, error: ownedRequestError } = await userSupabase
        .from("rfq_requests")
        .select("id")
        .eq("manufacturer_id", manufacturer.id);
      if (ownedRequestError) {
        throw new Error(ownedRequestError.message);
      }
      const requestIds = (ownedRequests || []).map((row) => row.id);
      if (!requestIds.length) {
        return ok({ disputes: [] });
      }
      query = query.in("request_id", requestIds);
    } else {
      query = query.eq("applicant_id", user.id);
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

export async function POST(request: Request) {
  try {
    const { supabase: userSupabase, user } = await requireServerUser(request);
    const serviceSupabase = createServiceRoleClient();

    if (!serviceSupabase) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const body = await request.json();
    const requestId = trimText(body.requestId);
    const reason = trimText(body.reason);
    const detail = trimText(body.detail);

    if (!requestId) {
      throw new Error("관련 거래를 선택해 주세요.");
    }

    if (!reason) {
      throw new Error("분쟁 사유를 입력해 주세요.");
    }

    if (!detail) {
      throw new Error("상세 내용을 입력해 주세요.");
    }

    const [{ data: profile }, { data: rfqRequest, error: requestError }] = await Promise.all([
      userSupabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
      requestId
        ? userSupabase
          .from("rfq_requests")
          .select("id, client_id, manufacturer_name, total_price, currency_code, status")
          .eq("id", requestId)
          .eq("client_id", user.id)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (requestError) {
      throw new Error(requestError.message);
    }

    if (requestId && !rfqRequest) {
      throw new Error("선택한 거래를 찾을 수 없습니다.");
    }

    const requestStatus = (rfqRequest as { status?: string | null } | null)?.status || "";
    if (!DISPUTE_ELIGIBLE_STATUSES.has(requestStatus)) {
      throw new Error("결제 완료된 거래만 분쟁 신청할 수 있습니다.");
    }

    const applicantName =
      (profile as { full_name?: string | null; email?: string | null } | null)?.full_name?.trim() ||
      (profile as { email?: string | null } | null)?.email?.trim() ||
      user.email ||
      "의뢰자";

    const { data, error } = await serviceSupabase
      .from("master_disputes")
      .insert({
        dispute_number: buildDisputeNumber(),
        applicant_id: user.id,
        request_id: requestId || null,
        applicant_name: applicantName,
        counterparty_name: (rfqRequest as { manufacturer_name?: string | null } | null)?.manufacturer_name || "두고커넥트",
        reason,
        detail,
        amount: Number((rfqRequest as { total_price?: number | string | null } | null)?.total_price || 0),
        currency_code: (rfqRequest as { currency_code?: string | null } | null)?.currency_code || "KRW",
        status: "new",
      })
      .select("id, dispute_number, applicant_name, counterparty_name, reason, amount, currency_code, status, created_at, detail, request_id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true, dispute: data });
  } catch (error) {
    return mapRouteError(error);
  }
}
