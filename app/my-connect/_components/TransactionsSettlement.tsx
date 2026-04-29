"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Download, FileText, Info, Search } from "lucide-react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { authFetch } from "@/lib/client/auth-fetch";
import { getDisplayOrderNumber, type RfqRequestRow } from "@/lib/rfq";
import { ClientQuotePreviewModal } from "./ClientQuotePreviewModal";

interface TransactionsSettlementProps {
  requests: RfqRequestRow[];
  view: "transactions" | "settlements" | "fees";
  onRequestsRefresh?: () => Promise<void>;
}

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  request: RfqRequestRow;
  completedAt: string;
  settledAt: string | null;
  requestedAt: string | null;
  gross: number;
  commissionRatePercent: number;
  fee: number;
  net: number;
};

type CurrencySummary = {
  currencyCode: string;
  gross: number;
  fee: number;
  net: number;
};

type SummaryMetricCard = {
  key: string;
  label: string;
  value: number;
  currencyCode: string;
  color: string;
};

type FeeMetaPayload = {
  rows?: Array<{ rfq_request_id: string; requested_at: string }>;
  closures?: Array<{ settlement_year: number; settlement_month: number; closed_at: string }>;
};

const PAGE_SIZE = 10;
const TRANSACTION_VISIBLE_STATUSES = new Set(["payment_completed", "fulfilled", "refunded"]);
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => index + 1);

const createInvoiceNumber = (request: RfqRequestRow) => {
  const date = new Date(request.commission_locked_at || request.updated_at || request.created_at);
  const year = date.getFullYear();
  const serial = getDisplayOrderNumber(request).replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `INV-${year}-${serial}`;
};

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });

const formatCurrencyDisplay = (value: number | string, currencyCode?: string | null) => {
  const numeric = Number(value || 0);
  const code = (currencyCode || "USD").toUpperCase();

  if (code === "KRW") {
    return `KRW ${Math.round(numeric).toLocaleString("ko-KR")}`;
  }

  return `${code} ${Math.round(numeric).toLocaleString("en-US")}`;
};

