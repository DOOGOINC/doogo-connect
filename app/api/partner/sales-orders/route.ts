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
};

type SnapshotPricing = {
  product_amount?: number | null;
  container_amount?: number | null;
};

type SalesOrderRow = {
  id: string;
  request_number: string;
  order_number: string | null;
  client_id: string;
  product_id: string | null;
  manufacturer_name: string | null;
  product_name: string | null;
  quantity: number | null;
  currency_code: string | null;
  status: string | null;
  created_at: string | null;
  commission_locked_at: string | null;
  selection_snapshot?: {
    pricing?: SnapshotPricing | null;
  } | null;
};

type SalesOrderResponseItem = {
  id: string;
  orderNumber: string;
  createdAt: string | null;
  customerName: string;
  manufacturerName: string;
  productName: string;
  quantity: number;
  currencyCode: string;
  costAmount: number;
  capsuleSalePrice: number;
  boxPrice: number;
  baseAmount: number;
  partnerProfit: number;
  commissionRate: number;
  paymentMethod: string;
  statusLabel: "완료" | "거래중";
};

type ProductCostRow = {
  id: string;
  cost_price: number | null;
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

function getProductAmount(order: SalesOrderRow) {
  return toMoney(order.selection_snapshot?.pricing?.product_amount);
}

function getContainerAmount(order: SalesOrderRow) {
  return toMoney(order.selection_snapshot?.pricing?.container_amount);
}

function getBaseAmount(order: SalesOrderRow) {
  return getProductAmount(order) + getContainerAmount(order);
}

function getCompensationRecordedAt(order: SalesOrderRow) {
  return trimValue(order.commission_locked_at) || trimValue(order.created_at);
}

function getPaymentMethod(currencyCode: string) {
  return currencyCode === "KRW" ? "포트원" : "유트랜스퍼";
}

function isVisibleStatus(status: string) {
  return status !== "request_cancelled" && status !== "rejected" && status !== "refunded";
}

function isCompletedStatus(status: string) {
  return status === "fulfilled";
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
    const selectedYear = Math.max(0, Number(url.searchParams.get("year") || "0"));
    const selectedMonth = Math.max(0, Number(url.searchParams.get("month") || "0"));
    const selectedCurrency = trimValue(url.searchParams.get("currency"), "NZD").toUpperCase();

    const [
      { data: referralMembers, error: referralMembersError },
      partnerAccess,
      { data: productCosts, error: productCostsError },
    ] = await Promise.all([
      admin.from("profiles").select("id, full_name").eq("role", "member").eq("referred_by_profile_id", user.id),
      getPartnerCompensationAccessByUserId(admin, user.id),
      admin.from("manufacturer_products").select("id, cost_price"),
    ]);

    if (referralMembersError) {
      throw new Error(referralMembersError.message);
    }
    if (productCostsError) {
      throw new Error(productCostsError.message);
    }

    const memberRows = (referralMembers as ProfileRow[] | null) || [];
    const memberMap = new Map(memberRows.map((member) => [member.id, trimValue(member.full_name, "회원")]));
    const memberIds = memberRows.map((member) => member.id);
    const commissionRate = partnerAccess.commissionRate;
    const productCostMap = new Map((((productCosts as ProductCostRow[] | null) || []) as ProductCostRow[]).map((product) => [product.id, toMoney(product.cost_price)]));

    if (!memberIds.length) {
      const currentYear = new Date().getFullYear();

      return ok({
        summary: {
          totalBaseNzd: 0,
          totalCommissionNzd: 0,
          totalBaseKrw: 0,
          totalCommissionKrw: 0,
          commissionRate,
        },
        orders: [],
        filters: {
          availableYears: [currentYear],
          selectedYear: selectedYear || currentYear,
          selectedMonth,
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
      .select("id, request_number, order_number, client_id, product_id, manufacturer_name, product_name, quantity, currency_code, status, created_at, commission_locked_at, selection_snapshot")
      .in("client_id", memberIds)
      .order("created_at", { ascending: false });

    if (orderRowsError) {
      throw new Error(orderRowsError.message);
    }

    const allOrders = ((orderRows as SalesOrderRow[] | null) || []).filter(
      (order) =>
        isVisibleStatus(trimValue(order.status)) &&
        isTimestampWithinPartnerCompensationPeriods(getCompensationRecordedAt(order), partnerAccess.periods)
    );
    const availableYears = Array.from(
      new Set(
        allOrders
          .map((order) => (order.created_at ? new Date(order.created_at).getFullYear() : null))
          .filter((year): year is number => Boolean(year))
      )
    ).sort((a, b) => b - a);

    const fallbackYear = availableYears[0] || new Date().getFullYear();
    const safeYear = selectedYear || fallbackYear;

    const dateFilteredOrders = allOrders.filter((order) => {
      if (!order.created_at) return false;

      const recordedAt = getCompensationRecordedAt(order);
      if (!recordedAt) return false;
      const createdAt = new Date(recordedAt);
      const matchesYear = createdAt.getFullYear() === safeYear;
      const matchesMonth = selectedMonth <= 0 || createdAt.getMonth() + 1 === selectedMonth;

      return matchesYear && matchesMonth;
    });

    const completedOrders = dateFilteredOrders.filter((order) => isCompletedStatus(trimValue(order.status)));
    const summary = completedOrders.reduce(
      (acc, order) => {
        const currencyCode = trimValue(order.currency_code, "KRW").toUpperCase();
        const baseAmount = getBaseAmount(order);
        const appliedCommissionRate = getPartnerCommissionRateForTimestamp(
          getCompensationRecordedAt(order),
          partnerAccess.periods,
          commissionRate
        );
        const commissionAmount = Number((baseAmount * (appliedCommissionRate / 100)).toFixed(2));

        if (currencyCode === "NZD") {
          acc.totalBaseNzd += baseAmount;
          acc.totalCommissionNzd += commissionAmount;
        } else {
          acc.totalBaseKrw += baseAmount;
          acc.totalCommissionKrw += commissionAmount;
        }

        return acc;
      },
      {
        totalBaseNzd: 0,
        totalCommissionNzd: 0,
        totalBaseKrw: 0,
        totalCommissionKrw: 0,
      }
    );

    const currencyFilteredOrders =
      selectedCurrency === "ALL" ? dateFilteredOrders : dateFilteredOrders.filter((order) => trimValue(order.currency_code, "KRW").toUpperCase() === selectedCurrency);

    const rows: SalesOrderResponseItem[] = currencyFilteredOrders.map((order) => {
      const currencyCode = trimValue(order.currency_code, "KRW").toUpperCase();
      const productAmount = getProductAmount(order);
      const containerAmount = getContainerAmount(order);
      const costAmount = toMoney(productCostMap.get(trimValue(order.product_id))) * Number(order.quantity || 0);
      const baseAmount = productAmount + containerAmount;
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
        createdAt: order.created_at,
        customerName: memberMap.get(order.client_id) || "회원",
        manufacturerName: trimValue(order.manufacturer_name, "-"),
        productName: trimValue(order.product_name, "-"),
        quantity: Number(order.quantity || 0),
        currencyCode,
        costAmount,
        capsuleSalePrice: productAmount,
        boxPrice: containerAmount,
        baseAmount,
        partnerProfit,
        commissionRate: appliedCommissionRate,
        paymentMethod: getPaymentMethod(currencyCode),
        statusLabel: isCompletedStatus(trimValue(order.status)) ? "완료" : "거래중",
      };
    });

    const totalCount = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedOrders = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

    return ok({
      summary: {
        ...summary,
        commissionRate,
      },
      orders: pagedOrders,
      filters: {
        availableYears: availableYears.length ? availableYears : [fallbackYear],
        selectedYear: safeYear,
        selectedMonth,
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
