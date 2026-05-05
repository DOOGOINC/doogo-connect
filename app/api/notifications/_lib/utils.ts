import type { RfqRequestStatus } from "@/lib/rfq";
import type { requireServerUser } from "@/lib/server/supabase";
import type { ProfileRow, ReadRow } from "./types";

export const MAX_NOTIFICATIONS = 50;
const RETENTION_DAYS = 30;

export type NotificationSupabase = Awaited<ReturnType<typeof requireServerUser>>["supabase"];

export function getCutoffIso() {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function getTradeStatusLabel(status: RfqRequestStatus) {
  switch (status) {
    case "pending":
      return "견적 요청";
    case "reviewing":
      return "검토 중";
    case "payment_in_progress":
      return "결제 대기";
    case "payment_completed":
      return "결제 완료";
    case "production_waiting":
      return "생산 대기";
    case "production_started":
      return "생산 시작";
    case "production_in_progress":
      return "생산 진행중";
    case "manufacturing_completed":
      return "제조 완료";
    case "delivery_completed":
      return "납품 완료";
    case "quoted":
      return "견적 발송";
    case "ordered":
      return "제조 시작";
    case "completed":
      return "제조 완료";
    case "fulfilled":
      return "거래 완료";
    case "refunded":
      return "환불";
    case "rejected":
      return "거절";
    case "request_cancelled":
      return "요청 취소";
    default:
      return "상태 변경";
  }
}

export function getMemberTradeLink(status: RfqRequestStatus) {
  if (status === "reviewing" || status === "payment_in_progress" || status === "payment_completed") {
    return "/my-connect?tab=delivery&deliveryTab=approved";
  }

  if (
    status === "production_waiting" ||
    status === "production_started" ||
    status === "production_in_progress" ||
    status === "manufacturing_completed" ||
    status === "delivery_completed"
  ) {
    return "/my-connect?tab=delivery&deliveryTab=manufacturing";
  }

  if (
    status === "fulfilled"
  ) {
    return "/my-connect?tab=delivery&deliveryTab=completed-projects";
  }

  return "/my-connect?tab=project";
}

export function getManufacturerTradeLink(status: RfqRequestStatus) {
  if (status === "pending" || status === "reviewing" || status === "rejected" || status === "request_cancelled" || status === "refunded") {
    return "/my-connect?tab=rfq-inbox";
  }

  if (status === "payment_completed" || status === "fulfilled") {
    return "/my-connect?tab=transactions";
  }

  return "/my-connect?tab=orders";
}

export function getDisplayName(profile: ProfileRow | null | undefined, fallback: string) {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;

  const email = profile?.email?.trim();
  if (email) {
    const [localPart] = email.split("@");
    if (localPart) return localPart;
  }

  return fallback;
}

export function getAvatarInitial(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "C";
}

export async function getReadKeySet(supabase: NotificationSupabase, userId: string) {
  const cutoffIso = getCutoffIso();
  const { data, error } = await supabase
    .from("user_notification_reads")
    .select("notification_key")
    .eq("user_id", userId)
    .gte("created_at", cutoffIso);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(((data as ReadRow[] | null) || []).map((row) => row.notification_key));
}
