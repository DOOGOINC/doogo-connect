import { mapRouteError, ok } from "@/lib/server/http";
import { listPartners } from "@/lib/server/partners";
import { buildPartnerSettlementRows, markPartnerSettlementCompleted } from "@/lib/server/partner-settlements";
import { createServiceRoleClient, requireMasterUser } from "@/lib/server/supabase";

function trimValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const admin = createServiceRoleClient() ?? supabase;
    const partners = await listPartners(admin);
    const url = new URL(request.url);
    const requestedPartnerId = trimValue(url.searchParams.get("partnerId"));
    const selectedPartner = partners.find((partner) => partner.id === requestedPartnerId) || partners[0] || null;

    if (!selectedPartner) {
      return ok({
        partners: [],
        selectedPartnerId: null,
        summary: {
          pendingCount: 0,
          completedCount: 0,
          pendingNzdProfitAmount: 0,
          pendingKrwProfitAmount: 0,
        },
        rows: [],
      });
    }

    const settlementData = await buildPartnerSettlementRows(admin, selectedPartner.id);
    const summary = settlementData.rows.reduce(
      (acc, row) => {
        if (row.status === "completed") {
          acc.completedCount += 1;
        } else {
          acc.pendingCount += 1;
          acc.pendingNzdProfitAmount += row.nzdProfitAmount;
          acc.pendingKrwProfitAmount += row.krwProfitAmount;
        }
        return acc;
      },
      {
        pendingCount: 0,
        completedCount: 0,
        pendingNzdProfitAmount: 0,
        pendingKrwProfitAmount: 0,
      }
    );

    return ok({
      partners: partners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        referralCode: partner.referralCode,
        commissionRate: partner.commissionRate,
      })),
      selectedPartnerId: selectedPartner.id,
      summary,
      rows: settlementData.rows,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const admin = createServiceRoleClient() ?? supabase;
    const body = await request.json();
    const partnerId = trimValue(body.partnerId);
    const month = trimValue(body.month);

    if (!partnerId) {
      throw new Error("파트너를 선택해 주세요.");
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("정산 월 정보가 올바르지 않습니다.");
    }

    const row = await markPartnerSettlementCompleted(admin, partnerId, month);
    return ok({ success: true, row });
  } catch (error) {
    return mapRouteError(error);
  }
}
