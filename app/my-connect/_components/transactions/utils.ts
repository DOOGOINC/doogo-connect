import { type CurrencyCode } from "@/lib/currency";
import { getDisplayOrderNumber, type RfqRequestRow } from "@/lib/rfq";
import { type SnapshotPricing } from "./types";

export const PAGE_SIZE = 10;
export const TRANSACTION_VISIBLE_STATUSES = new Set([
  "payment_completed",
  "production_waiting",
  "production_in_progress",
  "manufacturing_completed",
  "delivery_completed",
  "fulfilled",
  "refunded",
]);
export const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => index + 1);

export const createInvoiceNumber = (request: RfqRequestRow) => {
  const date = new Date(request.commission_locked_at || request.updated_at || request.created_at);
  const year = date.getFullYear();
  const serial = getDisplayOrderNumber(request).replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `INV-${year}-${serial}`;
};

export const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });

export const formatCurrencyDisplay = (value: number | string, currencyCode?: string | null) => {
  const numeric = Number(value || 0);
  const code = (currencyCode || "USD").toUpperCase();

  if (code === "KRW") {
    return `KRW ${Math.round(numeric).toLocaleString("ko-KR")}`;
  }

  return `${code} ${Math.round(numeric).toLocaleString("en-US")}`;
};

export const formatPreciseCurrencyDisplay = (value: number | string, currencyCode?: string | null) => {
  const numeric = Number(value || 0);
  const code = (currencyCode || "USD").toUpperCase();
  const formatted = numeric.toLocaleString(code === "KRW" ? "ko-KR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${code} ${formatted}`;
};

export const getTransactionStatusLabel = (status: RfqRequestRow["status"]) => {
  switch (status) {
    case "payment_completed":
      return "결제완료";
    case "production_waiting":
      return "생산 대기";
    case "production_in_progress":
      return "제조 중";
    case "manufacturing_completed":
      return "제조 완료";
    case "delivery_completed":
      return "납품 완료";
    case "fulfilled":
      return "거래완료";
    case "refunded":
      return "환불";
    case "request_cancelled":
      return "취소";
    default:
      return "진행중";
  }
};

export const getTransactionStatusTone = (status: RfqRequestRow["status"]) => {
  switch (status) {
    case "payment_completed":
      return "bg-[#eff6ff] text-[#2563eb]";
    case "production_waiting":
      return "bg-[#f3f4f6] text-[#6b7280]";
    case "production_in_progress":
      return "bg-[#ecfeff] text-[#0891b2]";
    case "manufacturing_completed":
      return "bg-[#ecfdf3] text-[#16a34a]";
    case "delivery_completed":
      return "bg-[#f0fdf4] text-[#15803d]";
    case "fulfilled":
      return "bg-[#dcfce7] text-[#16a34a]";
    case "refunded":
      return "bg-[#fef2f2] text-[#dc2626]";
    case "request_cancelled":
      return "bg-[#f3f4f6] text-[#6b7280]";
    default:
      return "bg-[#eff6ff] text-[#2563eb]";
  }
};

export const csvEscape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addOneMonthKey(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return getMonthKey(date.getFullYear(), date.getMonth() + 1);
}

export function getMonthKeyFromDate(value: string) {
  const date = new Date(value);
  return getMonthKey(date.getFullYear(), date.getMonth() + 1);
}

export function getEffectiveFeeMonthKeyFromMap(completedAt: string, closedMonthMap: Record<string, string>) {
  const baseMonthKey = getMonthKeyFromDate(completedAt);
  const closedAt = closedMonthMap[baseMonthKey];

  if (!closedAt) {
    return baseMonthKey;
  }

  return new Date(completedAt).getTime() > new Date(closedAt).getTime() ? addOneMonthKey(baseMonthKey) : baseMonthKey;
}

export function getSnapshotPricing(request: RfqRequestRow) {
  const snapshot = (request.selection_snapshot || {}) as { pricing?: SnapshotPricing };
  return snapshot.pricing || {};
}

export function toCurrencyCode(value: string | null | undefined) {
  return (value || "USD") as CurrencyCode;
}
