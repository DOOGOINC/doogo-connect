import { formatCurrency, normalizeCurrencyCode, type CurrencyCode } from "./currency";

export type RfqRequestStatus = "pending" | "reviewing" | "quoted" | "ordered" | "completed" | "rejected" | "fulfilled";

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
  reviewing: "제조사 확인",
  quoted: "견적 발송",
  ordered: "제조 시작",
  completed: "제조 완료",
  rejected: "거절",
  fulfilled: "구매 확정",
};

export const RFQ_STATUS_OPTIONS: Array<{ value: RfqRequestStatus; label: string }> = [
  { value: "pending", label: "신규 요청" },
  { value: "reviewing", label: "제조사 확인" },
  { value: "quoted", label: "제조 대기" },
  { value: "ordered", label: "제조 시작" },
  { value: "completed", label: "제조 완료" },
  { value: "rejected", label: "거절" },
  { value: "fulfilled", label: "구매 확정" },
];

export const CLIENT_PROJECT_STEPS = [
  { key: "pending", label: "요청 완료" },
  { key: "reviewing", label: "제조사 확인" },
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
    case "quoted":
      return 3;
    case "ordered":
      return 4;
    case "completed":
    case "fulfilled":
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
