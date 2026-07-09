import { mapRouteError, ok } from "@/lib/server/http";
import { getPartnerCompensationAccessByUserId, isTimestampWithinPartnerCompensationPeriods } from "@/lib/server/partners";
import { createServiceRoleClient, requireMasterUser } from "@/lib/server/supabase";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
};

type OrderRow = {
  client_id: string;
  created_at: string | null;
  commission_locked_at: string | null;
};

function trimValue(value: string | null | undefined, fallback = "") {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function getCompensationRecordedAt(order: OrderRow) {
  return trimValue(order.commission_locked_at) || trimValue(order.created_at);
}

export async function GET(request: Request) {
  try {
    await requireMasterUser(request);

    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const url = new URL(request.url);
    const partnerId = trimValue(url.searchParams.get("partnerId"));

    if (!partnerId) {
      throw new Error("파트너 정보가 올바르지 않습니다.");
    }

    const [{ data: partnerProfile, error: partnerProfileError }, partnerAccess] = await Promise.all([
      admin.from("profiles").select("id").eq("id", partnerId).eq("role", "partner").maybeSingle<{ id: string }>(),
      getPartnerCompensationAccessByUserId(admin, partnerId),
    ]);

    if (partnerProfileError) {
      throw new Error(partnerProfileError.message);
    }
    if (!partnerProfile?.id) {
      throw new Error("파트너 계정을 찾을 수 없습니다.");
    }

    const { data: memberRows, error: memberRowsError } = await admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "member")
      .eq("referred_by_profile_id", partnerId)
      .order("created_at", { ascending: false });

    if (memberRowsError) {
      throw new Error(memberRowsError.message);
    }

    const members = (memberRows as ProfileRow[] | null) || [];
    const memberIds = members.map((member) => member.id);
    const orderCountMap = new Map<string, number>();

    if (memberIds.length > 0) {
      const { data: orderRows, error: orderRowsError } = await admin
        .from("rfq_requests")
        .select("client_id, created_at, commission_locked_at")
        .in("client_id", memberIds)
        .eq("status", "fulfilled");

      if (orderRowsError) {
        throw new Error(orderRowsError.message);
      }

      for (const order of (orderRows as OrderRow[] | null) || []) {
        const recordedAt = getCompensationRecordedAt(order);
        if (!recordedAt) continue;
        if (!isTimestampWithinPartnerCompensationPeriods(recordedAt, partnerAccess.periods)) continue;

        const clientId = trimValue(order.client_id);
        if (!clientId) continue;

        orderCountMap.set(clientId, (orderCountMap.get(clientId) || 0) + 1);
      }
    }

    return ok({
      count: members.length,
      members: members.map((member) => ({
        id: member.id,
        name: trimValue(member.full_name, "회원"),
        email: trimValue(member.email, "-"),
        createdAt: member.created_at,
        transactionCount: orderCountMap.get(member.id) || 0,
      })),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