const getTransactionStatusLabel = (status: RfqRequestRow["status"]) => {
  switch (status) {
    case "payment_completed":
      return "결제완료";
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

const getTransactionStatusTone = (status: RfqRequestRow["status"]) => {
  switch (status) {
    case "payment_completed":
      return "bg-[#eff6ff] text-[#2563eb]";
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

const csvEscape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addOneMonthKey(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return getMonthKey(date.getFullYear(), date.getMonth() + 1);
}

function getMonthKeyFromDate(value: string) {
  const date = new Date(value);
  return getMonthKey(date.getFullYear(), date.getMonth() + 1);
}

function getEffectiveFeeMonthKeyFromMap(completedAt: string, closedMonthMap: Record<string, string>) {
  const baseMonthKey = getMonthKeyFromDate(completedAt);
  const closedAt = closedMonthMap[baseMonthKey];

  if (!closedAt) {
    return baseMonthKey;
  }

  return new Date(completedAt).getTime() > new Date(closedAt).getTime() ? addOneMonthKey(baseMonthKey) : baseMonthKey;
}

export function TransactionsSettlement({ requests, view, onRequestsRefresh }: TransactionsSettlementProps) {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const [commissionRatePercent, setCommissionRatePercent] = useState(3);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("ALL");
  const [quotePreviewRequest, setQuotePreviewRequest] = useState<RfqRequestRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFeeMonth, setSelectedFeeMonth] = useState(currentMonth);
  const [feePage, setFeePage] = useState(1);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestedAtMap, setRequestedAtMap] = useState<Record<string, string>>({});
  const [closedMonthMap, setClosedMonthMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await authFetch("/api/points/summary");
        const payload = (await response.json()) as { commissionRatePercent?: number };
        if (response.ok) {
          setCommissionRatePercent(Number(payload.commissionRatePercent || 3));
        }
      } catch (error) {
        console.error("Failed to load commission settings:", error);
      }
    };

    void fetchSettings();
  }, []);

  useEffect(() => {
    if (view !== "fees") return;

    const fetchFeeMeta = async () => {
      try {
        const response = await authFetch("/api/manufacturer/fee-settlements");
        const payload = (await response.json()) as FeeMetaPayload;
        if (!response.ok) {
          return;
        }

        setRequestedAtMap(Object.fromEntries((payload.rows || []).map((row) => [row.rfq_request_id, row.requested_at])));
        setClosedMonthMap(
          Object.fromEntries(
            (payload.closures || []).map((row) => [getMonthKey(row.settlement_year, row.settlement_month), row.closed_at])
          )
        );
      } catch (error) {
        console.error("Failed to load fee settlement metadata:", error);
      }
    };

    void fetchFeeMeta();
  }, [view]);

  const invoiceRecords = useMemo<InvoiceRecord[]>(
    () =>
      requests
        .filter((request) => {
          if (view === "transactions") {
            return TRANSACTION_VISIBLE_STATUSES.has(request.status);
          }
          return request.status === "fulfilled";
        })
        .map((request) => {
          const gross = Number(request.total_price || 0);
          const storedFee = Number(request.commission_amount);
          const storedNet = Number(request.settlement_amount);
          const rate = Number(request.commission_rate_percent || commissionRatePercent);
          const fee = Number.isFinite(storedFee) && storedFee > 0 ? storedFee : gross * (rate / 100);
          const net = Number.isFinite(storedNet) && storedNet > 0 ? storedNet : gross - fee;

          return {
            id: request.id,
            invoiceNumber: createInvoiceNumber(request),
            request,
            completedAt: request.commission_locked_at?.trim() || request.updated_at || request.created_at,
            settledAt: request.is_settled ? request.settled_at?.trim() || request.commission_locked_at?.trim() || request.updated_at || request.created_at : null,
            requestedAt: requestedAtMap[request.id] || request.manufacturer_settlement_requested_at?.trim() || null,
            gross,
            commissionRatePercent: rate,
            fee,
            net,
          };
        })
        .sort((a, b) => new Date((b.settledAt || b.completedAt) ?? b.completedAt).getTime() - new Date((a.settledAt || a.completedAt) ?? a.completedAt).getTime()),
    [commissionRatePercent, requests, requestedAtMap, view]
  );

  const settlementHistoryRecords = useMemo(() => invoiceRecords.filter((record) => record.request.is_settled), [invoiceRecords]);
  const transactionSummaryRecords = useMemo(() => invoiceRecords.filter((record) => record.request.status === "fulfilled"), [invoiceRecords]);

  const filteredRecords = useMemo(() => {
    const source = view === "settlements" ? settlementHistoryRecords : invoiceRecords;
    const query = invoiceQuery.trim().toLowerCase();

    return source.filter((record) => {
      const baseDate = view === "settlements" ? record.settledAt || record.completedAt : record.completedAt;
      const baseMonth = baseDate.slice(0, 7);
      const currencyCode = (record.request.currency_code || "USD").toUpperCase();
      const matchesMonth = !monthFilter || baseMonth === monthFilter;
      const matchesCurrency = selectedCurrency === "ALL" || currencyCode === selectedCurrency;
      const matchesQuery =
        !query ||
        record.invoiceNumber.toLowerCase().includes(query) ||
        record.request.contact_name.toLowerCase().includes(query) ||
        record.request.product_name.toLowerCase().includes(query);

      return matchesMonth && matchesCurrency && matchesQuery;
    });
  }, [invoiceQuery, invoiceRecords, monthFilter, selectedCurrency, settlementHistoryRecords, view]);

  const currencyOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(invoiceRecords.map((record) => (record.request.currency_code || "USD").toUpperCase())))],
    [invoiceRecords]
  );

  const summaryCards = useMemo<CurrencySummary[]>(() => {
    const summarySource = transactionSummaryRecords.filter((record) => {
      const baseMonth = record.completedAt.slice(0, 7);
      const currencyCode = (record.request.currency_code || "USD").toUpperCase();
      const query = invoiceQuery.trim().toLowerCase();
      const matchesMonth = !monthFilter || baseMonth === monthFilter;
      const matchesCurrency = selectedCurrency === "ALL" || currencyCode === selectedCurrency;
      const matchesQuery =
        !query ||
        record.invoiceNumber.toLowerCase().includes(query) ||
        record.request.contact_name.toLowerCase().includes(query) ||
        record.request.product_name.toLowerCase().includes(query);

      return matchesMonth && matchesCurrency && matchesQuery;
    });

    const grouped = summarySource.reduce<Record<string, CurrencySummary>>((acc, record) => {
      const currencyCode = (record.request.currency_code || "USD").toUpperCase();
      if (!acc[currencyCode]) {
        acc[currencyCode] = { currencyCode, gross: 0, fee: 0, net: 0 };
      }

      acc[currencyCode].gross += record.gross;
      acc[currencyCode].fee += record.fee;
      acc[currencyCode].net += record.net;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [invoiceQuery, monthFilter, selectedCurrency, transactionSummaryRecords]);

  const summaryMetricCards = useMemo<SummaryMetricCard[]>(
    () =>
      summaryCards.flatMap((card) => [
        { key: `${card.currencyCode}-gross`, label: `${card.currencyCode} 총 매출`, value: card.gross, currencyCode: card.currencyCode, color: "text-[#111827]" },
        { key: `${card.currencyCode}-fee`, label: `${card.currencyCode} 수수료`, value: card.fee, currencyCode: card.currencyCode, color: "text-[#ff4d4f]" },
        { key: `${card.currencyCode}-net`, label: `${card.currencyCode} 정산 금액`, value: card.net, currencyCode: card.currencyCode, color: "text-[#2563eb]" },
      ]),
    [summaryCards]
  );

  const selectedFeeMonthKey = getMonthKey(currentYear, selectedFeeMonth);

  const feeMonthRecords = useMemo(
    () => transactionSummaryRecords.filter((record) => getEffectiveFeeMonthKeyFromMap(record.completedAt, closedMonthMap) === selectedFeeMonthKey),
    [closedMonthMap, selectedFeeMonthKey, transactionSummaryRecords]
  );

  const feeMonthRequestableRecords = useMemo(
    () => feeMonthRecords.filter((record) => !record.request.is_settled && !record.requestedAt),
    [feeMonthRecords]
  );

  const feeSummaryCards = useMemo<CurrencySummary[]>(() => {
    const grouped = feeMonthRecords.reduce<Record<string, CurrencySummary>>((acc, record) => {
      const currencyCode = (record.request.currency_code || "USD").toUpperCase();
      if (!acc[currencyCode]) {
        acc[currencyCode] = { currencyCode, gross: 0, fee: 0, net: 0 };
      }

      acc[currencyCode].gross += record.gross;
      acc[currencyCode].fee += record.fee;
      acc[currencyCode].net += record.net;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [feeMonthRecords]);

  const feeMetricCards = useMemo<SummaryMetricCard[]>(
    () =>
      feeSummaryCards.flatMap((card) => [
        { key: `${card.currencyCode}-fee-gross`, label: `${card.currencyCode} 총 매출`, value: card.gross, currencyCode: card.currencyCode, color: "text-[#111827]" },
        { key: `${card.currencyCode}-fee-fee`, label: `${card.currencyCode} 수수료`, value: card.fee, currencyCode: card.currencyCode, color: "text-[#ff4d4f]" },
      ]),
    [feeSummaryCards]
  );

  const feeMonthSummary = useMemo(
    () =>
      feeMonthRecords.reduce(
        (acc, record) => {
          acc.fee += record.fee;
          return acc;
        },
        { fee: 0 }
      ),
    [feeMonthRecords]
  );

  const feeCurrencyCode = feeMonthRecords[0]?.request.currency_code || "USD";
  const feeMonthClosed = Boolean(closedMonthMap[selectedFeeMonthKey]);
  const feeMonthRequestable = feeMonthRequestableRecords.length > 0 && !feeMonthClosed;
  const feeRequestAmountLabel = `${selectedFeeMonth}월 수수료 ${formatCurrencyDisplay(feeMonthSummary.fee, feeCurrencyCode)}`;

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const pagedRecords = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRecords, visiblePage]);

  const feeTotalPages = Math.max(1, Math.ceil(feeMonthRecords.length / PAGE_SIZE));
  const visibleFeePage = Math.min(feePage, feeTotalPages);
  const pagedFeeRecords = useMemo(() => {
    const startIndex = (visibleFeePage - 1) * PAGE_SIZE;
    return feeMonthRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [feeMonthRecords, visibleFeePage]);

  useEffect(() => {
    setFeePage(1);
  }, [selectedFeeMonth]);

  const handleDownloadCsv = () => {
    const headers =
      view === "settlements"
        ? ["정산일", "의뢰자", "상품", "총 매출", "수수료", "정산 금액", "통화", "인보이스"]
        : ["거래일", "의뢰자", "상품", "수량", "금액", "수수료", "정산", "통화", "인보이스"];

    const rows = filteredRecords.map((record) =>
      (
        view === "settlements"
          ? [
            formatShortDate(record.settledAt || record.completedAt),
            record.request.contact_name,
            record.request.product_name,
            formatCurrencyDisplay(record.gross, record.request.currency_code),
            formatCurrencyDisplay(record.fee, record.request.currency_code),
            formatCurrencyDisplay(record.net, record.request.currency_code),
            (record.request.currency_code || "USD").toUpperCase(),
            record.invoiceNumber,
          ]
          : [
            formatShortDate(record.completedAt),
            record.request.contact_name,
            record.request.product_name,
            `${record.request.quantity.toLocaleString()}개`,
            formatCurrencyDisplay(record.gross, record.request.currency_code),
            formatCurrencyDisplay(record.fee, record.request.currency_code),
            formatCurrencyDisplay(record.net, record.request.currency_code),
            (record.request.currency_code || "USD").toUpperCase(),
            record.invoiceNumber,
          ]
      ).map(csvEscape)
    );

    const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${view === "settlements" ? "manufacturer_settlements" : "manufacturer_transactions"}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmFeeSettlement = async () => {
    const shouldProceed = window.confirm(`${feeRequestAmountLabel}를 정산완료 처리하시겠습니까?`);
    if (!shouldProceed) {
      return;
    }

    setRequestSubmitting(true);

    try {
      const fallbackRequestedAt = new Date().toISOString();
      const response = await authFetch("/api/manufacturer/fee-settlements", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: currentYear,
          month: selectedFeeMonth,
        }),
      });

      const payload = (await response.json()) as { error?: string; requestedAt?: string };
      if (!response.ok) {
        throw new Error(payload.error || "수수료 정산 요청에 실패했습니다.");
      }

      if (onRequestsRefresh) {
        await onRequestsRefresh();
      }

      const requestedAt = payload.requestedAt || fallbackRequestedAt;

      setRequestedAtMap((prev) => {
        const next = { ...prev };
        for (const record of feeMonthRequestableRecords) {
          next[record.id] = requestedAt;
        }
        return next;
      });
      setClosedMonthMap((prev) => ({
        ...prev,
        [selectedFeeMonthKey]: requestedAt,
      }));
      window.alert("정산완료");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "수수료 정산 요청에 실패했습니다.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (view === "fees") {
    return (
      <>
        <div className="flex-1 overflow-y-auto bg-[#f6f8fb] p-4 lg:p-5">
          <div className="flex w-full max-w-[1600px] flex-col gap-4">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-[#1f2937]">수수료 내역</h2>
              <p className="mt-1 text-[13px] text-[#667085]">거래별 확정 수수료 내역입니다.</p>
            </div>

            <section className="rounded-[20px] border border-[#d8e9ff] bg-[#eff5ff] px-5 py-4 text-[#2f6bff] shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white/80 p-1.5">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-extrabold">수수료 정산 안내</p>
                  <p className="mt-1.5 text-[13px] font-medium">
                    매월 1일 ~ 말일까지의 수수료를 다음 달 3일 이내에 두고커넥트 계좌로 입금해주세요. 구매 확정 완료 시 총 거래 금액의 수수료로 부과됩니다.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-sm">
              <p className="text-[13px] font-bold text-[#667085]">월별 조회</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
                {MONTH_NAMES.map((month) => {
                  const monthKey = getMonthKey(currentYear, month);
                  const monthRecords = transactionSummaryRecords.filter((record) => getEffectiveFeeMonthKeyFromMap(record.completedAt, closedMonthMap) === monthKey);
                  const isSelected = selectedFeeMonth === month;
                  const isClosed = Boolean(closedMonthMap[monthKey]);

                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => setSelectedFeeMonth(month)}
                      className={`relative rounded-[16px] border px-4 py-3 text-center text-[15px] font-bold transition ${isSelected
                          ? "border-[#2563eb] bg-[#2563eb] text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)]"
                          : isClosed
                            ? "border-[#b7f0ca] bg-[#effaf4] text-[#16a34a]"
                            : "border-[#f1f5f9] bg-[#f8fafc] text-[#98a2b3]"
                        }`}
                    >
                      {isClosed ? (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#03c75a] p-1 text-white">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                      <div>{month}월</div>
                      <div className={`mt-1 text-[11px] font-semibold ${isSelected ? "text-white/85" : isClosed ? "text-[#16a34a]" : "text-[#98a2b3]"}`}>
                        {monthRecords.length}건
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`grid gap-3 ${feeMetricCards.length >= 4 ? "xl:grid-cols-4" : feeMetricCards.length === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
              {feeMetricCards.length ? (
                feeMetricCards.map((card) => (
                  <article key={card.key} className="rounded-[20px] border border-[#e5e7eb] bg-white px-5 py-5 text-center shadow-sm">
                    <p className="text-[13px] font-semibold text-[#8b95a1]">{card.label}</p>
                    <p className={`mt-2.5 text-[24px] font-bold ${card.color}`}>{formatCurrencyDisplay(card.value, card.currencyCode)}</p>
                  </article>
                ))
              ) : (
                <article className="rounded-[20px] border border-dashed border-[#dbe3ef] bg-white px-5 py-10 text-center text-[14px] font-medium text-[#98a2b3] xl:col-span-3">
                  선택한 월의 수수료 요약이 없습니다.
                </article>
              )}

              <article className="rounded-[20px] border border-[#e5e7eb] bg-white px-5 py-5 text-center shadow-sm">
                <p className="text-[13px] font-semibold text-[#8b95a1]">정산 상태</p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      void handleConfirmFeeSettlement();
                    }}
                    disabled={!feeMonthRequestable || requestSubmitting}
                    className={`inline-flex rounded-full px-6 py-2.5 text-[13px] font-bold transition ${feeMonthClosed
                        ? "bg-[#03c75a] text-white"
                        : feeMonthRequestable
                          ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                          : "bg-[#e5e7eb] text-[#98a2b3]"
                      } disabled:cursor-not-allowed disabled:opacity-80`}
                  >
                    {feeMonthClosed ? "정산완료" : "이번달 정산완료"}
                  </button>
                </div>
              </article>
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[#e5e7eb] bg-white shadow-sm">
              <div className="border-b border-[#f1f5f9] px-5 py-4">
                <h3 className="text-[17px] font-bold text-[#1f2937]">{selectedFeeMonth}월 거래별 수수료 내역</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1080px] w-full table-fixed">
                  <thead className="bg-[#fbfcfd] text-[11px] font-semibold text-[#667085]">
                    <tr>
                      <th className="w-[130px] px-5 py-3 text-left">날짜</th>
                      <th className="px-4 py-3 text-left">거래 내역</th>
                      <th className="w-[160px] px-4 py-3 text-right">매출 금액</th>
                      <th className="w-[160px] px-4 py-3 text-right">수수료</th>
                      <th className="w-[140px] px-5 py-3 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f4f6] text-[12px] text-[#111827]">
                    {pagedFeeRecords.length ? (
                      pagedFeeRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="px-5 py-3.5 font-medium text-[#4b5563]">{formatShortDate(record.completedAt)}</td>
                          <td className="px-4 py-3.5 font-semibold text-[#1f2937]">{record.request.product_name}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-[#1f2937]">{formatCurrencyDisplay(record.gross, record.request.currency_code)}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-[#ff4d4f]">
                            <div className="flex flex-col items-end gap-0">
                              <span>{formatCurrencyDisplay(record.fee, record.request.currency_code)}</span>
                              <span className="text-[10px] font-medium text-[#98a2b3]">({record.commissionRatePercent}% 적용)</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${record.request.is_settled
                                  ? "bg-[#dcfce7] text-[#16a34a]"
                                  : record.requestedAt
                                    ? "bg-[#ecfdf3] text-[#027a48]"
                                    : "bg-[#f3f4f6] text-[#6b7280]"
                                }`}
                            >
                              {record.request.is_settled ? "최종정산완료" : record.requestedAt ? "정산요청완료" : "정산대기"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-14 text-center text-[13px] font-medium text-[#98a2b3]">
                          선택한 월의 수수료 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {feeMonthRecords.length > PAGE_SIZE ? (
                <MasterTablePagination
                  totalItems={feeMonthRecords.length}
                  currentPage={visibleFeePage}
                  totalPages={feeTotalPages}
                  onPageChange={setFeePage}
                />
              ) : null}
            </section>
          </div>
        </div>

        <ClientQuotePreviewModal
          request={quotePreviewRequest}
          open={Boolean(quotePreviewRequest)}
          onClose={() => setQuotePreviewRequest(null)}
        />
      </>
    );
  }

  if (view === "settlements") {
    return (
      <>
        <div className="flex-1 overflow-y-auto bg-[#f6f8fb] p-4 lg:p-5">
          <div className="flex w-full max-w-[1600px] flex-col gap-4">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-[#1f2937]">정산 내역</h2>
              <p className="mt-1 text-[13px] text-[#667085]">정산 완료된 주문 내역입니다.</p>
            </div>

            <div className="flex flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-[#667085]">기간</span>
                  <div className="flex h-10 min-w-[200px] items-center gap-3 rounded-[12px] border border-[#dbe3ef] bg-white px-3.5">
                    <input
                      type="month"
                      value={monthFilter}
                      onChange={(event) => {
                        setMonthFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-transparent text-[13px] font-semibold text-[#111827] outline-none"
                    />
                    <Calendar className="h-4 w-4 text-[#111827]" />
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-[#667085]">통화</span>
                  <select
                    value={selectedCurrency}
                    onChange={(event) => {
                      setSelectedCurrency(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-10 min-w-[130px] rounded-[12px] border border-[#dbe3ef] bg-white px-3.5 text-[13px] font-semibold text-[#111827] outline-none"
                  >
                    {currencyOptions.map((currencyCode) => (
                      <option key={currencyCode} value={currencyCode}>
                        {currencyCode === "ALL" ? "전체 통화" : currencyCode}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-[#667085]">검색</span>
                  <div className="flex h-10 min-w-[250px] items-center gap-3 rounded-[12px] border border-[#dbe3ef] bg-white px-3.5">
                    <Search className="h-4 w-4 text-[#98a2b3]" />
                    <input
                      type="text"
                      value={invoiceQuery}
                      onChange={(event) => {
                        setInvoiceQuery(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="인보이스 번호"
                      className="w-full bg-transparent text-[13px] text-[#111827] outline-none"
                    />
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-[12px] border border-[#dbe3ef] bg-white px-4 text-[13px] font-semibold text-[#111827] transition hover:bg-[#f8fafc] lg:self-auto"
              >
                <Download className="h-4 w-4" />
                엑셀 다운로드
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {pagedRecords.length ? (
                pagedRecords.map((record) => (
                  <article key={record.id} className="rounded-[14px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#16a34a]">정산 완료</span>
                          <span className="text-[11px] text-[#94a3b8]">{formatShortDate(record.settledAt || record.completedAt)}</span>
                        </div>
                        <h3 className="mt-2 text-[15px] font-bold tracking-[-0.02em] text-[#1f2937]">{record.request.product_name}</h3>
                        <p className="mt-1 text-[13px] font-medium text-[#667085]">
                          의뢰자 {record.request.contact_name} · {record.request.quantity.toLocaleString()}개
                        </p>
                        <button
                          type="button"
                          onClick={() => setQuotePreviewRequest(record.request)}
                          className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]"
                        >
                          <FileText className="h-4 w-4" />
                          {record.invoiceNumber}
                        </button>
                      </div>

                      <div className="min-w-[220px] text-right">
                        <p className="text-[11px] text-[#94a3b8]">총 매출</p>
                        <p className="mt-1.5 text-[15px] font-bold text-[#1f2937]">{formatCurrencyDisplay(record.gross, record.request.currency_code)}</p>
                        <p className="mt-2 text-[12px] font-semibold text-[#ff4d4f]">수수료 -{formatCurrencyDisplay(record.fee, record.request.currency_code)}</p>
                        <p className="mt-1 text-[11px] font-medium text-[#98a2b3]">{record.commissionRatePercent}% 적용</p>
                        <p className="mt-2 text-[17px] font-bold text-[#2563eb]">{formatCurrencyDisplay(record.net, record.request.currency_code)}</p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[14px] border border-dashed border-[#dbe3ef] bg-white px-6 py-16 text-center text-[14px] font-medium text-[#98a2b3]">
                  표시할 정산 내역이 없습니다.
                </div>
              )}
            </div>

            {filteredRecords.length > PAGE_SIZE ? (
              <div className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
                <MasterTablePagination
                  totalItems={filteredRecords.length}
                  currentPage={visiblePage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            ) : null}
          </div>
        </div>

        <ClientQuotePreviewModal
          request={quotePreviewRequest}
          open={Boolean(quotePreviewRequest)}
          onClose={() => setQuotePreviewRequest(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[#f6f8fb] p-4 lg:p-5">
        <div className="flex w-full max-w-[1600px] flex-col gap-4">
          <div>
            <h2 className="text-[19px] font-bold tracking-tight text-[#1f2937]">거래 내역</h2>
            <p className="mt-1 text-[13px] text-[#667085]">완료된 거래 기준 매출 및 정산 정보입니다.</p>
          </div>

          <div className="flex flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[#667085]">기간</span>
                <div className="flex h-10 min-w-[200px] items-center gap-3 rounded-[12px] border border-[#dbe3ef] bg-white px-3.5">
                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(event) => {
                      setMonthFilter(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-transparent text-[13px] font-semibold text-[#111827] outline-none"
                  />
                  <Calendar className="h-4 w-4 text-[#111827]" />
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[#667085]">통화</span>
                <select
                  value={selectedCurrency}
                  onChange={(event) => {
                    setSelectedCurrency(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 min-w-[130px] rounded-[12px] border border-[#dbe3ef] bg-white px-3.5 text-[13px] font-semibold text-[#111827] outline-none"
                >
                  {currencyOptions.map((currencyCode) => (
                    <option key={currencyCode} value={currencyCode}>
                      {currencyCode === "ALL" ? "전체 통화" : currencyCode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[#667085]">검색</span>
                <div className="flex h-10 min-w-[250px] items-center gap-3 rounded-[12px] border border-[#dbe3ef] bg-white px-3.5">
                  <Search className="h-4 w-4 text-[#98a2b3]" />
                  <input
                    type="text"
                    value={invoiceQuery}
                    onChange={(event) => {
                      setInvoiceQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="인보이스 번호"
                    className="w-full bg-transparent text-[13px] text-[#111827] outline-none"
                  />
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-[12px] border border-[#dbe3ef] bg-white px-4 text-[13px] font-semibold text-[#111827] transition hover:bg-[#f8fafc] lg:self-auto"
            >
              <Download className="h-4 w-4" />
              엑셀 다운로드
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {summaryMetricCards.length ? (
              summaryMetricCards.map((card) => (
                <div key={card.key} className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 text-center shadow-sm">
                  <p className="text-[13px] font-semibold text-[#8b95a1]">{card.label}</p>
                  <p className={`mt-2.5 text-[22px] font-bold ${card.color}`}>{formatCurrencyDisplay(card.value, card.currencyCode)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[14px] border border-dashed border-[#dbe3ef] bg-white px-6 py-12 text-center text-[14px] font-medium text-[#98a2b3] lg:col-span-3">
                표시할 거래 요약이 없습니다.
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] table-fixed border-collapse text-left">
                <thead className="bg-[#fbfcfd] text-[11px] font-semibold text-[#667085]">
                  <tr>
                    <th className="w-[110px] px-4 py-2.5 text-left">날짜</th>
                    <th className="w-[120px] px-4 py-2.5 text-left">의뢰자</th>
                    <th className="w-[230px] px-4 py-2.5 text-left">상품</th>
                    <th className="w-[80px] px-4 py-2.5 text-center">수량</th>
                    <th className="w-[145px] px-4 py-2.5 text-right">금액</th>
                    <th className="w-[150px] px-4 py-2.5 text-right">수수료</th>
                    <th className="w-[150px] px-4 py-2.5 text-right">정산</th>
                    <th className="w-[100px] px-4 py-2.5 text-center">상태</th>
                    <th className="w-[150px] px-4 py-2.5 text-left">인보이스</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] text-[12px] text-[#111827]">
                  {pagedRecords.length ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="transition-colors hover:bg-[#fcfdff]">
                        <td className="px-4 py-3 text-left font-medium text-[#4b5563]">{formatShortDate(record.completedAt)}</td>
                        <td className="px-4 py-3 text-left font-bold text-[#111827]">{record.request.contact_name}</td>
                        <td className="px-4 py-3 text-left">
                          <span className="block truncate font-medium text-[#4b5563]" title={record.request.product_name}>
                            {record.request.product_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-[#4b5563]">{record.request.quantity.toLocaleString()}개</td>
                        <td className="px-4 py-3 text-right font-bold text-[#111827]">{formatCurrencyDisplay(record.gross, record.request.currency_code)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#ff4d4f]">
                          <div className="flex flex-col items-end gap-0">
                            <span>{formatCurrencyDisplay(record.fee, record.request.currency_code)}</span>
                            <span className="text-[10px] font-medium text-[#98a2b3]">({record.commissionRatePercent}% 적용)</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#2563eb]">{formatCurrencyDisplay(record.net, record.request.currency_code)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getTransactionStatusTone(record.request.status)}`}>
                            {getTransactionStatusLabel(record.request.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => setQuotePreviewRequest(record.request)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]"
                          >
                            <FileText className="h-3 w-3" />
                            {record.invoiceNumber}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-[13px] font-medium text-[#98a2b3]">
                        표시할 거래 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredRecords.length > PAGE_SIZE ? (
              <MasterTablePagination
                totalItems={filteredRecords.length}
                currentPage={visiblePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            ) : null}
          </div>
        </div>
      </div>

      <ClientQuotePreviewModal
        request={quotePreviewRequest}
        open={Boolean(quotePreviewRequest)}
        onClose={() => setQuotePreviewRequest(null)}
      />
    </>
  );
}
