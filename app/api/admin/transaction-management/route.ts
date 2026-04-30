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
  manufacturer_id: number | null;
  manufacturer_name: string | null;
  product_name: string | null;
  quantity: number | null;
  currency_code: string | null;
  status: string | null;
  created_at: string | null;
  selection_snapshot?: {
    pricing?: SnapshotPricing | null;
  } | null;
  commission_amount?: number | null;
  commission_rate_percent?: number | null;
  settlement_amount?: number | null;
  is_settled?: boolean | null;
  settled_at?: string | null;
};

type FeeSettlementRequestRow = {
  rfq_request_id: string;
  requested_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type ProductCostRow = {
  id: string;
  cost_price: number | null;
};

type PatchBody = {
  requestId?: string;
  action?: "settle";
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

  const rate = Number(request.selection_snapshot?.pricing?.commission_rate_percent ?? request.commission_rate_percent ?? 3);
  return Number(((getTotalSaleAmount(request) * rate) / 100).toFixed(2));
}

function getSettlementAmount(request: RequestRow) {
  const storedSettlement = toMoney(request.settlement_amount);
  if (storedSettlement > 0) return storedSettlement;
  return Math.max(0, getTotalSaleAmount(request) - getCommissionAmount(request));
}

function getPaymentMethod(currencyCode: string) {
  return currencyCode === "KRW" ? "PortOne" : "Utransfer";
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

function buildSearchClauses(search: string, matchingClientIds: string[]) {
  if (!search) {
    return [];
  }

  const safeSearch = search.replace(/[%]/g, "").replace(/,/g, " ");
  const clauses = [
    `request_number.ilike.%${safeSearch}%`,
    `order_number.ilike.%${safeSearch}%`,
    `manufacturer_name.ilike.%${safeSearch}%`,
    `product_name.ilike.%${safeSearch}%`,
  ];

  if (matchingClientIds.length) {
    clauses.push(`client_id.in.(${matchingClientIds.join(",")})`);
  }

  return clauses;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRequestFilters(query: any, options: {
  startIso: string;
  endIso: string;
  manufacturer: string;
  currency: string;
  search: string;
  matchingClientIds: string[];
}) {
  let nextQuery = query
    .in("status", Array.from(VISIBLE_STATUSES))
    .gte("created_at", options.startIso)
    .lte("created_at", options.endIso);

  if (options.manufacturer !== "all") {
    nextQuery = nextQuery.eq("manufacturer_name", options.manufacturer);
  }

  if (options.currency !== "ALL") {
    nextQuery = nextQuery.eq("currency_code", options.currency);
  }

  const searchClauses = buildSearchClauses(options.search, options.matchingClientIds);
  if (searchClauses.length) {
    nextQuery = nextQuery.or(searchClauses.join(","));
  }

  return nextQuery;
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

    const startIso = startRange.toISOString();
    const endIso = endRange.toISOString();
    const matchingClientIds =
      search
        ? (((await admin.from("profiles").select("id").ilike("full_name", `%${search}%`)).data as Array<{ id: string }> | null) || [])
            .map((profile) => profile.id)
            .slice(0, 200)
        : [];

    const [filterMetaResult, totalCountResult, summaryResult] = await Promise.all([
      admin.from("rfq_requests").select("created_at, manufacturer_name").in("status", Array.from(VISIBLE_STATUSES)),
      applyRequestFilters(
        admin.from("rfq_requests").select("id", { count: "exact", head: true }),
        { startIso, endIso, manufacturer, currency, search, matchingClientIds }
      ),
      applyRequestFilters(
        admin.from("rfq_requests").select("selection_snapshot, commission_amount, commission_rate_percent, currency_code"),
        { startIso, endIso, manufacturer, currency: "ALL", search, matchingClientIds }
      ),
    ]);

    if (filterMetaResult.error) throw new Error(filterMetaResult.error.message);
    if (totalCountResult.error) throw new Error(totalCountResult.error.message);
    if (summaryResult.error) throw new Error(summaryResult.error.message);

    const filterMetaRows = (filterMetaResult.data as Array<{ created_at: string | null; manufacturer_name: string | null }> | null) || [];
    const manufacturers = Array.from(new Set(filterMetaRows.map((row) => trimValue(row.manufacturer_name)).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "ko")
    );
    const availableYears = Array.from(
      new Set(
        filterMetaRows
          .map((row) => (row.created_at ? new Date(row.created_at).getFullYear() : null))
          .filter((year): year is number => Boolean(year))
      )
    ).sort((a, b) => b - a);

    const summaryRows = (((summaryResult.data as RequestRow[] | null) || []) as RequestRow[]);
    const summary = summaryRows.reduce(
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
    const totalCount = totalCountResult.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const rangeFrom = (safePage - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const pageResult = await applyRequestFilters(
      admin
        .from("rfq_requests")
        .select(
          "id, request_number, order_number, client_id, product_id, manufacturer_id, manufacturer_name, product_name, quantity, currency_code, status, created_at, selection_snapshot, commission_amount, commission_rate_percent, settlement_amount, is_settled, settled_at"
        )
        .order("created_at", { ascending: false })
        .range(rangeFrom, rangeTo),
      { startIso, endIso, manufacturer, currency, search, matchingClientIds }
    );

    if (pageResult.error) throw new Error(pageResult.error.message);

    const pagedRequestRows = (((pageResult.data as RequestRow[] | null) || []) as RequestRow[]);
    const clientIds = Array.from(new Set(pagedRequestRows.map((row) => row.client_id).filter(Boolean)));
    const productIds = Array.from(new Set(pagedRequestRows.map((row) => trimValue(row.product_id)).filter(Boolean)));
    const requestIds = pagedRequestRows.map((row) => row.id);

    const [profileResult, productResult, feeRequestResult] = await Promise.all([
      clientIds.length ? admin.from("profiles").select("id, full_name").in("id", clientIds) : Promise.resolve({ data: [], error: null }),
      productIds.length ? admin.from("manufacturer_products").select("id, cost_price").in("id", productIds) : Promise.resolve({ data: [], error: null }),
      requestIds.length
        ? admin.from("manufacturer_fee_settlement_requests").select("rfq_request_id, requested_at").in("rfq_request_id", requestIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profileResult.error) throw new Error(profileResult.error.message);
    if (productResult.error) throw new Error(productResult.error.message);
    if (feeRequestResult.error) throw new Error(feeRequestResult.error.message);

    const feeRequestMap = new Map(
      (((feeRequestResult.data as FeeSettlementRequestRow[] | null) || []) as FeeSettlementRequestRow[]).map((row) => [row.rfq_request_id, row.requested_at])
    );

    const profileMap = new Map(
      (((profileResult.data as ProfileRow[] | null) || []) as ProfileRow[]).map((profile) => [profile.id, trimValue(profile.full_name, "회원")])
    );

    const productCostMap = new Map(
      (((productResult.data as ProductCostRow[] | null) || []) as ProductCostRow[]).map((product) => [product.id, toMoney(product.cost_price)])
    );

    const mappedRows = pagedRequestRows.map((requestRow) => {
      const currencyCode = trimValue(requestRow.currency_code, "KRW").toUpperCase();
      const quantity = Number(requestRow.quantity || 0);
      const capsuleCost = toMoney(productCostMap.get(trimValue(requestRow.product_id))) * quantity;

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
        capsuleSalePrice: getProductSaleAmount(requestRow),
        boxPrice: getBoxAmount(requestRow),
        designPrice: getDesignAmount(requestRow),
        totalSaleAmount: getTotalSaleAmount(requestRow),
        commissionAmount: getCommissionAmount(requestRow),
        settlementAmount: getSettlementAmount(requestRow),
        paymentMethod: getPaymentMethod(currencyCode),
        statusLabel: isCompletedStatus(trimValue(requestRow.status)) ? "완료" : "진행중",
        manufacturerSettlementRequestedAt: feeRequestMap.get(requestRow.id) || null,
        settledAt: requestRow.settled_at || null,
        isSettled: Boolean(requestRow.is_settled),
      };
    });

    return ok({
      summary,
      filters: {
        availableYears: availableYears.length ? availableYears : [currentYear],
        manufacturers,
      },
      rows: mappedRows,
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

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireMasterUser(request);
    const admin = createServiceRoleClient() ?? supabase;
    const body = (await request.json()) as PatchBody;
    const requestId = trimValue(body.requestId);

    if (!requestId || body.action !== "settle") {
      throw new Error("잘못된 요청입니다.");
    }

    const [rfqResult, feeRequestResult] = await Promise.all([
      admin
        .from("rfq_requests")
        .select("id, status, is_settled, settled_at")
        .eq("id", requestId)
        .maybeSingle(),
      admin
        .from("manufacturer_fee_settlement_requests")
        .select("rfq_request_id, requested_at")
        .eq("rfq_request_id", requestId)
        .maybeSingle(),
    ]);

    if (rfqResult.error) throw new Error(rfqResult.error.message);
    if (feeRequestResult.error) throw new Error(feeRequestResult.error.message);

    const rfqRequest = rfqResult.data;
    if (!rfqRequest) throw new Error("거래 정보를 찾을 수 없습니다.");
    if (trimValue(rfqRequest.status) !== "fulfilled") {
      throw new Error("거래 완료 건만 정산 처리할 수 있습니다.");
    }
    if (!feeRequestResult.data?.requested_at) {
      throw new Error("제조사 정산 요청 후에만 처리할 수 있습니다.");
    }
    if (rfqRequest.is_settled) {
      throw new Error("이미 정산 처리된 거래입니다.");
    }

    const { data: updated, error: updateError } = await admin
      .from("rfq_requests")
      .update({
        is_settled: true,
        settled_at: new Date().toISOString(),
        settled_by: user.id,
      })
      .eq("id", requestId)
      .select("id, settled_at")
      .single();

    if (updateError) throw new Error(updateError.message);

    return ok({ data: updated });
  } catch (error) {
    return mapRouteError(error);
  }
}
