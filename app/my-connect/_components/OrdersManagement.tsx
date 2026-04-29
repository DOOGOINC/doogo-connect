"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Calendar, ChevronDown, ChevronUp, Download, Search } from "lucide-react";
import {
  formatRfqCurrency,
  formatRfqDateTime,
  getDisplayOrderNumber,
  RFQ_STATUS_LABELS,
  type RfqRequestRow,
  type RfqRequestStatus,
} from "@/lib/rfq";

interface OrdersManagementProps {
  requests: RfqRequestRow[];
  onStatusChange: (requestId: string, status: RfqRequestStatus) => Promise<void>;
  onAdminMemoChange: (requestId: string, adminMemo: string) => Promise<void>;
}

type SortKey = keyof RfqRequestRow | "display_number";
type SortDirection = "asc" | "desc";

const ORDER_STATUS_OPTIONS: Array<{ value: RfqRequestStatus; label: string }> = [
  { value: "reviewing", label: "결제 대기" },
  { value: "payment_completed", label: "결제 완료" },
  { value: "production_waiting", label: "생산 대기" },
  { value: "production_started", label: "제조 시작" },
  { value: "production_in_progress", label: "제조 진행중" },
  { value: "manufacturing_completed", label: "제조 완료" },
  { value: "delivery_completed", label: "납품 완료" },
  { value: "fulfilled", label: "거래 완료" },
  { value: "refunded", label: "환불" },
  { value: "rejected", label: "거절" },
];

const LEGACY_STATUS_OPTIONS: Array<{ value: RfqRequestStatus; label: string }> = [
  { value: "quoted", label: "생산 대기" },
  { value: "ordered", label: "제조 시작" },
  { value: "completed", label: "제조 완료" },
];

const ORDER_MANAGEMENT_STATUSES = new Set<RfqRequestStatus>([
  "reviewing",
  "payment_in_progress",
  "payment_completed",
  "production_waiting",
  "production_started",
  "production_in_progress",
  "manufacturing_completed",
  "delivery_completed",
  "fulfilled",
  "refunded",
  "rejected",
  "quoted",
  "ordered",
  "completed",
]);

const getOrderStatusLabel = (status: RfqRequestStatus) => {
  const option = [...ORDER_STATUS_OPTIONS, ...LEGACY_STATUS_OPTIONS].find((item) => item.value === status);
  return option?.label ?? RFQ_STATUS_LABELS[status];
};

const getVisibleStatusOptions = (currentStatus?: RfqRequestStatus) => {
  const options = [...ORDER_STATUS_OPTIONS];
  const legacyCurrent = LEGACY_STATUS_OPTIONS.find((option) => option.value === currentStatus);
  if (legacyCurrent) {
    options.splice(1, 0, legacyCurrent);
  }
  return options;
};

const csvEscape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

const normalizeSortValue = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
};

const isEditableStatusOption = (currentStatus: RfqRequestStatus, nextStatus: RfqRequestStatus) => {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (currentStatus === "fulfilled" || currentStatus === "refunded") {
    return false;
  }

  if (currentStatus === "reviewing" || currentStatus === "payment_in_progress") {
    return nextStatus === "reviewing" || nextStatus === "payment_completed";
  }

  if (nextStatus === "fulfilled") {
    return currentStatus === "delivery_completed" || currentStatus === "completed";
  }

  if (nextStatus === "refunded") {
    return true;
  }

  return true;
};

