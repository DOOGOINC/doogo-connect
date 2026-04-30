import { mapRouteError, ok } from "@/lib/server/http";
import {
  getPartnerCompensationAccessByUserId,
  getPartnerCommissionRateForTimestamp,
  isTimestampWithinPartnerCompensationPeriods,
} from "@/lib/server/partners";
import { createServiceRoleClient, requirePartnerUser } from "@/lib/server/supabase";

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

type MonthlyRow = {
  month: string;
  nzdBaseAmount: number;
  nzdProfitAmount: number;
  krwBaseAmount: number;
  krwProfitAmount: number;
  status: "pending" | "completed";
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

function isCompletedStatus(status: string) {
  return status === "fulfilled";
}

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function isCompletedMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return true;
  if (year > currentYear) return false;
  return month < currentMonth;
}

export async function GET(request: Request) {
  try {
    const { user } = await requirePartnerUser(request);
    const admin = createServiceRoleClient();

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || "10")));
    const selectedYear = trimValue(url.searchParams.get("year"), "all");
    const selectedCurrency = trimValue(url.searchParams.get("currency"), "KRW").toUpperCase();

    const [
      { data: referralMembers, error: referralMembersError },
      partnerAccess,
    ] = await Promise.all([
      admin.from("profiles").select("id").eq("role", "member").eq("referred_by_profile_id", user.id),
      getPartnerCompensationAccessByUserId(admin, user.id),
    ]);

    if (referralMembersError) {
      throw new Error(referralMembersError.message);
    }

    const memberIds = (((referralMembers as ProfileRow[] | null) || []) as ProfileRow[]).map((member) => member.id);
    const commissionRate = partnerAccess.commissionRate;

    if (!memberIds.length) {
      const currentMonthKey = new Date().toISOString().slice(0, 7);

      return ok({
        summary: {
          currentMonth: currentMonthKey,
          selectedCurrency,
          currentBaseAmount: 0,
          currentProfitAmount: 0,
          commissionRate,
        },
        rows: [],
        filters: {
          years: [String(new Date().getFullYear())],
          selectedYear,
          selectedCurrency,
        },
        pagination: {
          page: 1,
          pageSize,
          totalCount: 0,
          totalPages: 1,
        },
      });
    }

    const { data: orderRows, error: orderRowsError } = await admin
      .from("rfq_requests")
      .select("client_id, currency_code, status, created_at, commission_locked_at, selection_snapshot")
      .in("client_id", memberIds)
      .eq("status", "fulfilled")
      .order("created_at", { ascending: false });

    if (orderRowsError) {
      throw new Error(orderRowsError.message);
    }

    const monthlyMap = new Map<string, MonthlyRow>();

    for (const order of ((orderRows as SettlementOrderRow[] | null) || []) as SettlementOrderRow[]) {
      const createdAt = getCompensationRecordedAt(order);
      if (!createdAt || !isCompletedStatus(trimValue(order.status))) continue;
      if (!isTimestampWithinPartnerCompensationPeriods(createdAt, partnerAccess.periods)) continue;

      const month = getMonthKey(createdAt);
      const current = monthlyMap.get(month) || {
        month,
        nzdBaseAmount: 0,
        nzdProfitAmount: 0,
        krwBaseAmount: 0,
        krwProfitAmount: 0,
        status: isCompletedMonth(month) ? "completed" : "pending",
      };

      const baseAmount = getBaseAmount(order);
      const appliedCommissionRate = getPartnerCommissionRateForTimestamp(createdAt, partnerAccess.periods, commissionRate);
      const profitAmount = Number((baseAmount * (appliedCommissionRate / 100)).toFixed(2));
      const currencyCode = trimValue(order.currency_code, "KRW").toUpperCase();

      if (currencyCode === "NZD") {
        current.nzdBaseAmount += baseAmount;
        current.nzdProfitAmount += profitAmount;
      } else {
        current.krwBaseAmount += baseAmount;
        current.krwProfitAmount += profitAmount;
      }

      monthlyMap.set(month, current);
    }

    const allRows = [...monthlyMap.values()].sort((a, b) => b.month.localeCompare(a.month));
    const availableYears = Array.from(new Set(allRows.map((row) => row.month.slice(0, 4)))).sort((a, b) => Number(b) - Number(a));
    const filteredRows = selectedYear === "all" ? allRows : allRows.filter((row) => row.month.startsWith(selectedYear));
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonthRow = filteredRows.find((row) => row.month === currentMonthKey) || allRows.find((row) => row.month === currentMonthKey) || null;

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

    return ok({
      summary: {
        currentMonth: currentMonthKey,
        selectedCurrency,
        currentBaseAmount: selectedCurrency === "NZD" ? currentMonthRow?.nzdBaseAmount || 0 : currentMonthRow?.krwBaseAmount || 0,
        currentProfitAmount: selectedCurrency === "NZD" ? currentMonthRow?.nzdProfitAmount || 0 : currentMonthRow?.krwProfitAmount || 0,
        commissionRate,
      },
      rows: pagedRows,
      filters: {
        years: availableYears,
        selectedYear,
        selectedCurrency,
      },
      pagination: {
        page: safePage,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
