"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Search,
  X,
} from "lucide-react";
import {
  formatRfqCurrency,
  formatRfqDate,
  formatRfqDateTime,
  getDisplayOrderNumber,
  type RfqRequestRow,
} from "@/lib/rfq";
import { ClientQuotePreviewModal } from "./ClientQuotePreviewModal";

interface ClientPaymentManagementProps {
  requests: RfqRequestRow[];
}

type PaymentStatus = "pending" | "paid";
type SortDirection = "asc" | "desc";
type SortKey =
  | "display_number"
  | "created_at"
  | "product_name"
  | "manufacturer_name"
  | "quantity"
  | "total_price"
  | "payment_method"
  | "payment_status";

type PaymentRecord = {
  id: string;
  request: RfqRequestRow;
  displayNumber: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  invoiceLabel: string;
};

const PAYMENT_STATUSES: PaymentStatus[] = ["paid"];
const currencyCardClasses = ["from-[#2563eb] to-[#1d4ed8]", "from-[#16a34a] to-[#059669]", "from-[#7c3aed] to-[#6d28d9]"];

const PAID_REQUEST_STATUSES = new Set([
  "payment_completed",
  "production_waiting",
  "production_started",
  "ordered",
  "production_in_progress",
  "manufacturing_completed",
  "completed",
  "delivery_completed",
  "fulfilled",
]);

const getPaymentStatus = (request: RfqRequestRow): PaymentStatus => {
  if (PAID_REQUEST_STATUSES.has(request.status)) {
    return "paid";
  }
  return "pending";
};

const getPaymentStatusLabel = (status: PaymentStatus) => (status === "paid" ? "결제 완료" : "결제 대기");

const getPaymentStatusTone = (status: PaymentStatus) =>
  status === "paid" ? "bg-[#ecfdf3] text-[#15803d]" : "bg-[#eff6ff] text-[#2563eb]";

const getPaymentMethod = (request: RfqRequestRow) => ((request.currency_code || "USD") === "KRW" ? "PortOne" : "Utransfer");

