export type AuditLogRow = {
  rfq_request_id: string;
  next_status: string | null;
  created_at: string;
};

export const MEMBER_AUDIT_STATUSES = [
  "reviewing",
  "production_waiting",
  "production_started",
  "production_in_progress",
  "manufacturing_completed",
  "delivery_completed",
  "refunded",
] as const;

export function getMemberAuditMessage(productName: string, status: string) {
  if (status === "reviewing") {
    return `${productName} 요청이 승인 완료되었습니다.`;
  }

  if (status === "production_waiting") {
    return `${productName} 상태가 생산 대기로 변경되었습니다.`;
  }

  if (status === "production_started") {
    return `${productName} 상태가 제조시작으로 변경되었습니다.`;
  }

  if (status === "production_in_progress") {
    return `${productName} 상태가 제조 진행으로 변경되었습니다.`;
  }

  if (status === "manufacturing_completed") {
    return `${productName} 상태가 제조완료로 변경되었습니다.`;
  }

  if (status === "delivery_completed") {
    return `${productName} 상태가 납품완료로 변경되었습니다.`;
  }

  if (status === "refunded") {
    return `${productName} 상태가 환불로 변경되었습니다.`;
  }

  return `${productName} 상태가 변경되었습니다.`;
}

export function getManufacturerAuditLink(status: string) {
  if (status === "payment_completed") {
    return "/my-connect?tab=transactions";
  }

  if (status === "request_cancelled" || status === "refunded") {
    return "/my-connect?tab=rfq-inbox";
  }

  return "/my-connect?tab=orders";
}

export function getManufacturerAuditMessage(productName: string, status: string) {
  if (status === "payment_completed") {
    return `${productName} 상태가 결제완료로 변경되었습니다.`;
  }

  if (status === "request_cancelled") {
    return `${productName} 상태가 요청취소로 변경되었습니다.`;
  }

  if (status === "refunded") {
    return `${productName} 상태가 환불로 변경되었습니다.`;
  }

  return `${productName} 상태가 변경되었습니다.`;
}
