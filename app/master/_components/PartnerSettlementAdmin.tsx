"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

type PartnerOption = {
  id: string;
  name: string;
  referralCode: string;
  commissionRate: number;
};

type SettlementRow = {
  month: string;
  nzdBaseAmount: number;
  nzdProfitAmount: number;
  krwBaseAmount: number;
  krwProfitAmount: number;
  commissionRate: number;
  status: "pending" | "completed";
  settledAt: string | null;
};

type PartnerSettlementResponse = {
  partners: PartnerOption[];
  selectedPartnerId: string | null;
  summary: {
    pendingCount: number;
    completedCount: number;
    pendingNzdProfitAmount: number;
    pendingKrwProfitAmount: number;
  };
  rows: SettlementRow[];
  error?: string;
};

function formatNzd(value: number) {
  return `NZD ${Math.round(value).toLocaleString()}`;
}

function formatKrw(value: number) {
  return `₩${Math.round(value).toLocaleString()}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR");
}

function formatRate(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function PartnerSettlementAdmin() {
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [data, setData] = useState<PartnerSettlementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingMonth, setSavingMonth] = useState("");

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (selectedPartnerId) {
          params.set("partnerId", selectedPartnerId);
        }

        const response = await authFetch(`/api/admin/partner-settlements${params.toString() ? `?${params.toString()}` : ""}`);
        const payload = (await response.json()) as PartnerSettlementResponse;

        if (!response.ok) {
          throw new Error(payload.error || "파트너 정산 정보를 불러오지 못했습니다.");
        }

        if (!active) return;
        setData(payload);
        setSelectedPartnerId((prev) => prev || payload.selectedPartnerId || "");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "파트너 정산 정보를 불러오지 못했습니다.");
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
  }, [selectedPartnerId]);

  const selectedPartner = useMemo(
    () => data?.partners.find((partner) => partner.id === (data.selectedPartnerId || selectedPartnerId)) || null,
    [data?.partners, data?.selectedPartnerId, selectedPartnerId]
  );

  const handleComplete = async (month: string) => {
    if (!selectedPartner) return;

    setSavingMonth(month);
    setError("");

    try {
      const response = await authFetch("/api/admin/partner-settlements", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerId: selectedPartner.id,
          month,
        }),
      });

      const payload = (await response.json()) as { row?: SettlementRow; error?: string };
      if (!response.ok || !payload.row) {
        throw new Error(payload.error || "정산 완료 처리에 실패했습니다.");
      }

      setData((prev) => {
        if (!prev) return prev;

        const nextRows = prev.rows.map((row) => (row.month === month ? payload.row! : row));
        const nextSummary = nextRows.reduce(
          (acc, row) => {
            if (row.status === "completed") {
              acc.completedCount += 1;
            } else {
              acc.pendingCount += 1;
              acc.pendingNzdProfitAmount += row.nzdProfitAmount;
              acc.pendingKrwProfitAmount += row.krwProfitAmount;
            }
            return acc;
          },
          {
            pendingCount: 0,
            completedCount: 0,
            pendingNzdProfitAmount: 0,
            pendingKrwProfitAmount: 0,
          }
        );

        return {
          ...prev,
          rows: nextRows,
          summary: nextSummary,
        };
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "정산 완료 처리에 실패했습니다.");
    } finally {
      setSavingMonth("");
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-6 py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <section>
          <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-tight text-[#1f2937]">
            <span className="text-[20px]">💸</span> 파트너 정산 관리
          </h1>
          <p className="mt-1 text-[14px] font-medium text-[#6b7280]">파트너별 월 정산 상태를 관리합니다.</p>
        </section>

        {error ? <div className="rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-5 py-4 text-[14px] font-semibold text-[#b91c1c]">{error}</div> : null}

        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="mb-4 text-[13px] font-bold text-[#6b7280]">파트너 선택</p>
          <div className="flex flex-wrap gap-3">
            {(data?.partners || []).map((partner) => (
              <button
                key={partner.id}
                type="button"
                onClick={() => setSelectedPartnerId(partner.id)}
                className={`rounded-full px-6 py-2.5 text-[14px] font-bold transition ${(data?.selectedPartnerId || selectedPartnerId) === partner.id
                  ? "bg-[#2563eb] text-white"
                  : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                  }`}
              >
                {partner.name} ({partner.referralCode || "코드없음"})
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-4">
          <article className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#6b7280]">정산 대기 건수</p>
            <p className="mt-2 text-[24px] font-black text-[#ea580c]">{data?.summary.pendingCount || 0}건</p>
          </article>
          <article className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#6b7280]">대기 수익 (NZD)</p>
            <p className="mt-2 text-[24px] font-black text-[#2563eb]">{formatNzd(data?.summary.pendingNzdProfitAmount || 0)}</p>
          </article>
          <article className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#6b7280]">대기 수익 (KRW)</p>
            <p className="mt-2 text-[24px] font-black text-[#16a34a]">{formatKrw(data?.summary.pendingKrwProfitAmount || 0)}</p>
          </article>
          <article className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#6b7280]">완료 건수</p>
            <p className="mt-2 text-[24px] font-black text-[#16a34a]">{data?.summary.completedCount || 0}건</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#1e293b]">
              <span className="text-[#16a34a]">💸</span> {selectedPartner?.name || "파트너"} 정산 관리
            </h2>
            <p className="text-[12px] font-medium text-[#94a3b8]">
              수익은 각 금액 셀 안에 표시됩니다. {selectedPartner ? `현재 수수료 ${formatRate(selectedPartner.commissionRate)}` : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fafc] text-[12px] font-bold text-[#64748b]">
                  <th className="px-6 py-4">정산월</th>
                  <th className="px-6 py-4">NZD 기준금액</th>
                  <th className="px-6 py-4">KRW 기준금액</th>
                  <th className="px-6 py-4">정산일</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-[14px] font-medium text-[#94a3b8]">
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : data?.rows.length ? (
                  data.rows.map((row) => {
                    const isCompleted = row.status === "completed";
                    return (
                      <tr key={row.month} className="text-[14px] font-medium text-[#334155] hover:bg-[#fcfdfe]">
                        <td className="px-6 py-5 font-bold">{row.month}</td>
                        <td className="px-6 py-5">
                          <div className="font-semibold">{formatNzd(row.nzdBaseAmount)}</div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#2563eb]">
                            <span>수익 {formatNzd(row.nzdProfitAmount)}</span>
                            <span className="font-medium text-[#94a3b8]">수수료 {formatRate(row.commissionRate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold">{formatKrw(row.krwBaseAmount)}</div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#16a34a]">
                            <span>수익 {formatKrw(row.krwProfitAmount)}</span>
                            <span className="font-medium text-[#94a3b8]">수수료 {formatRate(row.commissionRate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[#64748b]">{formatDate(row.settledAt)}</td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${isCompleted ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#fef3c7] text-[#d97706]"
                              }`}
                          >
                            {isCompleted ? "완료" : "대기"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {isCompleted ? (
                            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#16a34a]">
                              <Check className="h-4 w-4" />
                              처리완료
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                void handleComplete(row.month);
                              }}
                              disabled={savingMonth === row.month}
                              className="rounded-full bg-[#2563eb] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingMonth === row.month ? "처리중..." : "정산 완료"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-[14px] font-medium text-[#94a3b8]">
                      표시할 정산 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