const csvEscape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export function ClientPaymentManagement({ requests }: ClientPaymentManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [quotePreviewRequest, setQuotePreviewRequest] = useState<RfqRequestRow | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "created_at",
    direction: "desc",
  });

  const paymentRecords = useMemo<PaymentRecord[]>(
    () =>
      requests
        .filter((request) => PAID_REQUEST_STATUSES.has(request.status))
        .map((request) => ({
          id: request.id,
          request,
          displayNumber: getDisplayOrderNumber(request),
          paymentStatus: getPaymentStatus(request),
          paymentMethod: getPaymentMethod(request),
          invoiceLabel: "PDF",
        })),
    [requests]
  );

  const filteredRecords = useMemo(() => {
    const filtered = paymentRecords.filter((record) => {
      const query = searchQuery.trim().toLowerCase();
      const requestDate = new Date(record.request.created_at).toISOString().split("T")[0];
      const matchesSearch =
        !query ||
        record.displayNumber.toLowerCase().includes(query) ||
        record.request.product_name.toLowerCase().includes(query) ||
        record.request.manufacturer_name.toLowerCase().includes(query) ||
        record.request.brand_name.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || record.paymentStatus === statusFilter;
      const matchesDate = (!startDate || requestDate >= startDate) && (!endDate || requestDate <= endDate);
      return matchesSearch && matchesStatus && matchesDate;
    });

    return [...filtered].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortConfig.key) {
        case "display_number":
          aValue = a.displayNumber;
          bValue = b.displayNumber;
          break;
        case "created_at":
          aValue = new Date(a.request.created_at).getTime();
          bValue = new Date(b.request.created_at).getTime();
          break;
        case "product_name":
          aValue = a.request.product_name;
          bValue = b.request.product_name;
          break;
        case "manufacturer_name":
          aValue = a.request.manufacturer_name;
          bValue = b.request.manufacturer_name;
          break;
        case "quantity":
          aValue = a.request.quantity;
          bValue = b.request.quantity;
          break;
        case "total_price":
          aValue = Number(a.request.total_price || 0);
          bValue = Number(b.request.total_price || 0);
          break;
        case "payment_method":
          aValue = a.paymentMethod;
          bValue = b.paymentMethod;
          break;
        case "payment_status":
          aValue = a.paymentStatus;
          bValue = b.paymentStatus;
          break;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [endDate, paymentRecords, searchQuery, sortConfig, startDate, statusFilter]);

  const currencySummaries = useMemo(() => {
    const grouped = paymentRecords.reduce<Record<string, { total: number; count: number; method: string }>>((acc, record) => {
      const currencyCode = record.request.currency_code || "USD";
      if (!acc[currencyCode]) {
        acc[currencyCode] = { total: 0, count: 0, method: record.paymentMethod };
      }
      acc[currencyCode].total += Number(record.request.total_price || 0);
      acc[currencyCode].count += 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([currencyCode, summary], index) => ({
      currencyCode,
      total: summary.total,
      count: summary.count,
      method: summary.method,
      gradientClass: currencyCardClasses[index % currencyCardClasses.length],
    }));
  }, [paymentRecords]);

  const handleDownloadCsv = () => {
    const headers = [
      "거래번호",
      "날짜",
      "브랜드명",
      "제품명",
      "제조사",
      "수량",
      "결제금액",
      "통화",
      "결제방식",
      "결제상태",
      "담당자",
      "이메일",
      "연락처",
    ];

    const rows = filteredRecords.map((record) =>
      [
        record.displayNumber,
        formatRfqDateTime(record.request.created_at),
        record.request.brand_name,
        record.request.product_name,
        record.request.manufacturer_name,
        record.request.quantity,
        Number(record.request.total_price || 0),
        record.request.currency_code || "USD",
        record.paymentMethod,
        getPaymentStatusLabel(record.paymentStatus),
        record.request.contact_name,
        record.request.contact_email,
        record.request.contact_phone,
      ].map(csvEscape)
    );

    const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `client_payments_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 text-[#0064ff]" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-[#0064ff]" />
    );
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden bg-[#f7f8fa] p-6">
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5">
          <div>
            <h2 className="text-[24px] font-bold tracking-tight text-[#191f28]">결제 내역</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {currencySummaries.length ? (
              currencySummaries.map((summary) => (
                <div
                  key={summary.currencyCode}
                  className={`rounded-[20px] bg-gradient-to-r ${summary.gradientClass} px-5 py-6 text-white shadow-[0_10px_30px_rgba(37,99,235,0.16)]`}
                >
                  <p className="text-[14px] font-bold uppercase tracking-wide">
                    {summary.currencyCode} 총 결제금액
                  </p>
                  <p className="mt-3 text-[24px] font-black">{formatRfqCurrency(summary.total, summary.currencyCode)}</p>
                  <p className="mt-2 text-[13px] font-medium text-white/80">
                    {summary.method} 기준 | {summary.count.toLocaleString()}건
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#d7dde7] bg-white px-6 py-10 text-center text-[14px] text-[#98a2b3] lg:col-span-2">
                표시할 결제 내역이 없습니다.
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] border border-[#e5e8eb] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#f2f4f6] px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b95a1]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="제품명, 제조사, 거래번호 검색..."
                    className="h-12 w-full rounded-[14px] border border-[#e5e8eb] bg-[#f8fafc] pl-11 pr-4 text-[14px] outline-none transition-colors focus:border-[#0064ff]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#dbe3ef] bg-white px-5 text-[14px] font-bold text-[#4e5968] transition-colors hover:bg-[#f8fafc]"
                >
                  <Download className="h-4 w-4" />
                  CSV (다운로드)
                </button>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-[#e5e8eb] bg-[#f8fafc] px-3">
                  <Calendar className="h-4 w-4 text-[#8b95a1]" />
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-[13px] text-[#4e5968] outline-none"
                    />
                    <span className="font-medium text-[#8b95a1]">~</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-[13px] text-[#4e5968] outline-none"
                    />
                  </div>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
                  className="h-11 min-w-[160px] rounded-xl border border-[#e5e8eb] bg-white px-4 text-[14px] font-bold text-[#4e5968] outline-none transition-colors focus:border-[#0064ff]"
                >
                  <option value="all">전체 상태</option>
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {getPaymentStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[1280px] table-fixed border-collapse">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-[#8b95a1]">
                    <th className="w-[120px] cursor-pointer px-6 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("display_number")}>
                      <div className="flex items-center">거래번호 {renderSortIcon("display_number")}</div>
                    </th>
                    <th className="w-[130px] cursor-pointer px-4 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("created_at")}>
                      <div className="flex items-center">날짜 {renderSortIcon("created_at")}</div>
                    </th>
                    <th className="w-[280px] cursor-pointer px-4 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("product_name")}>
                      <div className="flex items-center">제품명 {renderSortIcon("product_name")}</div>
                    </th>
                    <th className="w-[170px] cursor-pointer px-4 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("manufacturer_name")}>
                      <div className="flex items-center">제조사 {renderSortIcon("manufacturer_name")}</div>
                    </th>
                    <th className="w-[100px] cursor-pointer px-4 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("quantity")}>
                      <div className="flex items-center">수량 {renderSortIcon("quantity")}</div>
                    </th>
                    <th className="w-[170px] cursor-pointer px-4 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("total_price")}>
                      <div className="flex items-center">결제금액 {renderSortIcon("total_price")}</div>
                    </th>
                    <th className="w-[140px] cursor-pointer px-4 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("payment_method")}>
                      <div className="flex items-center">결제방식 {renderSortIcon("payment_method")}</div>
                    </th>
                    <th className="w-[120px] cursor-pointer px-4 py-4 hover:bg-[#f9fafb]" onClick={() => requestSort("payment_status")}>
                      <div className="flex items-center">상태 {renderSortIcon("payment_status")}</div>
                    </th>
                    <th className="w-[120px] px-4 py-4">인보이스</th>
                    <th className="w-[160px] px-6 py-4">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6]">
                  {filteredRecords.length ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="align-middle transition-colors hover:bg-[#fcfdff]">
                        <td className="px-6 py-5 font-mono text-[12px] font-bold text-[#8b95a1]">{record.displayNumber}</td>
                        <td className="px-4 py-5 text-[13px] font-medium text-[#667085]">{formatRfqDate(record.request.created_at)}</td>
                        <td className="px-4 py-5">
                          <span className="block truncate text-[14px] font-bold text-[#191f28]" title={record.request.product_name}>
                            {record.request.product_name}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-[13px] font-medium text-[#667085]">{record.request.manufacturer_name}</td>
                        <td className="px-4 py-5 text-[14px] font-bold text-[#191f28]">{record.request.quantity.toLocaleString()}</td>
                        <td className="px-4 py-5 text-[14px] font-bold text-[#0064ff]">
                          {formatRfqCurrency(record.request.total_price, record.request.currency_code)}
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${record.paymentMethod === "PortOne" ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#e0e7ff] text-[#2563eb]"
                              }`}
                          >
                            {record.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${getPaymentStatusTone(record.paymentStatus)}`}>
                            {getPaymentStatusLabel(record.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <button
                            type="button"
                            onClick={() => setQuotePreviewRequest(record.request)}
                            className="inline-flex rounded-lg bg-[#f3f4f6] px-3 py-1.5 text-[11px] font-bold text-[#4b5563] transition hover:bg-[#e5e7eb]"
                          >
                            {record.invoiceLabel}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#dbe3ef] bg-white px-4 py-2 text-[13px] font-bold text-[#4e5968] transition hover:bg-[#f8fafc]"
                          >
                            <FileText className="h-4 w-4" />
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-8 py-28 text-center">
                        <div className="flex flex-col items-center">
                          <Search className="mb-4 h-10 w-10 text-[#e5e8eb]" />
                          <p className="text-[15px] font-bold text-[#8b95a1]">조건에 맞는 결제 내역이 없습니다.</p>
                          <p className="mt-1 text-[13px] text-[#adb5bd]">검색어나 날짜 조건을 조정해 보세요.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedRecord ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[920px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#eaecf0] px-6 py-5">
              <div>
                <h3 className="text-[18px] font-bold text-[#1f2937]">결제 내역 상세</h3>
                <p className="mt-1 text-[13px] text-[#667085]">{selectedRecord.displayNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-full p-1.5 text-[#667085] transition hover:bg-[#f2f4f7]"
                aria-label="결제 내역 상세 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "결제금액", value: formatRfqCurrency(selectedRecord.request.total_price, selectedRecord.request.currency_code), tone: "text-[#0064ff]" },
                  { label: "결제방식", value: selectedRecord.paymentMethod, tone: "text-[#15803d]" },
                  { label: "결제상태", value: getPaymentStatusLabel(selectedRecord.paymentStatus), tone: "text-[#191f28]" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[16px] border border-[#f2f4f6] bg-[#fbfcfd] px-5 py-4">
                    <p className="text-[12px] font-bold text-[#8b95a1]">{item.label}</p>
                    <p className={`mt-2 text-[20px] font-black ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 overflow-hidden rounded-[18px] border border-[#e7ecf3] bg-white">
                <table className="w-full border-collapse text-left text-[13px]">
                  <tbody>
                    {[
                      { label: "거래번호", value: selectedRecord.displayNumber },
                      { label: "RFQ 번호", value: selectedRecord.request.request_number },
                      { label: "주문번호", value: getDisplayOrderNumber(selectedRecord.request) },
                      { label: "결제일시", value: formatRfqDateTime(selectedRecord.request.updated_at || selectedRecord.request.created_at) },
                      { label: "요청일시", value: formatRfqDateTime(selectedRecord.request.created_at) },
                      { label: "브랜드명", value: selectedRecord.request.brand_name },
                      { label: "담당자", value: selectedRecord.request.contact_name },
                      { label: "이메일", value: selectedRecord.request.contact_email },
                      { label: "연락처", value: selectedRecord.request.contact_phone },
                      { label: "제조사", value: selectedRecord.request.manufacturer_name },
                      { label: "제품명", value: selectedRecord.request.product_name },
                      { label: "용기/포장", value: selectedRecord.request.container_name || "선택 없음" },
                      { label: "디자인", value: selectedRecord.request.design_summary || "기본 선택" },
                      { label: "수량", value: `${selectedRecord.request.quantity.toLocaleString()}개` },
                      { label: "단가", value: formatRfqCurrency(selectedRecord.request.unit_price, selectedRecord.request.currency_code) },
                      { label: "총 결제금액", value: formatRfqCurrency(selectedRecord.request.total_price, selectedRecord.request.currency_code) },
                      { label: "통화", value: selectedRecord.request.currency_code || "USD" },
                      { label: "진행상태", value: selectedRecord.request.status },
                      { label: "요청사항", value: selectedRecord.request.request_note?.trim() || "별도 요청사항 없음" },
                      { label: "첨부파일", value: selectedRecord.request.file_link?.trim() || "첨부 없음" },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-[#f2f4f6] last:border-none">
                        <td className="w-[180px] bg-[#f9fafb] px-5 py-4 font-bold text-[#4e5968]">{row.label}</td>
                        <td className="break-all px-5 py-4 font-medium text-[#191f28]">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ClientQuotePreviewModal
        request={quotePreviewRequest}
        open={Boolean(quotePreviewRequest)}
        onClose={() => setQuotePreviewRequest(null)}
      />
    </>
  );
}
