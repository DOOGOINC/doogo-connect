"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { MasterLoadingState } from "./MasterLoadingState";
import { MasterTablePagination } from "./MasterTablePagination";

type SummaryPayload = {
  totalSalesNzd: number;
  totalSalesKrw: number;
  totalCommissionNzd: number;
  totalCommissionKrw: number;
};

type TransactionRow = {
  id: string;
  orderNumber: string;
  createdAt: string | null;
  requesterName: string;
  manufacturerName: string;
  productName: string;
  quantity: number;
  currencyCode: string;
  capsuleCost: number;
  capsuleSalePrice: number;
  boxPrice: number;
  designPrice: number;
  totalSaleAmount: number;
  commissionAmount: number;
  paymentMethod: string;
  statusLabel: string;
};

type ResponsePayload = {
  summary: SummaryPayload;
  filters: {
    availableYears: number[];
    manufacturers: string[];
  };
  rows: TransactionRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  error?: string;
};

const PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatQuantity(value: number) {
  return `${Number(value || 0).toLocaleString("ko-KR")}개`;
}

function formatMoney(value: number, currencyCode: string) {
  const rounded = Math.round(Number(value || 0));
  if (currencyCode === "NZD") {
    return `NZD ${rounded.toLocaleString("en-NZ")}`;
  }
  return `₩${rounded.toLocaleString("ko-KR")}`;
}

function getCurrencyBadgeClass(currencyCode: string) {
  if (currencyCode === "NZD") {
    return "bg-[#E8F0FF] text-[#2F6BFF]";
  }
  return "bg-[#DCFCE7] text-[#169B62]";
}

function getStatusBadgeClass(statusLabel: string) {
  if (statusLabel === "완료") {
    return "bg-[#DCFCE7] text-[#16A34A]";
  }
  return "bg-[#E8F0FF] text-[#2F6BFF]";
}

