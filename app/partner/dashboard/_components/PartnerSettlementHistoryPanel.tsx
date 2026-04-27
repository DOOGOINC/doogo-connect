"use client";

import { useEffect, useState } from "react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { authFetch } from "@/lib/client/auth-fetch";

type SettlementHistoryRow = {
  month: string;
  nzdBaseAmount: number;
  nzdProfitAmount: number;
  krwBaseAmount: number;
  krwProfitAmount: number;
  settledAt: string;
  status: "completed";
};

type SettlementHistoryResponse = {
  rows: SettlementHistoryRow[];
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function PartnerSettlementHistoryPanel() {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SettlementHistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "10",
        });

        const response = await authFetch(`/api/partner/settlement-history?${params.toString()}`);
        const payload = (await response.json()) as SettlementHistoryResponse;

        if (!response.ok) {
          throw new Error(payload.error || "정산 내역을 불러오지 못했습니다.");
        }

        if (!active) return;
        setData(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "정산 내역을 불러오지 못했습니다.");
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
  }, [page]);

  return (
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#f9fafb] px-6 py-6">
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">정산 내역</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-[14px] font-semibold text-[#B91C1C]">{error}</div>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[#E7ECF3] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[#EEF2F6] bg-white text-left text-[11px] font-bold text-[#6B7280]">
                  <th className="px-4 py-3">정산월</th>
                  <th className="px-4 py-3">NZD 기준금액</th>
                  <th className="px-4 py-3">NZD 수익</th>
                  <th className="px-4 py-3">KRW 기준금액</th>
                  <th className="px-4 py-3">KRW 수익</th>
                  <th className="px-4 py-3">정산일</th>
                  <th className="px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : data?.rows.length ? (
                  data.rows.map((row) => (
                    <tr key={row.month} className="border-b border-[#F2F4F7] last:border-b-0">
                      <td className="px-4 py-3 text-[12px] font-semibold text-[#344054]">{row.month}</td>
                      <td className="px-4 py-3 text-[12px] text-[#344054]">{formatNzd(row.nzdBaseAmount)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[#2563EB]">{formatNzd(row.nzdProfitAmount)}</td>
                      <td className="px-4 py-3 text-[12px] text-[#344054]">{formatKrw(row.krwBaseAmount)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[#22C55E]">{formatKrw(row.krwProfitAmount)}</td>
                      <td className="px-4 py-3 text-[12px] text-[#344054]">{formatDate(row.settledAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#16A34A]">완료</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      표시할 정산 내역이 없습니다.
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
