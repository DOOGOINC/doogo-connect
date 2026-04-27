"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";

type SalesOrderItem = {
  id: string;
  orderNumber: string;
  createdAt: string | null;
  customerName: string;
  manufacturerName: string;
  productName: string;
  quantity: number;
  currencyCode: string;
  costAmount: number;
  capsuleSalePrice: number;
  boxPrice: number;
  baseAmount: number;
  partnerProfit: number;
  paymentMethod: string;
  statusLabel: "완료" | "거래중";
};

type SalesOrdersResponse = {
  summary: {
    totalBaseNzd: number;
    totalCommissionNzd: number;
    totalBaseKrw: number;
    totalCommissionKrw: number;
    commissionRate: number;
  };
  orders: SalesOrderItem[];
  filters: {
    availableYears: number[];
    selectedYear: number;
    selectedMonth: number;
    selectedCurrency: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatKrw(value: number) {
  return `₩${Math.round(value).toLocaleString()}`;
}

function formatNzd(value: number) {
  return `NZD ${Math.round(value).toLocaleString()}`;
}

function formatMoney(value: number, currencyCode: string) {
  return currencyCode === "NZD" ? formatNzd(value) : formatKrw(value);
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function PartnerSalesOrdersPanel() {
  const [page, setPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState("NZD");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SalesOrdersResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedMonth, selectedCurrency]);

  useEffect(() => {
    let active = true;

    const loadSalesOrders = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "10",
          year: String(selectedYear),
          month: String(selectedMonth),
          currency: selectedCurrency,
        });

        const response = await authFetch(`/api/partner/sales-orders?${params.toString()}`);
        const payload = (await response.json()) as SalesOrdersResponse;

        if (!response.ok) {
          throw new Error(payload.error || "매출/주문 정보를 불러오지 못했습니다.");
        }

        if (!active) return;

        setData(payload);
        if (!selectedYear && payload.filters.selectedYear) {
          setSelectedYear(payload.filters.selectedYear);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "매출/주문 정보를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSalesOrders();

    return () => {
      active = false;
    };
  }, [page, selectedYear, selectedMonth, selectedCurrency]);

  const commissionRateLabel = useMemo(() => {
    const commissionRate = Number(data?.summary.commissionRate || 2);
    return Number.isInteger(commissionRate) ? `${commissionRate}%` : `${commissionRate.toFixed(1)}%`;
  }, [data?.summary.commissionRate]);

  const handleDownload = () => {
    if (!data?.orders.length) {
      return;
    }

    downloadCsv(
      `partner-sales-orders-${selectedYear}-${selectedMonth || "all"}-${selectedCurrency.toLowerCase()}.csv`,
      [
        ["거래번호", "날짜", "고객", "제조사", "제품", "수량", "통화", "원가", "캡슐판매가", "박스비", "기준금액", `파트너수익(${commissionRateLabel})`, "결제", "상태"],
        ...data.orders.map((order) => [
          order.orderNumber,
          formatDate(order.createdAt),
          order.customerName,
          order.manufacturerName,
          order.productName,
          String(order.quantity),
          order.currencyCode,
          formatMoney(order.costAmount, order.currencyCode),
          formatMoney(order.capsuleSalePrice, order.currencyCode),
          formatMoney(order.boxPrice, order.currencyCode),
          formatMoney(order.baseAmount, order.currencyCode),
          formatMoney(order.partnerProfit, order.currencyCode),
          order.paymentMethod,
          order.statusLabel,
        ]),
      ]
    );
  };

  return (
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#f9fafb] px-6 py-6">
      <div className="w-full max-w-[1480px]">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">매출 / 주문</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-[14px] font-semibold text-[#B91C1C]">{error}</div>
        ) : null}

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="h-12 rounded-[16px] border border-[#E5E7EB] bg-white px-5 text-[14px] font-semibold text-[#1F2937] outline-none transition focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
            >
              {(data?.filters.availableYears || [selectedYear]).map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="h-12 rounded-[16px] border border-[#E5E7EB] bg-white px-5 text-[14px] font-semibold text-[#1F2937] outline-none transition focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
            >
              <option value={0}>전체 월</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>

            <select
              value={selectedCurrency}
              onChange={(event) => setSelectedCurrency(event.target.value)}
              className="h-12 rounded-[16px] border border-[#E5E7EB] bg-white px-5 text-[14px] font-semibold text-[#1F2937] outline-none transition focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
            >
              <option value="NZD">NZD</option>
              <option value="KRW">KRW</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!data?.orders.length}
            className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-[16px] bg-[#0EA56B] px-6 text-[14px] font-bold text-white transition hover:bg-[#0b935f] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            엑셀 다운로드
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">NZD 기준금액</p>
            <p className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#1F2937]">{loading ? "-" : formatNzd(data?.summary.totalBaseNzd || 0)}</p>
          </article>

          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">NZD 파트너수익 ({commissionRateLabel})</p>
            <p className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#1F2937]">{loading ? "-" : formatNzd(data?.summary.totalCommissionNzd || 0)}</p>
          </article>

          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">KRW 기준금액</p>
            <p className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#1F2937]">{loading ? "-" : formatKrw(data?.summary.totalBaseKrw || 0)}</p>
          </article>

          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">KRW 파트너수익 ({commissionRateLabel})</p>
            <p className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#1F2937]">{loading ? "-" : formatKrw(data?.summary.totalCommissionKrw || 0)}</p>
          </article>
        </div>

        <section className="mt-5 overflow-hidden rounded-[14px] border border-[#E7ECF3] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1310px] table-fixed">
              <thead>
                <tr className="border-b border-[#EEF2F6] bg-white text-left text-[11px] font-bold text-[#6B7280]">
                  <th className="px-4 py-3">거래번호</th>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3">고객</th>
                  <th className="px-4 py-3">제조사</th>
                  <th className="px-4 py-3">제품</th>
                  <th className="px-4 py-3">수량</th>
                  <th className="px-4 py-3">통화</th>
                  <th className="px-4 py-3">원가</th>
                  <th className="px-4 py-3">캡슐판매가</th>
                  <th className="px-4 py-3">박스비</th>
                  <th className="px-4 py-3">기준금액</th>
                  <th className="px-4 py-3">파트너수익({commissionRateLabel})</th>
                  <th className="px-4 py-3">결제</th>
                  <th className="px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : data?.orders.length ? (
                  data.orders.map((order) => {
                    const isCompleted = order.statusLabel === "완료";

                    return (
                      <tr key={order.id} className="border-b border-[#F2F4F7] last:border-b-0">
                        <td className="px-4 py-3 text-[12px] font-semibold text-[#344054]">{order.orderNumber}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{order.customerName}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{order.manufacturerName}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{order.productName}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{order.quantity}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{order.currencyCode}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatMoney(order.costAmount, order.currencyCode)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatMoney(order.capsuleSalePrice, order.currencyCode)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatMoney(order.boxPrice, order.currencyCode)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatMoney(order.baseAmount, order.currencyCode)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatMoney(order.partnerProfit, order.currencyCode)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{order.paymentMethod}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isCompleted ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#E9F2FF] text-[#2563EB]"
                            }`}
                          >
                            {order.statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      표시할 매출/주문 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data?.pagination.totalCount && data.pagination.totalCount > data.pagination.pageSize ? (
            <MasterTablePagination
              totalItems={data.pagination.totalCount}
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </section>
      </div>
    </section>
  );
}
