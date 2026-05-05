import { mapRouteError, ok } from "@/lib/server/http";
import { buildPartnerSettlementRows } from "@/lib/server/partner-settlements";
import { createServiceRoleClient, requirePartnerUser } from "@/lib/server/supabase";

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

    const settlementData = await buildPartnerSettlementRows(admin, user.id);
    const completedRows = settlementData.rows
      .filter((row) => row.status === "completed" && row.settledAt)
      .map((row) => ({
        month: row.month,
        nzdBaseAmount: row.nzdBaseAmount,
        nzdProfitAmount: row.nzdProfitAmount,
        krwBaseAmount: row.krwBaseAmount,
        krwProfitAmount: row.krwProfitAmount,
        settledAt: row.settledAt as string,
        status: "completed" as const,
      }));

    const totalCount = completedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedRows = completedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

    return ok({
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
