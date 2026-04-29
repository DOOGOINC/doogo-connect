import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, getOwnedManufacturerId, requireRoleUser } from "@/lib/server/supabase";

type PatchBody = {
  year?: number;
  month?: number;
};

type RequestRow = {
  id: string;
  updated_at: string | null;
  is_settled: boolean | null;
};

type FeeSettlementRequestRow = {
  rfq_request_id: string;
  requested_at: string;
};

type MonthClosureRow = {
  settlement_year: number;
  settlement_month: number;
  closed_at: string;
};

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getMonthKeyFromDate(value: string) {
  const date = new Date(value);
  return getMonthKey(date.getFullYear(), date.getMonth() + 1);
}

function addOneMonthKey(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return getMonthKey(date.getFullYear(), date.getMonth() + 1);
}

function getEffectiveMonthKey(updatedAt: string, closureMap: Map<string, string>) {
  const baseMonthKey = getMonthKeyFromDate(updatedAt);
  const closedAt = closureMap.get(baseMonthKey);
  if (!closedAt) {
    return baseMonthKey;
  }

  return new Date(updatedAt).getTime() > new Date(closedAt).getTime() ? addOneMonthKey(baseMonthKey) : baseMonthKey;
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireRoleUser(["manufacturer"], request);
    const admin = createServiceRoleClient() ?? supabase;
    const { id: manufacturerId } = await getOwnedManufacturerId(supabase, user.id);

    if (!manufacturerId) {
      throw new Error("제조사 계정을 찾을 수 없습니다.");
    }

    const [requestResult, closureResult] = await Promise.all([
      admin
        .from("manufacturer_fee_settlement_requests")
        .select("rfq_request_id, requested_at")
        .eq("manufacturer_id", manufacturerId),
      admin
        .from("manufacturer_fee_settlement_month_closures")
        .select("settlement_year, settlement_month, closed_at")
        .eq("manufacturer_id", manufacturerId),
    ]);

    if (requestResult.error) {
      throw new Error(requestResult.error.message);
    }
    if (closureResult.error) {
      throw new Error(closureResult.error.message);
    }

    return ok({
      rows: (requestResult.data as FeeSettlementRequestRow[] | null) || [],
      closures: (closureResult.data as MonthClosureRow[] | null) || [],
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireRoleUser(["manufacturer"], request);
    const admin = createServiceRoleClient() ?? supabase;
    const { id: manufacturerId } = await getOwnedManufacturerId(supabase, user.id);
    const body = (await request.json()) as PatchBody;
    const year = Number(body.year);
    const month = Number(body.month);

    if (!manufacturerId) {
      throw new Error("제조사 계정을 찾을 수 없습니다.");
    }

    if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("정산 월 정보가 올바르지 않습니다.");
    }

    const targetMonthKey = getMonthKey(year, month);
    const [rfqResult, requestResult, closureResult] = await Promise.all([
      admin
        .from("rfq_requests")
        .select("id, updated_at, is_settled")
        .eq("manufacturer_id", manufacturerId)
        .eq("status", "fulfilled")
        .eq("is_settled", false),
      admin
        .from("manufacturer_fee_settlement_requests")
        .select("rfq_request_id")
        .eq("manufacturer_id", manufacturerId),
      admin
        .from("manufacturer_fee_settlement_month_closures")
        .select("settlement_year, settlement_month, closed_at")
        .eq("manufacturer_id", manufacturerId),
    ]);

    if (rfqResult.error) {
      throw new Error(rfqResult.error.message);
    }
    if (requestResult.error) {
      throw new Error(requestResult.error.message);
    }
    if (closureResult.error) {
      throw new Error(closureResult.error.message);
    }

    const requestedIds = new Set(((requestResult.data as Array<{ rfq_request_id: string }> | null) || []).map((row) => row.rfq_request_id));
    const closureRows = ((closureResult.data as MonthClosureRow[] | null) || []) as MonthClosureRow[];
    const closureMap = new Map(closureRows.map((row) => [getMonthKey(row.settlement_year, row.settlement_month), row.closed_at]));

    if (closureMap.has(targetMonthKey)) {
      throw new Error("이미 마감된 정산월입니다.");
    }

    const eligibleRows = (((rfqResult.data as RequestRow[] | null) || []) as RequestRow[]).filter((row) => {
      if (!row.updated_at || requestedIds.has(row.id)) {
        return false;
      }

      return getEffectiveMonthKey(row.updated_at, closureMap) === targetMonthKey;
    });

    if (!eligibleRows.length) {
      throw new Error("요청 가능한 수수료 정산 건이 없습니다.");
    }

    const requestedAt = new Date().toISOString();
    const [insertRequestsResult, insertClosureResult] = await Promise.all([
      admin.from("manufacturer_fee_settlement_requests").insert(
        eligibleRows.map((row) => ({
          rfq_request_id: row.id,
          manufacturer_id: manufacturerId,
          requested_by: user.id,
          requested_at: requestedAt,
        }))
      ),
      admin.from("manufacturer_fee_settlement_month_closures").insert({
        manufacturer_id: manufacturerId,
        settlement_year: year,
        settlement_month: month,
        closed_at: requestedAt,
        closed_by: user.id,
      }),
    ]);

    if (insertRequestsResult.error) {
      throw new Error(insertRequestsResult.error.message);
    }
    if (insertClosureResult.error) {
      throw new Error(insertClosureResult.error.message);
    }

    return ok({
      requestedAt,
      requestCount: eligibleRows.length,
      closedMonth: targetMonthKey,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
