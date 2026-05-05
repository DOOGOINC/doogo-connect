import { createServiceRoleClient } from "@/lib/server/supabase";
import type { NotificationItem } from "./types";
import { MAX_NOTIFICATIONS, getCutoffIso } from "./utils";

type MasterAdmin = NonNullable<ReturnType<typeof createServiceRoleClient>>;

export async function buildMasterTradeNotifications(admin: MasterAdmin, readKeys: Set<string>) {
  const cutoffIso = getCutoffIso();
  const [
    { data: memberRows, error: memberError },
    { data: disputeRows, error: disputeError },
    { data: productRows, error: productError },
    { data: settlementRows, error: settlementError },
    { data: pointPurchaseRows, error: pointPurchaseError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "member")
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS),
    admin
      .from("master_disputes")
      .select("id, dispute_number, applicant_name, status, created_at, updated_at")
      .or(`created_at.gte.${cutoffIso},updated_at.gte.${cutoffIso}`)
      .order("updated_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS),
    admin
      .from("manufacturer_products")
      .select("id, manufacturer_id, name, created_at")
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS),
    admin
      .from("manufacturer_fee_settlement_requests")
      .select("rfq_request_id, requested_at")
      .gte("requested_at", cutoffIso)
      .order("requested_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS),
    admin
      .from("point_purchases")
      .select("id, user_id, amount_krw, points, bonus_points, status, completed_at, created_at")
      .eq("status", "completed")
      .gte("completed_at", cutoffIso)
      .order("completed_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS),
  ]);

  if (memberError) throw new Error(memberError.message);
  if (disputeError) throw new Error(disputeError.message);
  if (productError) throw new Error(productError.message);
  if (settlementError) throw new Error(settlementError.message);
  if (pointPurchaseError) throw new Error(pointPurchaseError.message);

  const manufacturerIds = Array.from(
    new Set((((productRows as Array<{ manufacturer_id: number | null }> | null) || [])).map((row) => row.manufacturer_id).filter((id): id is number => typeof id === "number"))
  );
  const settlementRequestIds = Array.from(
    new Set((((settlementRows as Array<{ rfq_request_id: string | null }> | null) || [])).map((row) => row.rfq_request_id).filter((id): id is string => Boolean(id)))
  );
  const pointBuyerIds = Array.from(
    new Set((((pointPurchaseRows as Array<{ user_id: string | null }> | null) || [])).map((row) => row.user_id).filter((id): id is string => Boolean(id)))
  );

  const [
    { data: manufacturers, error: manufacturersError },
    { data: pointBuyers, error: pointBuyersError },
    { data: settlementRequests, error: settlementRequestsError },
  ] = await Promise.all([
    manufacturerIds.length
      ? admin.from("manufacturers").select("id, name").in("id", manufacturerIds)
      : Promise.resolve({ data: [], error: null }),
    pointBuyerIds.length
      ? admin.from("profiles").select("id, full_name").in("id", pointBuyerIds)
      : Promise.resolve({ data: [], error: null }),
    settlementRequestIds.length
      ? admin.from("rfq_requests").select("id, product_name, manufacturer_name").in("id", settlementRequestIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (manufacturersError) throw new Error(manufacturersError.message);
  if (pointBuyersError) throw new Error(pointBuyersError.message);
  if (settlementRequestsError) throw new Error(settlementRequestsError.message);

  const manufacturerNameMap = new Map((((manufacturers as Array<{ id: number; name: string | null }> | null) || [])).map((row) => [row.id, row.name || "제조사"]));
  const pointBuyerNameMap = new Map((((pointBuyers as Array<{ id: string; full_name: string | null }> | null) || [])).map((row) => [row.id, row.full_name || "회원"]));
  const settlementRequestMap = new Map(
    (((settlementRequests as Array<{ id: string; product_name: string | null; manufacturer_name: string | null }> | null) || [])).map((row) => [row.id, row])
  );

  const notifications: NotificationItem[] = [];

  for (const memberRow of ((memberRows as Array<{ id: string; full_name: string | null; created_at: string | null }> | null) || [])) {
    const createdAt = memberRow.created_at || new Date().toISOString();
    const key = `trade:master:member:${memberRow.id}:${createdAt}`;
    notifications.push({
      key,
      category: "trade",
      title: "회원가입 알림",
      message: `${memberRow.full_name || "회원"}님이 신규 가입했습니다.`,
      linkUrl: "/master?tab=requesters",
      createdAt,
      isRead: readKeys.has(key),
    });
  }

  for (const disputeRow of ((disputeRows as Array<{ id: string; dispute_number: string | null; applicant_name: string | null; created_at: string; updated_at: string }> | null) || [])) {
    const createdAt = disputeRow.updated_at || disputeRow.created_at;
    const key = `trade:master:dispute:${disputeRow.id}:${createdAt}`;
    notifications.push({
      key,
      category: "trade",
      title: "분쟁/중재 알림",
      message: `${disputeRow.applicant_name || "회원"}님의 분쟁 건${disputeRow.dispute_number ? ` ${disputeRow.dispute_number}` : ""}이 접수되었거나 변경되었습니다.`,
      linkUrl: "/master?tab=dispute-center",
      createdAt,
      isRead: readKeys.has(key),
    });
  }

  for (const productRow of ((productRows as Array<{ id: string; manufacturer_id: number | null; name: string | null; created_at: string }> | null) || [])) {
    const manufacturerName = (typeof productRow.manufacturer_id === "number" ? manufacturerNameMap.get(productRow.manufacturer_id) : null) || "제조사";
    const key = `trade:master:product:${productRow.id}:${productRow.created_at}`;
    notifications.push({
      key,
      category: "trade",
      title: "제품 등록 알림",
      message: `${manufacturerName}에서 ${productRow.name || "제품"} 상품을 등록했습니다.`,
      linkUrl: "/master?tab=manufacturers",
      createdAt: productRow.created_at,
      isRead: readKeys.has(key),
    });
  }

  for (const settlementRow of ((settlementRows as Array<{ rfq_request_id: string | null; requested_at: string | null }> | null) || [])) {
    const requestId = settlementRow.rfq_request_id;
    const requestedAt = settlementRow.requested_at;
    if (!requestId || !requestedAt) {
      continue;
    }

    const settlementRequest = settlementRequestMap.get(requestId);
    const key = `trade:master:settlement:${requestId}:${requestedAt}`;
    notifications.push({
      key,
      category: "trade",
      title: "정산 요청 알림",
      message: `${settlementRequest?.manufacturer_name || "제조사"}의 ${settlementRequest?.product_name || "상품"} 정산 요청이 접수되었습니다.`,
      linkUrl: "/master?tab=transaction-management",
      createdAt: requestedAt,
      isRead: readKeys.has(key),
    });
  }

  for (const pointPurchaseRow of ((pointPurchaseRows as Array<{ id: string; user_id: string | null; amount_krw: number | null; points: number | null; bonus_points: number | null; completed_at: string | null; created_at: string }> | null) || [])) {
    const createdAt = pointPurchaseRow.completed_at || pointPurchaseRow.created_at;
    const buyerName = (pointPurchaseRow.user_id ? pointBuyerNameMap.get(pointPurchaseRow.user_id) : null) || "회원";
    const totalPoints = Number(pointPurchaseRow.points || 0) + Number(pointPurchaseRow.bonus_points || 0);
    const key = `trade:master:point:${pointPurchaseRow.id}:${createdAt}`;
    notifications.push({
      key,
      category: "trade",
      title: "포인트 충전 알림",
      message: `${buyerName}님이 ${Number(pointPurchaseRow.amount_krw || 0).toLocaleString("ko-KR")}원 / ${totalPoints.toLocaleString("ko-KR")}P 포인트를 충전했습니다.`,
      linkUrl: "/master?tab=point-settings",
      createdAt,
      isRead: readKeys.has(key),
    });
  }

  return notifications
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_NOTIFICATIONS);
}
