import { mapRouteError, ok } from "@/lib/server/http";
import { buildPartnerSettlementRows } from "@/lib/server/partner-settlements";
import { createServiceRoleClient, requirePartnerUser } from "@/lib/server/supabase";

function trimValue(value: string | null | undefined, fallback = "") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
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

    const settlementData = await buildPartnerSettlementRows(admin, user.id);
    const allRows = settlementData.rows;
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
        commissionRate: settlementData.commissionRate,
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