export function OrdersManagement({ requests, onStatusChange, onAdminMemoChange }: OrdersManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({
    key: "created_at",
    direction: "desc",
  });

  useEffect(() => {
    setMemoDrafts(Object.fromEntries(requests.filter((request) => ORDER_MANAGEMENT_STATUSES.has(request.status)).map((request) => [request.id, request.admin_memo || ""])));
  }, [requests]);

  const processedRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
      if (!ORDER_MANAGEMENT_STATUSES.has(request.status)) return false;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        getDisplayOrderNumber(request).toLowerCase().includes(query) ||
        request.brand_name.toLowerCase().includes(query) ||
        request.product_name.toLowerCase().includes(query) ||
        request.contact_name.toLowerCase().includes(query) ||
        request.contact_email.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const requestDate = new Date(request.created_at).toISOString().split("T")[0];
      const matchesDate = (!startDate || requestDate >= startDate) && (!endDate || requestDate <= endDate);

      return matchesSearch && matchesStatus && matchesDate;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue =
        sortConfig.key === "display_number"
          ? getDisplayOrderNumber(a)
          : normalizeSortValue(a[sortConfig.key as keyof RfqRequestRow] as string | number | boolean | null | undefined);
      const bValue =
        sortConfig.key === "display_number"
          ? getDisplayOrderNumber(b)
          : normalizeSortValue(b[sortConfig.key as keyof RfqRequestRow] as string | number | boolean | null | undefined);

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [requests, searchQuery, statusFilter, startDate, endDate, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 text-[#0064ff]" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-[#0064ff]" />
    );
  };

  const handleDownloadCsv = () => {
    const headers = [
      "주문번호",
      "브랜드명",
      "제품명",
      "제조사명",
      "담당자명",
      "이메일",
      "연락처",
      "수량",
      "총금액",
      "상태",
      "접수일",
      "관리자 메모",
    ];

    const rows = processedRequests.map((request) =>
      [
        getDisplayOrderNumber(request),
        request.brand_name,
        request.product_name,
        request.manufacturer_name,
        request.contact_name,
        request.contact_email,
        request.contact_phone,
        request.quantity,
        formatRfqCurrency(request.total_price, request.currency_code),
        getOrderStatusLabel(request.status),
        formatRfqDateTime(request.created_at),
        request.admin_memo || "",
      ].map(csvEscape)
    );

    const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusSelect = async (requestId: string, status: RfqRequestStatus) => {
    setUpdatingId(requestId);
    try {
      await onStatusChange(requestId, status);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMemoBlur = async (requestId: string) => {
    const nextMemo = memoDrafts[requestId] || "";
    const currentMemo = requests.find((request) => request.id === requestId)?.admin_memo || "";

    if (nextMemo === currentMemo) return;

    setUpdatingId(requestId);
    try {
      await onAdminMemoChange(requestId, nextMemo);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f7f8fa] p-8">
      <div className="flex w-full  flex-1 flex-col overflow-hidden rounded-[10px] border border-[#e5e8eb] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#f2f4f6] px-8 py-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-[#191f28]">수주 관리</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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

            <div className="relative min-w-[300px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b95a1]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="주문번호, 브랜드 또는 제품명, 담당자 검색"
                className="h-11 w-full rounded-xl border border-[#e5e8eb] bg-[#f8fafc] pl-11 pr-4 text-[14px] outline-none transition-colors focus:border-[#0064ff]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 min-w-[160px] rounded-xl border border-[#e5e8eb] bg-white px-4 text-[14px] font-bold text-[#4e5968] outline-none transition-colors focus:border-[#0064ff]"
            >
              <option value="all">전체 상태 필터</option>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleDownloadCsv}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe3ef] bg-white px-5 text-[14px] font-bold text-[#4e5968] transition-colors hover:bg-[#f8fafc] active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              CSV(엑셀 추출)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-4 border-b border-[#f2f4f6] bg-[#fbfcfd] px-8 py-5">
          {[
            { label: "결제 대기", count: requests.filter((i) => i.status === "reviewing" || i.status === "payment_in_progress").length, color: "text-[#0064ff]" },
            { label: "결제 완료", count: requests.filter((i) => i.status === "payment_completed").length, color: "text-[#15803d]" },
            { label: "생산 대기", count: requests.filter((i) => i.status === "production_waiting" || i.status === "quoted").length, color: "text-[#191f28]" },
            { label: "제조 중", count: requests.filter((i) => i.status === "production_started" || i.status === "ordered" || i.status === "production_in_progress").length, color: "text-[#191f28]" },
            { label: "제조 완료", count: requests.filter((i) => i.status === "manufacturing_completed" || i.status === "completed").length, color: "text-[#191f28]" },
            { label: "납품 완료", count: requests.filter((i) => i.status === "delivery_completed").length, color: "text-[#191f28]" },
            { label: "거래 완료", count: requests.filter((i) => i.status === "fulfilled").length, color: "text-[#191f28]" },
            { label: "환불", count: requests.filter((i) => i.status === "refunded").length, color: "text-[#e11d48]" },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-[10px] border border-[#f2f4f6] bg-white px-6 py-4 shadow-sm">
              <p className="text-[12px] font-bold text-[#8b95a1]">{stat.label}</p>
              <p className={`mt-2 text-[26px] font-bold ${stat.color}`}>{stat.count.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[1600px] table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#6a7282]">
                <th className="w-[180px] cursor-pointer px-5 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("display_number")}>
                  <div className="flex items-center">수주 번호 <SortIcon columnKey="display_number" /></div>
                </th>
                <th className="w-[180px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("brand_name")}>
                  <div className="flex items-center">브랜드명 <SortIcon columnKey="brand_name" /></div>
                </th>
                <th className="w-[240px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("product_name")}>
                  <div className="flex items-center">제품명 <SortIcon columnKey="product_name" /></div>
                </th>
                <th className="w-[140px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("contact_name")}>
                  <div className="flex items-center">담당자 <SortIcon columnKey="contact_name" /></div>
                </th>
                <th className="w-[120px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("quantity")}>
                  <div className="flex items-center">수량 <SortIcon columnKey="quantity" /></div>
                </th>
                <th className="w-[150px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("total_price")}>
                  <div className="flex items-center">금액 <SortIcon columnKey="total_price" /></div>
                </th>
                <th className="w-[180px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("created_at")}>
                  <div className="flex items-center">접수 일시 <SortIcon columnKey="created_at" /></div>
                </th>
                <th className="w-[170px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("status")}>
                  <div className="flex items-center">상태 <SortIcon columnKey="status" /></div>
                </th>
                <th className="px-5 py-3">관리자 메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6]">
              {processedRequests.length ? (
                processedRequests.map((request) => (
                  <tr key={request.id} className="align-middle transition-colors hover:bg-[#fcfdff]">
                    <td className="px-5 py-3.5">
                      <span className="block truncate font-mono text-[11px]">{getDisplayOrderNumber(request)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block truncate text-[13px] font-bold text-[#191f28]" title={request.brand_name}>
                        {request.brand_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block truncate text-[12px]" title={request.product_name}>
                        {request.product_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block truncate text-[12px] font-bold text-[#191f28]">{request.contact_name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block truncate text-[13px] font-bold text-[#191f28]">{request.quantity.toLocaleString()}개</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block truncate text-[13px] font-bold text-[#0064ff]">{formatRfqCurrency(request.total_price, request.currency_code)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block truncate text-[11px]">{formatRfqDateTime(request.created_at)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={request.status}
                        disabled={updatingId === request.id || request.status === "fulfilled" || request.status === "refunded"}
                        onChange={(e) => void handleStatusSelect(request.id, e.target.value as RfqRequestStatus)}
                        className="h-8 w-full cursor-pointer rounded-lg border border-[#e5e8eb] bg-white px-2.5 text-[11px] font-bold text-[#191f28] outline-none transition-colors focus:border-[#0064ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                      >
                        {getVisibleStatusOptions(request.status).map((status) => (
                          <option
                            key={status.value}
                            value={status.value}
                            disabled={!isEditableStatusOption(request.status, status.value)}
                          >
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="text"
                        value={memoDrafts[request.id] ?? ""}
                        disabled={updatingId === request.id || request.status === "fulfilled" || request.status === "refunded"}
                        onChange={(e) => setMemoDrafts((prev) => ({ ...prev, [request.id]: e.target.value }))}
                        onBlur={() => void handleMemoBlur(request.id)}
                        placeholder={request.status === "fulfilled" || request.status === "refunded" ? "최종 처리된 주문은 메모를 수정할 수 없습니다." : "관리 메모 입력..."}
                        className="h-9 w-full rounded-lg border border-[#e5e8eb] bg-white px-3 text-[12px] text-[#4e5968] outline-none transition-colors focus:border-[#0064ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center">
                      <Search className="mb-4 h-10 w-10 text-[#e5e8eb]" />
                      <p className="text-[15px] font-bold text-[#8b95a1]">조건에 맞는 주문 데이터가 없습니다.</p>
                      <p className="mt-1 text-[13px] text-[#adb5bd]">검색어 또는 날짜 범위를 조정해 보세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
