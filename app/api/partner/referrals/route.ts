import { mapRouteError, ok } from "@/lib/server/http";
import { getPartnerCompensationAccessByUserId, isTimestampWithinPartnerCompensationPeriods } from "@/lib/server/partners";
import { createServiceRoleClient, requirePartnerUser } from "@/lib/server/supabase";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
};

type SnapshotPricing = {
  product_amount?: number | null;
  container_amount?: number | null;
};

type RfqOrderRow = {
  client_id: string;
  total_price: number | null;
  currency_code: string | null;
  created_at: string | null;
  commission_locked_at: string | null;
  selection_snapshot?: {
    pricing?: SnapshotPricing | null;
  } | null;
};

function trimValue(value: string | null | undefined, fallback = "") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getContributionAmount(order: RfqOrderRow) {
  const snapshotPricing = order.selection_snapshot?.pricing;

  if (snapshotPricing) {
    const productAmount = Number(snapshotPricing.product_amount || 0);
    const containerAmount = Number(snapshotPricing.container_amount || 0);
    const snapshotAmount = productAmount + containerAmount;

    if (snapshotAmount > 0) {
      return snapshotAmount;
    }
  }

  return Number(order.total_price || 0);
}

function getCompensationRecordedAt(order: RfqOrderRow) {
  return trimValue(order.commission_locked_at) || trimValue(order.created_at);
}

function buildOrderSummaryMap(orders: RfqOrderRow[]) {
  const summaryMap = new Map<
    string,
    {
      orderCount: number;
      totalKrw: number;
      totalNzd: number;
    }
  >();

  for (const order of orders) {
    const clientId = trimValue(order.client_id);
    if (!clientId) continue;

    const current = summaryMap.get(clientId) || { orderCount: 0, totalKrw: 0, totalNzd: 0 };
    const amount = getContributionAmount(order);
    const currencyCode = trimValue(order.currency_code, "KRW").toUpperCase();

    current.orderCount += 1;

    if (currencyCode === "NZD") {
      current.totalNzd += amount;
    } else {
      current.totalKrw += amount;
    }

    summaryMap.set(clientId, current);
  }

  return summaryMap;
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
    const search = trimValue(url.searchParams.get("search"));

    const [{ data: partnerProfile, error: partnerProfileError }, partnerAccess] = await Promise.all([
      admin
        .from("profiles")
        .select("full_name, referral_code")
        .eq("id", user.id)
        .maybeSingle<{ full_name: string | null; referral_code: string | null }>(),
      getPartnerCompensationAccessByUserId(admin, user.id),
    ]);

    if (partnerProfileError) {
      throw new Error(partnerProfileError.message);
    }

    const { data: allMembers, error: allMembersError } = await admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "member")
      .eq("referred_by_profile_id", user.id)
      .order("created_at", { ascending: false });

    if (allMembersError) {
      throw new Error(allMembersError.message);
    }

    let filteredMembersQuery = admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "member")
      .eq("referred_by_profile_id", user.id)
      .order("created_at", { ascending: false });

    if (search) {
      filteredMembersQuery = filteredMembersQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: filteredMembers, error: filteredMembersError } = await filteredMembersQuery;

    if (filteredMembersError) {
      throw new Error(filteredMembersError.message);
    }

    const allReferralMembers = (allMembers as ProfileRow[] | null) || [];
    const filteredReferralMembers = (filteredMembers as ProfileRow[] | null) || [];
    const allMemberIds = allReferralMembers.map((member) => member.id);

    let completedOrders: RfqOrderRow[] = [];
    if (allMemberIds.length > 0) {
      const { data: orderRows, error: orderRowsError } = await admin
        .from("rfq_requests")
        .select("client_id, total_price, currency_code, created_at, commission_locked_at, selection_snapshot")
        .eq("status", "fulfilled")
        .in("client_id", allMemberIds);

      if (orderRowsError) {
        throw new Error(orderRowsError.message);
      }

      completedOrders = ((orderRows as RfqOrderRow[] | null) || []).filter((order) =>
        isTimestampWithinPartnerCompensationPeriods(getCompensationRecordedAt(order), partnerAccess.periods)
      );
    }

    const orderSummaryMap = buildOrderSummaryMap(completedOrders);
    let totalContributionKrw = 0;
    let totalContributionNzd = 0;

    for (const memberId of allMemberIds) {
      const summary = orderSummaryMap.get(memberId);
      if (!summary) continue;
      totalContributionKrw += summary.totalKrw;
      totalContributionNzd += summary.totalNzd;
    }

    const enrichedMembers = filteredReferralMembers.map((member) => {
      const summary = orderSummaryMap.get(member.id) || { orderCount: 0, totalKrw: 0, totalNzd: 0 };

      return {
        id: member.id,
        name: trimValue(member.full_name, "회원"),
        email: trimValue(member.email, "-"),
        joinedAt: member.created_at,
        orderCount: summary.orderCount,
        totalKrw: summary.totalKrw,
        totalNzd: summary.totalNzd,
      };
    });

    const totalReferralCount = allReferralMembers.length;
    const newThisMonthCount = allReferralMembers.filter((member) => {
      if (!member.created_at) return false;
      return member.created_at >= getMonthStartIso();
    }).length;

    const totalCount = enrichedMembers.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedMembers = enrichedMembers.slice((safePage - 1) * pageSize, safePage * pageSize);

    return ok({
      partner: {
        fullName: trimValue(partnerProfile?.full_name, "파트너"),
        referralCode: trimValue(partnerProfile?.referral_code),
      },
      summary: {
        totalReferralCount,
        newThisMonthCount,
        totalContributionKrw,
        totalContributionNzd,
      },
      members: pagedMembers,
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
