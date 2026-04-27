import { formatCurrency, normalizeCurrencyCode, type CurrencyCode } from "./currency";

export type RfqRequestStatus =
  | "pending"
  | "reviewing"
  | "payment_in_progress"
  | "payment_completed"
  | "production_waiting"
  | "production_started"
  | "production_in_progress"
  | "manufacturing_completed"
  | "delivery_completed"
  | "quoted"
  | "ordered"
  | "completed"
  | "request_cancelled"
  | "rejected"
  | "fulfilled"
  | "refunded";

export type RfqRequestRow = {
  id: string;
  request_number: string;
  order_number: string | null;
  client_id: string;
  manufacturer_id: number;
  manufacturer_name: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  request_note: string | null;
  admin_memo: string | null;
  has_files: boolean;
  file_link: string | null;
  product_id: string;
  product_name: string;
  container_id: string | null;
  container_name: string | null;
  design_option_id: string | null;
  design_summary: string | null;
  design_package_id: string | null;
  design_service_ids: string[] | null;
  design_extra_ids: string[] | null;
  currency_code: CurrencyCode | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_rate_percent?: number | null;
  commission_amount?: number | null;
  settlement_amount?: number | null;
  commission_locked_at?: string | null;
  selection_snapshot: Record<string, unknown>;
  status: RfqRequestStatus;
  created_at: string;
  updated_at: string;
};

export type ReviewFormValues = {
  brandName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  requestNote: string;
  hasFiles: "yes" | "no";
  fileLink: string;
};

export const DEFAULT_REVIEW_FORM_VALUES: ReviewFormValues = {
  brandName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  requestNote: "",
  hasFiles: "no",
  fileLink: "",
};

export const RFQ_STATUS_LABELS: Record<RfqRequestStatus, string> = {
  pending: "신규 요청",
  reviewing: "결제 대기",
  payment_in_progress: "결제 대기",
  payment_completed: "결제 완료",
  production_waiting: "생산 대기",
  production_started: "제조 시작",
  production_in_progress: "제조 진행중",
  manufacturing_completed: "제조 완료",
  delivery_completed: "납품 완료",
  quoted: "견적 발송",
  ordered: "제조 시작",
  completed: "제조 완료",
  request_cancelled: "요청취소",
  rejected: "거절",
  fulfilled: "거래 완료",
  refunded: "환불",
};

export const RFQ_STATUS_OPTIONS: Array<{ value: RfqRequestStatus; label: string }> = [
  { value: "pending", label: "신규 요청" },
  { value: "reviewing", label: "결제 대기" },
  { value: "payment_completed", label: "결제 완료" },
  { value: "production_waiting", label: "생산 대기" },
  { value: "production_started", label: "제조 시작" },
  { value: "production_in_progress", label: "제조 진행중" },
  { value: "manufacturing_completed", label: "제조 완료" },
  { value: "delivery_completed", label: "납품 완료" },
  { value: "quoted", label: "제조 대기" },
  { value: "ordered", label: "제조 시작" },
  { value: "completed", label: "제조 완료" },
  { value: "request_cancelled", label: "요청취소" },
  { value: "rejected", label: "거절" },
  { value: "fulfilled", label: "거래 완료" },
  { value: "refunded", label: "환불" },
];

export const CLIENT_PROJECT_STEPS = [
  { key: "pending", label: "요청 완료" },
  { key: "reviewing", label: "결제 대기" },
  { key: "quoted", label: "제조 시작" },
  { key: "ordered", label: "제조 완료" },
  { key: "completed", label: "납품 완료" },
] as const;

export const getClientProjectStepIndex = (status: RfqRequestStatus) => {
  switch (status) {
    case "pending":
      return 1;
    case "reviewing":
      return 2;
    case "payment_in_progress":
    case "payment_completed":
      return 2;
    case "production_waiting":
    case "quoted":
      return 3;
    case "production_started":
    case "production_in_progress":
    case "ordered":
      return 4;
    case "manufacturing_completed":
    case "delivery_completed":
    case "completed":
    case "fulfilled":
    case "refunded":
    case "request_cancelled":
      return 5;
    default:
      return 1;
  }
};

export const formatRfqDate = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export const formatRfqDateTime = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatRfqCurrency = (value: number | string, currencyCode?: string | null) =>
  formatCurrency(value, normalizeCurrencyCode(currencyCode));

export const getExpectedDeliveryDate = (value: string) => {
  const date = new Date(value);
  date.setDate(date.getDate() + 28);
  return formatRfqDate(date.toISOString());
};

export const createRequestNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `RFQ-${stamp}${random}`;
};

export const createOrderNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${stamp}${random}`;
};

export const getDisplayOrderNumber = (request: Pick<RfqRequestRow, "order_number" | "request_number">) =>
  request.order_number?.trim() || request.request_number.replace(/^RFQ-/, "ORD-");