export function MasterTransactionManagement() {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SummaryPayload>({
    totalSalesNzd: 0,
    totalSalesKrw: 0,
    totalCommissionNzd: 0,
    totalCommissionKrw: 0,
  });
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("ALL");
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(PAGE_SIZE),
          startYear: String(startYear),
          startMonth: String(startMonth),
          endYear: String(endYear),
          endMonth: String(endMonth),
          manufacturer: selectedManufacturer,
          currency: selectedCurrency,
        });

        if (debouncedSearch) {
          query.set("search", debouncedSearch);
        }

        const response = await authFetch(`/api/admin/transaction-management?${query.toString()}`);
        const payload = (await response.json()) as ResponsePayload;

        if (!response.ok) {
          throw new Error(payload.error || "거래 관리 데이터를 불러오지 못했습니다.");
        }

        setSummary(payload.summary);
        setRows(payload.rows || []);
        setAvailableYears(payload.filters.availableYears?.length ? payload.filters.availableYears : [currentYear]);
        setManufacturers(payload.filters.manufacturers || []);
        setTotalCount(payload.pagination.totalCount || 0);
        setTotalPages(payload.pagination.totalPages || 1);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "거래 관리 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [currentPage, currentYear, debouncedSearch, endMonth, endYear, selectedCurrency, selectedManufacturer, startMonth, startYear]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summaryCards = [
    { label: "NZD 총 판매금액", value: formatMoney(summary.totalSalesNzd, "NZD") },
    { label: "KRW 총 판매금액", value: formatMoney(summary.totalSalesKrw, "KRW") },
    { label: "NZD 수수료(3%)", value: formatMoney(summary.totalCommissionNzd, "NZD") },
    { label: "KRW 수수료(3%)", value: formatMoney(summary.totalCommissionKrw, "KRW") },
  ];

  if (loading && totalCount === 0 && rows.length === 0) {
    return <MasterLoadingState message="거래 관리 데이터를 불러오는 중입니다." />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#F8FAFC] px-6 py-6">
      <div className="flex w-full flex-col gap-5">
        <section>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[20px] font-bold text-[#1F2A44]">
              <span className="text-[20px]">💳</span>
              <h1>거래 관리</h1>
            </div>
            <p className="text-[14px] font-medium text-[#8C96A8]">두고커넥트 운영 관리 시스템</p>
          </div>
        </section>

        <section className="rounded-[14px] border border-[#e7e9ee] bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-[#6b7280]">
                🔍 검색 (거래번호·의뢰자·제품·제조사)
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="검색어 입력..."
                className="h-[38px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-[15px] font-medium text-[#374151] outline-none placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-[#6b7280]">
                  📅 시작
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={startYear}
                    onChange={(event) => {
                      setStartYear(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[15px] font-semibold text-[#374151] outline-none"
                  >
                    {availableYears.map((year) => (
                      <option key={`start-${year}`} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <select
                    value={startMonth}
                    onChange={(event) => {
                      setStartMonth(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[15px] font-semibold text-[#374151] outline-none"
                  >
                    {monthOptions.map((month) => (
                      <option key={`start-month-${month}`} value={month}>
                        {month}월
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <span className="pb-3 text-[14px] font-bold text-[#6b7280]">~</span>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-[#6b7280]">
                  📅 종료
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={endYear}
                    onChange={(event) => {
                      setEndYear(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[14px] font-semibold text-[#374151] outline-none"
                  >
                    {availableYears.map((year) => (
                      <option key={`end-${year}`} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <select
                    value={endMonth}
                    onChange={(event) => {
                      setEndMonth(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[14px] font-semibold text-[#374151] outline-none"
                  >
                    {monthOptions.map((month) => (
                      <option key={`end-month-${month}`} value={month}>
                        {month}월
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <select
                value={selectedManufacturer}
                onChange={(event) => {
                  setSelectedManufacturer(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-[32px] min-w-[160px] appearance-none rounded-full border border-[#E5EAF0] bg-[#f9fafb] px-6 pr-10 text-[14px] font-semibold text-[#344054] outline-none shadow-sm transition-shadow focus:ring-2 focus:ring-[#2F6BFF]/5"
              >
                <option value="all">전체 제조사</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#344054]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="inline-flex h-[32px] items-center rounded-full bg-[#F2F4F7]  p-0.4 shadow-sm">
              {[
                { id: "ALL", label: "전체" },
                { id: "NZD", label: "NZD" },
                { id: "KRW", label: "KRW" },
              ].map((tab) => {
                const isActive = selectedCurrency === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedCurrency(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`h-full rounded-full px-7 text-[14px] font-bold transition-all duration-200 ${isActive ? "bg-white text-[#2F6BFF] shadow-sm" : "text-[#667085] hover:text-[#344054]"
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.label} className="rounded-[14px] border border-[#E8EDF3] bg-white px-4 py-4 shadow-sm">
              <p className="text-[12px] font-medium text-[#7B8597]">{card.label}</p>
              <p className="mt-2 text-[18px] font-bold text-[#2F6BFF]">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[14px] border border-[#E8EDF3] bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1720px] w-full table-auto">
              <thead>
                <tr className="border-b border-[#EEF2F6] text-left text-[11px] font-bold text-[#6A7282]">
                  {[
                    "거래번호",
                    "날짜",
                    "의뢰자",
                    "제조사",
                    "제품",
                    "수량",
                    "통화",
                    "캡슐 원가",
                    "캡슐 판매가",
                    "박스비",
                    "디자인비",
                    "총판매금액",
                    "수수료(3%)",
                    "결제",
                    "상태",
                  ].map((label) => (
                    <th key={label} className="whitespace-nowrap px-3 py-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-14 text-center">
                      <MasterLoadingState variant="inline" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-14 text-center text-[13px] font-semibold text-[#EF4444]">
                      {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-14 text-center text-[13px] font-semibold text-[#98A2B3]">
                      조회된 거래 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#F2F5F8] text-[12px] text-[#475467] last:border-b-0">
                      <td className="whitespace-nowrap px-3 py-3">{row.orderNumber}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(row.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#344054]">{row.requesterName}</td>
                      <td className="whitespace-nowrap px-3 py-3">{row.manufacturerName}</td>
                      <td className="max-w-[190px] truncate px-3 py-3">{row.productName}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatQuantity(row.quantity)}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${getCurrencyBadgeClass(row.currencyCode)}`}>
                          {row.currencyCode}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{formatMoney(row.capsuleCost, row.currencyCode)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatMoney(row.capsuleSalePrice, row.currencyCode)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatMoney(row.boxPrice, row.currencyCode)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatMoney(row.designPrice, row.currencyCode)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-[#344054]">{formatMoney(row.totalSaleAmount, row.currencyCode)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-[#344054]">{formatMoney(row.commissionAmount, row.currencyCode)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{row.paymentMethod}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${getStatusBadgeClass(row.statusLabel)}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && !error ? (
            <MasterTablePagination
              totalItems={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
