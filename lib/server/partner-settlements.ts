import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPartnerCommissionRateForTimestamp,
  getPartnerCompensationAccessByUserId,
  isTimestampWithinPartnerCompensationPeriods,
} from "./partners";

type ProfileRow = {
  id: string;
};

type SnapshotPricing = {
  product_amount?: number | null;
  container_amount?: number | null;
};

type SettlementOrderRow = {
  client_id: string;
  currency_code: string | null;
  status: string | null;
  created_at: string | null;
  commission_locked_at: string | null;
  selection_snapshot?: {
    pricing?: SnapshotPricing | null;
  } | null;
};

type PartnerMonthlySettlementRow = {
  settlement_year: number;
  settlement_month: number;
  nzd_base_amount: number | null;
  nzd_profit_amount: number | null;
  krw_base_amount: number | null;
  krw_profit_amount: number | null;
  commission_rate_percent: number | null;
  status: string | null;
  settled_at: string | null;
};

export type PartnerSettlementRow = {
  month: string;
  nzdBaseAmount: number;
  nzdProfitAmount: number;
  krwBaseAmount: number;
  krwProfitAmount: number;
  commissionRate: number;
  status: "pending" | "completed";
  settledAt: string | null;
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

function getBaseAmount(order: SettlementOrderRow) {
  const pricing = order.selection_snapshot?.pricing;
  return toMoney(pricing?.product_amount) + toMoney(pricing?.container_amount);
}

function getCompensationRecordedAt(order: SettlementOrderRow) {
  return trimValue(order.commission_locked_at) || trimValue(order.created_at);
}

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function toMonthParts(monthKey: string) {
  const [settlementYear, settlementMonth] = monthKey.split("-").map(Number);
  return { settlementYear, settlementMonth };
}

function getSavedMonthKey(row: PartnerMonthlySettlementRow) {
  return `${row.settlement_year}-${String(row.settlement_month).padStart(2, "0")}`;
}

export async function buildPartnerSettlementRows(supabase: SupabaseClient, partnerUserId: string) {
  const [
    { data: referralMembers, error: referralMembersError },
    partnerAccess,
    { data: savedRows, error: savedRowsError },
  ] = await Promise.all([
    supabase.from("profiles").select("id").eq("role", "member").eq("referred_by_profile_id", partnerUserId),
    getPartnerCompensationAccessByUserId(supabase, partnerUserId),
    supabase
      .from("partner_monthly_settlements")
      .select(
        "settlement_year, settlement_month, nzd_base_amount, nzd_profit_amount, krw_base_amount, krw_profit_amount, commission_rate_percent, status, settled_at"
      )
      .eq("partner_profile_id", partnerUserId)
      .order("settlement_year", { ascending: false })
      .order("settlement_month", { ascending: false }),
  ]);

  if (referralMembersError) {
    throw new Error(referralMembersError.message);
  }
  if (savedRowsError) {
    throw new Error(savedRowsError.message);
  }

  const memberIds = (((referralMembers as ProfileRow[] | null) || []) as ProfileRow[]).map((member) => member.id);
  const savedRowMap = new Map(
    ((((savedRows as PartnerMonthlySettlementRow[] | null) || []) as PartnerMonthlySettlementRow[]) || []).map((row) => [getSavedMonthKey(row), row])
  );

  if (!memberIds.length) {
    return {
      commissionRate: partnerAccess.commissionRate,
      rows: [...savedRowMap.entries()]
        .map(([month, row]) => ({
          month,
          nzdBaseAmount: toMoney(row.nzd_base_amount),
          nzdProfitAmount: toMoney(row.nzd_profit_amount),
          krwBaseAmount: toMoney(row.krw_base_amount),
          krwProfitAmount: toMoney(row.krw_profit_amount),
          commissionRate: Number(row.commission_rate_percent || partnerAccess.commissionRate),
          status: row.status === "completed" ? "completed" : "pending",
          settledAt: row.settled_at,
        }))
        .sort((a, b) => b.month.localeCompare(a.month)),
    };
  }

  const { data: orderRows, error: orderRowsError } = await supabase
    .from("rfq_requests")
    .select("client_id, currency_code, status, created_at, commission_locked_at, selection_snapshot")
    .in("client_id", memberIds)
    .eq("status", "fulfilled")
    .order("created_at", { ascending: false });

  if (orderRowsError) {
    throw new Error(orderRowsError.message);
  }

  const rowMap = new Map<string, PartnerSettlementRow>();

  for (const order of ((orderRows as SettlementOrderRow[] | null) || []) as SettlementOrderRow[]) {
    const createdAt = getCompensationRecordedAt(order);
    if (!createdAt) continue;
    if (!isTimestampWithinPartnerCompensationPeriods(createdAt, partnerAccess.periods)) continue;

    const month = getMonthKey(createdAt);
    const savedRow = savedRowMap.get(month);
    const current = rowMap.get(month) || {
      month,
      nzdBaseAmount: savedRow ? toMoney(savedRow.nzd_base_amount) : 0,
      nzdProfitAmount: savedRow ? toMoney(savedRow.nzd_profit_amount) : 0,
      krwBaseAmount: savedRow ? toMoney(savedRow.krw_base_amount) : 0,
      krwProfitAmount: savedRow ? toMoney(savedRow.krw_profit_amount) : 0,
      commissionRate: Number(savedRow?.commission_rate_percent || partnerAccess.commissionRate),
      status: savedRow?.status === "completed" ? "completed" : "pending",
      settledAt: savedRow?.settled_at || null,
    };

    if (savedRow?.status === "completed") {
      rowMap.set(month, current);
      continue;
    }

    const baseAmount = getBaseAmount(order);
    const appliedCommissionRate = getPartnerCommissionRateForTimestamp(createdAt, partnerAccess.periods, partnerAccess.commissionRate);
    const profitAmount = Number((baseAmount * (appliedCommissionRate / 100)).toFixed(2));
    const currencyCode = trimValue(order.currency_code, "KRW").toUpperCase();

    current.commissionRate = appliedCommissionRate;

    if (currencyCode === "NZD") {
      current.nzdBaseAmount += baseAmount;
      current.nzdProfitAmount += profitAmount;
    } else {
      current.krwBaseAmount += baseAmount;
      current.krwProfitAmount += profitAmount;
    }

    rowMap.set(month, current);
  }

  for (const [month, savedRow] of savedRowMap.entries()) {
    if (rowMap.has(month)) continue;
    rowMap.set(month, {
      month,
      nzdBaseAmount: toMoney(savedRow.nzd_base_amount),
      nzdProfitAmount: toMoney(savedRow.nzd_profit_amount),
      krwBaseAmount: toMoney(savedRow.krw_base_amount),
      krwProfitAmount: toMoney(savedRow.krw_profit_amount),
      commissionRate: Number(savedRow.commission_rate_percent || partnerAccess.commissionRate),
      status: savedRow.status === "completed" ? "completed" : "pending",
      settledAt: savedRow.settled_at,
    });
  }

  return {
    commissionRate: partnerAccess.commissionRate,
    rows: [...rowMap.values()].sort((a, b) => b.month.localeCompare(a.month)),
  };
}

export async function markPartnerSettlementCompleted(supabase: SupabaseClient, partnerUserId: string, month: string) {
  const { rows } = await buildPartnerSettlementRows(supabase, partnerUserId);
  const target = rows.find((row) => row.month === month);

  if (!target) {
    throw new Error("정산 대상 월 정보를 찾지 못했습니다.");
  }

  const { settlementYear, settlementMonth } = toMonthParts(month);
  const settledAt = new Date().toISOString();
  const { error } = await supabase.from("partner_monthly_settlements").upsert(
    {
      partner_profile_id: partnerUserId,
      settlement_year: settlementYear,
      settlement_month: settlementMonth,
      nzd_base_amount: target.nzdBaseAmount,
      nzd_profit_amount: target.nzdProfitAmount,
      krw_base_amount: target.krwBaseAmount,
      krw_profit_amount: target.krwProfitAmount,
      commission_rate_percent: target.commissionRate,
      status: "completed",
      settled_at: settledAt,
      updated_at: settledAt,
    },
    { onConflict: "partner_profile_id,settlement_year,settlement_month" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return { ...target, status: "completed" as const, settledAt };
}
