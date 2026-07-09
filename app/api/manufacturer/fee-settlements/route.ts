import { mapRouteError, ok } from "@/lib/server/http";
import {
  getPartnerCommissionRateForTimestamp,
  getPartnerCompensationAccessByUserId,
  isTimestampWithinPartnerCompensationPeriods,
} from "@/lib/server/partners";
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

type PartnerFeeRequestRow = {
  id: string;
  client_id: string;
  status: string | null;
  created_at: string | null;
  commission_locked_at: string | null;
  selection_snapshot?: {
    pricing?: {
      product_amount?: number | null;
    } | null;
  } | null;
};

type ClientReferralRow = {
  id: string;
  referred_by_profile_id: string | null;
};

type PartnerProfileRow = {
  id: string;
  full_name: string | null;
};

function trimValue(value: string | null | undefined, fallback = "") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function toMoney(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
}

function getPartnerCompensationRecordedAt(row: PartnerFeeRequestRow) {
  return trimValue(row.commission_locked_at) || trimValue(row.created_at);
}

function isPartnerFeeVisibleStatus(status: string) {
  return status !== "request_cancelled" && status !== "rejected" && status !== "refunded";
}

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

    const partnerFeeRequestResult = await admin
      .from("rfq_requests")
      .select("id, client_id, status, created_at, commission_locked_at, selection_snapshot")
      .eq("manufacturer_id", manufacturerId);

    if (partnerFeeRequestResult.error) {
      throw new Error(partnerFeeRequestResult.error.message);
    }

    const partnerFeeRequests = (partnerFeeRequestResult.data as PartnerFeeRequestRow[] | null) || [];
    const clientIds = Array.from(new Set(partnerFeeRequests.map((row) => row.client_id).filter(Boolean)));
    const clientReferralMap = new Map<string, string>();

    if (clientIds.length) {
      const clientReferralResult = await admin.from("profiles").select("id, referred_by_profile_id").in("id", clientIds);

      if (clientReferralResult.error) {
        throw new Error(clientReferralResult.error.message);
      }

      for (const row of (clientReferralResult.data as ClientReferralRow[] | null) || []) {
        const partnerProfileId = trimValue(row.referred_by_profile_id);
        if (partnerProfileId) {
          clientReferralMap.set(row.id, partnerProfileId);
        }
      }
    }

    const partnerIds = Array.from(new Set(clientReferralMap.values()));
    const partnerProfileNames = new Map<string, string>();

    if (partnerIds.length) {
      const partnerProfileResult = await admin.from("profiles").select("id, full_name").in("id", partnerIds);

      if (partnerProfileResult.error) {
        throw new Error(partnerProfileResult.error.message);
      }

      for (const row of (partnerProfileResult.data as PartnerProfileRow[] | null) || []) {
        const partnerName = trimValue(row.full_name);
        if (partnerName) {
          partnerProfileNames.set(row.id, partnerName);
        }
      }
    }

    const partnerAccessEntries = await Promise.all(
      partnerIds.map(async (partnerUserId) => [partnerUserId, await getPartnerCompensationAccessByUserId(admin, partnerUserId)] as const)
    );
    const partnerAccessMap = new Map(partnerAccessEntries);
    const partnerFees = Object.fromEntries(
      partnerFeeRequests.flatMap((row) => {
        const status = trimValue(row.status);
        const partnerUserId = clientReferralMap.get(row.client_id);
        const recordedAt = getPartnerCompensationRecordedAt(row);

        if (!partnerUserId || !recordedAt || !isPartnerFeeVisibleStatus(status)) {
          return [];
        }

        const partnerAccess = partnerAccessMap.get(partnerUserId);
        if (!partnerAccess || !isTimestampWithinPartnerCompensationPeriods(recordedAt, partnerAccess.periods)) {
          return [];
        }

        const productAmount = toMoney(row.selection_snapshot?.pricing?.product_amount);
        const commissionRate = getPartnerCommissionRateForTimestamp(recordedAt, partnerAccess.periods, partnerAccess.commissionRate);
        const amount = Number((productAmount * (commissionRate / 100)).toFixed(2));

        return [[row.id, { amount, commissionRate }]];
      })
    );
    const partnerNames = Object.fromEntries(
      partnerFeeRequests.flatMap((row) => {
        const partnerUserId = clientReferralMap.get(row.client_id);
        const partnerName = partnerUserId ? partnerProfileNames.get(partnerUserId) : "";

        return partnerName ? [[row.id, partnerName]] : [];
      })
    );

    return ok({
      rows: (requestResult.data as FeeSettlementRequestRow[] | null) || [],
      closures: (closureResult.data as MonthClosureRow[] | null) || [],
      partnerFees,
      partnerNames,
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
