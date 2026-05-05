import { createServiceRoleClient } from "@/lib/server/supabase";
import type { NotificationItem, TradeRow } from "./types";
import { MAX_NOTIFICATIONS, getCutoffIso, getMemberTradeLink, type NotificationSupabase } from "./utils";
import { type AuditLogRow, MEMBER_AUDIT_STATUSES, getMemberAuditMessage } from "./trade-shared";

export async function buildMemberTradeNotifications(supabase: NotificationSupabase, userId: string, readKeys: Set<string>) {
  const cutoffIso = getCutoffIso();
  const admin = createServiceRoleClient() ?? supabase;
  const { data, error } = await supabase
    .from("rfq_requests")
    .select("id, product_name, status, updated_at, created_at")
    .eq("client_id", userId)
    .or(`updated_at.gte.${cutoffIso},created_at.gte.${cutoffIso}`)
    .order("updated_at", { ascending: false })
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
      .in("next_status", Array.from(MEMBER_AUDIT_STATUSES))
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
        message: getMemberAuditMessage(productName, auditRow.next_status),
        linkUrl: getMemberTradeLink(auditRow.next_status as TradeRow["status"]),
        createdAt: auditRow.created_at,
        isRead: readKeys.has(key),
      });
    }
  }

  return notifications
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_NOTIFICATIONS);
}
