import { createServiceRoleClient, getOwnedManufacturerId } from "@/lib/server/supabase";
import type { NotificationItem, TradeRow } from "./types";
import { MAX_NOTIFICATIONS, getCutoffIso, type NotificationSupabase } from "./utils";
import { type AuditLogRow, getManufacturerAuditLink, getManufacturerAuditMessage } from "./trade-shared";

export async function buildManufacturerTradeNotifications(supabase: NotificationSupabase, userId: string, readKeys: Set<string>) {
  const ownedManufacturer = await getOwnedManufacturerId(supabase, userId);
  if (!ownedManufacturer.id) {
    return [] as NotificationItem[];
  }

  const cutoffIso = getCutoffIso();
  const admin = createServiceRoleClient() ?? supabase;
  const { data, error } = await supabase
    .from("rfq_requests")
    .select("id, product_name, status, created_at, settled_at, is_settled")
    .eq("manufacturer_id", ownedManufacturer.id)
    .or(`created_at.gte.${cutoffIso},settled_at.gte.${cutoffIso}`)
    .order("created_at", { ascending: false })
    .limit(MAX_NOTIFICATIONS * 3);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as TradeRow[] | null) || [];
  const requestMap = new Map(rows.map((row) => [row.id, row]));
  const requestIds = rows.map((row) => row.id);
  const notifications: NotificationItem[] = [];

  if (requestIds.length > 0) {
    const { data: auditRows, error: auditError } = await admin
      .from("rfq_audit_logs")
      .select("rfq_request_id, next_status, created_at")
      .in("rfq_request_id", requestIds)
      .in("next_status", ["payment_completed", "request_cancelled", "refunded"])
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false });

    if (auditError) {
      throw new Error(auditError.message);
    }

    for (const auditRow of (auditRows as AuditLogRow[] | null) || []) {
      const request = requestMap.get(auditRow.rfq_request_id);
      if (!request || !auditRow.next_status) {
        continue;
      }

      const productName = request.product_name || "상품";
      const key = `trade:audit:${auditRow.rfq_request_id}:${auditRow.next_status}:${auditRow.created_at}`;
      notifications.push({
        key,
        category: "trade",
        title: "거래 알림",
        message: getManufacturerAuditMessage(productName, auditRow.next_status),
        linkUrl: getManufacturerAuditLink(auditRow.next_status),
        createdAt: auditRow.created_at,
        isRead: readKeys.has(key),
      });
    }
  }

  for (const row of rows) {
    const productName = row.product_name || "상품";

    if (new Date(row.created_at).getTime() >= new Date(cutoffIso).getTime()) {
      const key = `trade:${row.id}:pending:${row.created_at}`;
      notifications.push({
        key,
        category: "trade",
        title: "거래 알림",
        message: `${productName} 신규 요청이 들어왔습니다.`,
        linkUrl: "/my-connect?tab=rfq-inbox",
        createdAt: row.created_at,
        isRead: readKeys.has(key),
      });
    }

    if (row.is_settled && row.settled_at && new Date(row.settled_at).getTime() >= new Date(cutoffIso).getTime()) {
      const key = `trade:settlement:${row.id}:${row.settled_at}`;
      notifications.push({
        key,
        category: "trade",
        title: "거래 알림",
        message: `${productName} 정산이 완료되었습니다.`,
        linkUrl: "/my-connect?tab=settlement-history",
        createdAt: row.settled_at,
        isRead: readKeys.has(key),
      });
    }
  }

  return notifications
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_NOTIFICATIONS);
}
