"use client";

import { useEffect, useMemo, useState } from "react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { authFetch } from "@/lib/client/auth-fetch";

type MonthlySettlementRow = {
  month: string;
  nzdBaseAmount: number;
  nzdProfitAmount: number;
  krwBaseAmount: number;
  krwProfitAmount: number;
  status: "pending" | "completed";
};

type MonthlySettlementResponse = {
  summary: {
    currentMonth: string;
    selectedCurrency: string;
    currentBaseAmount: number;
    currentProfitAmount: number;
    commissionRate: number;
  };
  rows: MonthlySettlementRow[];
  filters: {
    years: string[];
    selectedYear: string;
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

function formatKrw(value: number) {
  return `₩${Math.round(value).toLocaleString()}`;
}

function formatNzd(value: number) {
  return `NZD ${Math.round(value).toLocaleString()}`;
}

export function PartnerMonthlySettlementPanel() {
  const [page, setPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("KRW");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlySettlementResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedCurrency]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "10",
          year: selectedYear,
          currency: selectedCurrency,
        });

        const response = await authFetch(`/api/partner/monthly-settlements?${params.toString()}`);
        const payload = (await response.json()) as MonthlySettlementResponse;

        if (!response.ok) {
          throw new Error(payload.error || "월 정산 정보를 불러오지 못했습니다.");
        }

        if (!active) return;
        setData(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "월 정산 정보를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [page, selectedCurrency, selectedYear]);

  const commissionRateLabel = useMemo(() => {
    const commissionRate = Number(data?.summary.commissionRate || 2);
    return Number.isInteger(commissionRate) ? `${commissionRate}%` : `${commissionRate.toFixed(1)}%`;
  }, [data?.summary.commissionRate]);

  const currentCurrencyLabel = selectedCurrency === "NZD" ? "NZD" : "KRW";
  const currentBaseAmount = selectedCurrency === "NZD" ? formatNzd(data?.summary.currentBaseAmount || 0) : formatKrw(data?.summary.currentBaseAmount || 0);
  const currentProfitAmount = selectedCurrency === "NZD" ? formatNzd(data?.summary.currentProfitAmount || 0) : formatKrw(data?.summary.currentProfitAmount || 0);

  return (
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#f9fafb] px-6 py-6">
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">월 정산</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-[14px] font-semibold text-[#B91C1C]">{error}</div>
        ) : null}

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedYear("all")}
              className={`h-10 rounded-full px-6 text-[14px] font-bold transition ${selectedYear === "all" ? "bg-[#2563EB] text-white" : "bg-[#F3F4F6] text-[#4B5563]"
                }`}
            >
              전체
            </button>
            {(data?.filters.years || []).map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`h-10 rounded-full px-6 text-[14px] font-bold transition ${selectedYear === year ? "bg-[#2563EB] text-white" : "bg-[#F3F4F6] text-[#4B5563]"
                  }`}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-full bg-[#F3F4F6] p-1">
            {["NZD", "KRW"].map((currency) => {
              const isActive = selectedCurrency === currency;

              return (
                <button
                  key={currency}
                  type="button"
                  onClick={() => setSelectedCurrency(currency)}
                  className={`rounded-full px-5 py-1 text-[14px] font-bold transition ${isActive ? "bg-[#2563EB] text-white" : "text-[#4B5563]"
                    }`}
                >
                  {currency}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-[20px] border border-[#D8E7FF] bg-[#EEF5FF] px-5 py-5">
            <p className="text-[12px] font-semibold text-[#2563EB]">이번 달 기준금액 ({currentCurrencyLabel})</p>
            <p className="mt-3 text-[24px] font-bold tracking-[-0.04em] text-[#2563EB]">{loading ? "-" : currentBaseAmount}</p>
          </article>

          <article className="rounded-[20px] border border-[#D6F5E6] bg-[#ECFDF5] px-5 py-5">
            <p className="text-[12px] font-semibold text-[#059669]">이번 달 파트너 수익 {commissionRateLabel} ({currentCurrencyLabel})</p>
            <p className="mt-3 text-[24px] font-bold tracking-[-0.04em] text-[#059669]">{loading ? "-" : currentProfitAmount}</p>
          </article>
        </div>

        <section className="mt-5 overflow-hidden rounded-[14px] border border-[#E7ECF3] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[#EEF2F6] bg-white text-left text-[11px] font-bold text-[#6B7280]">
                  <th className="px-4 py-3">월</th>
                  <th className="px-4 py-3">NZD 기준금액</th>
                  <th className="px-4 py-3">NZD 수익({commissionRateLabel})</th>
                  <th className="px-4 py-3">KRW 기준금액</th>
                  <th className="px-4 py-3">KRW 수익({commissionRateLabel})</th>
                  <th className="px-4 py-3">정산 상태</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : data?.rows.length ? (
                  data.rows.map((row) => {
                    const isCompleted = row.status === "completed";

                    return (
                      <tr key={row.month} className="border-b border-[#F2F4F7] last:border-b-0">
                        <td className="px-4 py-3 text-[12px] font-semibold text-[#344054]">{row.month}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatNzd(row.nzdBaseAmount)}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-[#2563EB]">{formatNzd(row.nzdProfitAmount)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#344054]">{formatKrw(row.krwBaseAmount)}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-[#22C55E]">{formatKrw(row.krwProfitAmount)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isCompleted ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF3C7] text-[#D97706]"
                              }`}
                          >
                            {isCompleted ? "완료" : "대기"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      표시할 월 정산 내역이 없습니다.
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
