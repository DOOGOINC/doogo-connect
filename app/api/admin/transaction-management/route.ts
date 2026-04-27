import { getDisplayOrderNumber } from "@/lib/rfq";
import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireMasterUser } from "@/lib/server/supabase";

type SnapshotServiceItem = {
  price?: number | null;
};

type SnapshotPricing = {
  product_amount?: number | null;
  container_amount?: number | null;
  package_price?: number | null;
  services?: SnapshotServiceItem[] | null;
  extras?: SnapshotServiceItem[] | null;
  total_price?: number | null;
  commission_amount?: number | null;
  commission_rate_percent?: number | null;
};

type RequestRow = {
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
  design_option_id: string | null;
  selection_snapshot?: {
    pricing?: SnapshotPricing | null;
  } | null;
  total_price?: number | null;
  commission_amount?: number | null;
  commission_rate_percent?: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type ProductCostRow = {
  id: string;
  cost_price: number | null;
};

const VISIBLE_STATUSES = new Set([
  "approved",
  "payment_in_progress",
  "payment_completed",
  "production_waiting",
  "quoted",
  "ordered",
  "production_started",
  "production_in_progress",
  "manufacturing_completed",
  "delivery_completed",
  "completed",
  "fulfilled",
]);

function trimValue(value: string | null | undefined, fallback = "") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function toMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

function getProductSaleAmount(request: RequestRow) {
  return toMoney(request.selection_snapshot?.pricing?.product_amount);
}

function getBoxAmount(request: RequestRow) {
  return toMoney(request.selection_snapshot?.pricing?.container_amount);
}

function getDesignAmount(request: RequestRow) {
  const packageAmount = toMoney(request.selection_snapshot?.pricing?.package_price);
  const serviceAmount = (request.selection_snapshot?.pricing?.services || []).reduce((sum, item) => sum + toMoney(item.price), 0);
  const extraAmount = (request.selection_snapshot?.pricing?.extras || []).reduce((sum, item) => sum + toMoney(item.price), 0);
  return packageAmount + serviceAmount + extraAmount;
}

function getTotalSaleAmount(request: RequestRow) {
  const snapshotTotal = toMoney(request.selection_snapshot?.pricing?.total_price);
  if (snapshotTotal > 0) return snapshotTotal;
  return getProductSaleAmount(request) + getBoxAmount(request) + getDesignAmount(request);
}

function getCommissionAmount(request: RequestRow) {
  const snapshotCommission = toMoney(request.selection_snapshot?.pricing?.commission_amount);
  if (snapshotCommission > 0) return snapshotCommission;

  const storedCommission = toMoney(request.commission_amount);
  if (storedCommission > 0) return storedCommission;

  const rate = Number(
    request.selection_snapshot?.pricing?.commission_rate_percent ?? request.commission_rate_percent ?? 3
  );
  return Number(((getTotalSaleAmount(request) * rate) / 100).toFixed(2));
}

function getPaymentMethod(currencyCode: string) {
  return currencyCode === "KRW" ? "포트원" : "유트랜스퍼";
}

function isCompletedStatus(status: string) {
  return status === "fulfilled";
}

function getDateRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const admin = createServiceRoleClient() ?? supabase;
    const url = new URL(request.url);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || "12")));
    const startYear = Math.max(2000, Number(url.searchParams.get("startYear") || currentYear));
    const startMonth = Math.min(12, Math.max(1, Number(url.searchParams.get("startMonth") || 1)));
    const endYear = Math.max(2000, Number(url.searchParams.get("endYear") || currentYear));
    const endMonth = Math.min(12, Math.max(1, Number(url.searchParams.get("endMonth") || currentMonth)));
    const search = trimValue(url.searchParams.get("search")).toLowerCase();
    const manufacturer = trimValue(url.searchParams.get("manufacturer"), "all");
    const currency = trimValue(url.searchParams.get("currency"), "ALL").toUpperCase();
    const startRange = getDateRange(startYear, startMonth).start;
    const endRange = getDateRange(endYear, endMonth).end;

    const [requestResult, profileResult, productResult] = await Promise.all([
      admin
        .from("rfq_requests")
        .select(
          "id, request_number, order_number, client_id, product_id, manufacturer_name, product_name, quantity, currency_code, status, created_at, design_option_id, selection_snapshot, total_price, commission_amount, commission_rate_percent"
        )
        .order("created_at", { ascending: false }),
      admin.from("profiles").select("id, full_name"),
      admin.from("manufacturer_products").select("id, cost_price"),
    ]);

    if (requestResult.error) throw new Error(requestResult.error.message);
    if (profileResult.error) throw new Error(profileResult.error.message);
    if (productResult.error) throw new Error(productResult.error.message);

    const profileMap = new Map(
      (((profileResult.data as ProfileRow[] | null) || []) as ProfileRow[]).map((profile) => [
        profile.id,
        trimValue(profile.full_name, "회원"),
      ])
    );
    const productCostMap = new Map(
      (((productResult.data as ProductCostRow[] | null) || []) as ProductCostRow[]).map((product) => [
        product.id,
        toMoney(product.cost_price),
      ])
    );
    const statusVisibleRows = (((requestResult.data as RequestRow[] | null) || []) as RequestRow[]).filter((requestRow) =>
      VISIBLE_STATUSES.has(trimValue(requestRow.status))
    );

    const manufacturers = Array.from(
      new Set(statusVisibleRows.map((row) => trimValue(row.manufacturer_name)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ko"));

    const availableYears = Array.from(
      new Set(
        statusVisibleRows
          .map((row) => (row.created_at ? new Date(row.created_at).getFullYear() : null))
          .filter((year): year is number => Boolean(year))
      )
    ).sort((a, b) => b - a);

    const visibleRows = statusVisibleRows.filter((requestRow) => {
        if (!requestRow.created_at) return false;
        const createdAt = new Date(requestRow.created_at);
        return createdAt >= startRange && createdAt <= endRange;
      });

    const baseFilteredRows = visibleRows.filter((requestRow) => {
      const requestManufacturer = trimValue(requestRow.manufacturer_name, "-");
      if (manufacturer !== "all" && requestManufacturer !== manufacturer) {
        return false;
      }

      if (!search) return true;

      const orderNumber = getDisplayOrderNumber({
        order_number: requestRow.order_number,
        request_number: requestRow.request_number,
      });
      const customerName = profileMap.get(requestRow.client_id) || "회원";
      const values = [orderNumber, customerName, requestManufacturer, trimValue(requestRow.product_name, "-")];

      return values.some((value) => value.toLowerCase().includes(search));
    });

    const summary = baseFilteredRows.reduce(
      (acc, requestRow) => {
        const currencyCode = trimValue(requestRow.currency_code, "KRW").toUpperCase();
        const totalSaleAmount = getTotalSaleAmount(requestRow);
        const commissionAmount = getCommissionAmount(requestRow);

        if (currencyCode === "NZD") {
          acc.totalSalesNzd += totalSaleAmount;
          acc.totalCommissionNzd += commissionAmount;
        }

        if (currencyCode === "KRW") {
          acc.totalSalesKrw += totalSaleAmount;
          acc.totalCommissionKrw += commissionAmount;
        }

        return acc;
      },
      {
        totalSalesNzd: 0,
        totalSalesKrw: 0,
        totalCommissionNzd: 0,
        totalCommissionKrw: 0,
      }
    );

    const currencyFilteredRows = baseFilteredRows.filter((requestRow) => {
      if (currency === "ALL") return true;
      return trimValue(requestRow.currency_code, "KRW").toUpperCase() === currency;
    });

    const mappedRows = currencyFilteredRows.map((requestRow) => {
      const currencyCode = trimValue(requestRow.currency_code, "KRW").toUpperCase();
      const quantity = Number(requestRow.quantity || 0);
      const capsuleCost = toMoney(productCostMap.get(trimValue(requestRow.product_id))) * quantity;
      const capsuleSalePrice = getProductSaleAmount(requestRow);
      const boxPrice = getBoxAmount(requestRow);
      const designPrice = getDesignAmount(requestRow);
      const totalSaleAmount = getTotalSaleAmount(requestRow);
      const commissionAmount = getCommissionAmount(requestRow);

      return {
        id: requestRow.id,
        orderNumber: getDisplayOrderNumber({
          order_number: requestRow.order_number,
          request_number: requestRow.request_number,
        }),
        createdAt: requestRow.created_at,
        requesterName: profileMap.get(requestRow.client_id) || "회원",
        manufacturerName: trimValue(requestRow.manufacturer_name, "-"),
        productName: trimValue(requestRow.product_name, "-"),
        quantity,
        currencyCode,
        capsuleCost,
        capsuleSalePrice,
        boxPrice,
        designPrice,
        totalSaleAmount,
        commissionAmount,
        paymentMethod: getPaymentMethod(currencyCode),
        statusLabel: isCompletedStatus(trimValue(requestRow.status)) ? "완료" : "진행중",
      };
    });

    const totalCount = mappedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedRows = mappedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

    return ok({
      summary,
      filters: {
        availableYears: availableYears.length ? availableYears : [currentYear],
        manufacturers,
        selectedManufacturer: manufacturer,
        selectedCurrency: currency,
        selectedStartYear: startYear,
        selectedStartMonth: startMonth,
        selectedEndYear: endYear,
        selectedEndMonth: endMonth,
      },
      rows: pagedRows,
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
