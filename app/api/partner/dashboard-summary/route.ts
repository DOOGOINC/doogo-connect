import { getDisplayOrderNumber } from "@/lib/rfq";
import { mapRouteError, ok } from "@/lib/server/http";
import {
  getPartnerCompensationAccessByUserId,
  getPartnerCommissionRateForTimestamp,
  isTimestampWithinPartnerCompensationPeriods,
} from "@/lib/server/partners";
import { createServiceRoleClient, requirePartnerUser } from "@/lib/server/supabase";

type ProfileRow = {
  id: string;
  full_name: string | null;
  created_at: string | null;
};

type SnapshotPricing = {
  product_amount?: number | null;
  container_amount?: number | null;
};

type OrderRow = {
  id: string;
  request_number: string;
  order_number: string | null;
  client_id: string;
  product_name: string | null;
  currency_code: string | null;
  status: string | null;
  created_at: string | null;
  commission_locked_at: string | null;
  selection_snapshot?: {
    pricing?: SnapshotPricing | null;
  } | null;
};

type MonthlyProfitRow = {
  monthKey: string;
  label: string;
  nzdProfit: number;
  krwProfit: number;
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

function getBaseAmount(order: OrderRow) {
  const pricing = order.selection_snapshot?.pricing;
  return toMoney(pricing?.product_amount) + toMoney(pricing?.container_amount);
}

function getCompensationRecordedAt(order: OrderRow) {
  return trimValue(order.commission_locked_at) || trimValue(order.created_at);
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(value: string | null, pivot = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === pivot.getFullYear() && date.getMonth() === pivot.getMonth();
}

function buildLastSixMonths() {
  const months: MonthlyProfitRow[] = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = date.getMonth() + 1;
    months.push({
      monthKey: `${date.getFullYear()}-${String(month).padStart(2, "0")}`,
      label: `${month}월`,
      nzdProfit: 0,
      krwProfit: 0,
    });
  }

  return months;
}

export async function GET(request: Request) {
  try {
    const { user } = await requirePartnerUser(request);
    const admin = createServiceRoleClient();

    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const [{ data: referralMembers, error: referralMembersError }, partnerAccess] = await Promise.all([
      admin.from("profiles").select("id, full_name, created_at").eq("role", "member").eq("referred_by_profile_id", user.id),
      getPartnerCompensationAccessByUserId(admin, user.id),
    ]);

    if (referralMembersError) {
      throw new Error(referralMembersError.message);
    }

    const members = (referralMembers as ProfileRow[] | null) || [];
    const memberMap = new Map(members.map((member) => [member.id, trimValue(member.full_name, "회원")]));
    const memberIds = members.map((member) => member.id);
    const commissionRate = partnerAccess.commissionRate;
    const currentMonthStart = getMonthStart();
    const seedMonths = buildLastSixMonths();
    const monthlyProfitMap = new Map(seedMonths.map((row) => [row.monthKey, { ...row }]));

    if (!memberIds.length) {
      return ok({
        summary: {
          newReferralCount: 0,
          completedOrderCount: 0,
          currentBaseNzd: 0,
          currentProfitNzd: 0,
          currentBaseKrw: 0,
          currentProfitKrw: 0,
          commissionRate,
        },
        chart: {
          monthlyProfits: seedMonths,
        },
        recentOrders: [],
      });
    }

    const { data: orderRows, error: orderRowsError } = await admin
      .from("rfq_requests")
      .select("id, request_number, order_number, client_id, product_name, currency_code, status, created_at, commission_locked_at, selection_snapshot")
      .in("client_id", memberIds)
      .eq("status", "fulfilled")
      .order("created_at", { ascending: false });

    if (orderRowsError) {
      throw new Error(orderRowsError.message);
    }

    const orders = ((orderRows as OrderRow[] | null) || []).filter((order) =>
      isTimestampWithinPartnerCompensationPeriods(getCompensationRecordedAt(order), partnerAccess.periods)
    );
    let completedOrderCount = 0;
    let currentBaseNzd = 0;
    let currentProfitNzd = 0;
    let currentBaseKrw = 0;
    let currentProfitKrw = 0;

    for (const order of orders) {
      const createdAt = getCompensationRecordedAt(order);
      if (!createdAt) continue;

      const baseAmount = getBaseAmount(order);
      const appliedCommissionRate = getPartnerCommissionRateForTimestamp(createdAt, partnerAccess.periods, commissionRate);
      const profitAmount = Number((baseAmount * (appliedCommissionRate / 100)).toFixed(2));
      const currencyCode = trimValue(order.currency_code, "KRW").toUpperCase();
      const monthKey = createdAt.slice(0, 7);
      const monthRow = monthlyProfitMap.get(monthKey);

      if (monthRow) {
        if (currencyCode === "NZD") {
          monthRow.nzdProfit += profitAmount;
        } else {
          monthRow.krwProfit += profitAmount;
        }
      }

      if (isSameMonth(createdAt, currentMonthStart)) {
        completedOrderCount += 1;

        if (currencyCode === "NZD") {
          currentBaseNzd += baseAmount;
          currentProfitNzd += profitAmount;
        } else {
          currentBaseKrw += baseAmount;
          currentProfitKrw += profitAmount;
        }
      }
    }

    const newReferralCount = members.filter((member) => {
      if (!member.created_at) return false;
      return new Date(member.created_at) >= currentMonthStart;
    }).length;

    const recentOrders = orders.slice(0, 5).map((order) => {
      const currencyCode = trimValue(order.currency_code, "KRW").toUpperCase();
      const baseAmount = getBaseAmount(order);
      const appliedCommissionRate = getPartnerCommissionRateForTimestamp(
        getCompensationRecordedAt(order),
        partnerAccess.periods,
        commissionRate
      );
      const partnerProfit = Number((baseAmount * (appliedCommissionRate / 100)).toFixed(2));

      return {
        id: order.id,
        orderNumber: getDisplayOrderNumber({
          order_number: order.order_number,
          request_number: order.request_number,
        }),
        customerName: memberMap.get(order.client_id) || "회원",
        productName: trimValue(order.product_name, "-"),
        currencyCode,
        baseAmount,
        partnerProfit,
        commissionRate: appliedCommissionRate,
      };
    });

    return ok({
      summary: {
        newReferralCount,
        completedOrderCount,
        currentBaseNzd: Number(currentBaseNzd.toFixed(2)),
        currentProfitNzd: Number(currentProfitNzd.toFixed(2)),
        currentBaseKrw: Number(currentBaseKrw.toFixed(2)),
        currentProfitKrw: Number(currentProfitKrw.toFixed(2)),
        commissionRate,
      },
      chart: {
        monthlyProfits: seedMonths.map((row) => {
          const current = monthlyProfitMap.get(row.monthKey) || row;
          return {
            monthKey: current.monthKey,
            label: current.label,
            nzdProfit: Number(current.nzdProfit.toFixed(2)),
            krwProfit: Number(current.krwProfit.toFixed(2)),
          };
        }),
      },
      recentOrders,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
