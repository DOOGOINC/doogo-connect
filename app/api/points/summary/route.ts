import { mapRouteError, ok } from "@/lib/server/http";
import { DEFAULT_RFQ_REQUEST_POINT_COST, ensurePointSettings, getPointSummary } from "@/lib/server/points";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireServerUser(request);
    const summary = await getPointSummary(supabase, user.id);
    const admin = createServiceRoleClient();
    const pointSettings = admin ? await ensurePointSettings(admin) : null;
    return ok({
      success: true,
      ...summary,
      rfqRequestCostPoints: pointSettings?.rfqRequestCostPoints || DEFAULT_RFQ_REQUEST_POINT_COST,
      commissionRatePercent: pointSettings?.commissionRatePercent || 3,
      pointPurchasePackages: pointSettings?.pointPurchasePackages || [],
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
