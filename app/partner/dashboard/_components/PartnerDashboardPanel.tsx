"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

type DashboardResponse = {
  summary: {
    newReferralCount: number;
    completedOrderCount: number;
    currentBaseNzd: number;
    currentProfitNzd: number;
    currentBaseKrw: number;
    currentProfitKrw: number;
    commissionRate: number;
  };
  chart: {
    monthlyProfits: Array<{
      monthKey: string;
      label: string;
      nzdProfit: number;
      krwProfit: number;
    }>;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    productName: string;
    currencyCode: string;
    baseAmount: number;
    partnerProfit: number;
    commissionRate: number;
  }>;
  error?: string;
};

type CurrencyTab = "NZD" | "KRW";

const EMPTY_DASHBOARD: DashboardResponse = {
  summary: {
    newReferralCount: 0,
    completedOrderCount: 0,
    currentBaseNzd: 0,
    currentProfitNzd: 0,
    currentBaseKrw: 0,
    currentProfitKrw: 0,
    commissionRate: 2,
  },
  chart: {
    monthlyProfits: [],
  },
  recentOrders: [],
};

function formatKrw(value: number) {
  return `₩${Math.round(value).toLocaleString()}`;
}

function formatNzd(value: number) {
  return `NZD ${Math.round(value).toLocaleString()}`;
}

function formatMoney(value: number, currency: CurrencyTab | string) {
  return currency === "NZD" ? formatNzd(value) : formatKrw(value);
}

function formatCommissionRateBadge(value: number) {
  return Number.isInteger(value) ? `${value}% 적용` : `${value.toFixed(1)}% 적용`;
}

function formatProfitDescription(currency: "NZD" | "KRW", rate: number) {
  return `이번 달 파트너 수익 (${currency}, ${rate}%)`;
}

function readRouteError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

function SummaryCard({
  badge,
  badgeClassName,
  value,
  description,
}: {
  badge: string;
  badgeClassName: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-[18px] border border-[#E7ECF3] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.05)]">
      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${badgeClassName}`}>{badge}</span>
      <p className="mt-4 text-[24px] font-bold tracking-[-0.03em] text-[#243B64]">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold text-[#8A94A6]">{description}</p>
    </article>
  );
}

export function PartnerDashboardPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currencyTab, setCurrencyTab] = useState<CurrencyTab>("NZD");
  const [data, setData] = useState<DashboardResponse>(EMPTY_DASHBOARD);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await authFetch("/api/partner/dashboard-summary");
        const payload = (await response.json()) as DashboardResponse;

        if (!response.ok) {
          throw new Error(readRouteError(payload, "대시보드 정보를 불러오지 못했습니다."));
        }

        if (!active) return;
        setData(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "대시보드 정보를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const monthlyBars = useMemo(() => {
    const rows = data.chart.monthlyProfits || [];
    const values = rows.map((row) => (currencyTab === "NZD" ? row.nzdProfit : row.krwProfit));
    const maxValue = Math.max(...values, 1);

    return rows.map((row) => {
      const value = currencyTab === "NZD" ? row.nzdProfit : row.krwProfit;
      return {
        ...row,
        value,
        height: value <= 0 ? 0 : Math.max(18, Math.round((value / maxValue) * 104)),
      };
    });
  }, [currencyTab, data.chart.monthlyProfits]);

  const selectedProfitTotal = useMemo(() => {
    return monthlyBars.reduce((sum, bar) => sum + bar.value, 0);
  }, [monthlyBars]);

  return (
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#F8FAFC] px-6 py-7">
      <div className="mx-auto w-full max-w-[1880px]">
        <h1 className="mb-8 text-[22px] font-bold tracking-[-0.03em] text-[#111827]">대시보드</h1>

        {error ? (
          <div className="mb-4 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B91C1C]">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex h-[300px] items-center justify-center rounded-[18px] border border-[#E7ECF3] bg-white shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-[#2563EB]" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <SummaryCard
                badge="이번 달 신규"
                badgeClassName="bg-[#E8F1FF] text-[#2B73F6]"
                value={`${data.summary.newReferralCount}명`}
                description="이번 달 추천 회원"
              />
              <SummaryCard
                badge="처리 완료"
                badgeClassName="bg-[#E8FAF4] text-[#17A772]"
                value={`${data.summary.completedOrderCount}건`}
                description="이번 달 주문 건수"
              />
              <SummaryCard
                badge="캡슐판매가+박스비"
                badgeClassName="bg-[#F4E9FF] text-[#B33CF0]"
                value={formatNzd(data.summary.currentBaseNzd)}
                description="이번 달 기준금액 (NZD)"
              />
              <SummaryCard
                badge={formatCommissionRateBadge(data.summary.commissionRate)}
                badgeClassName="bg-[#FFF4E5] text-[#F59E0B]"
                value={formatNzd(data.summary.currentProfitNzd)}
                description={formatProfitDescription("NZD", data.summary.commissionRate)}
              />
              <SummaryCard
                badge="KRW 기준"
                badgeClassName="bg-[#EEF2FF] text-[#5B5CF6]"
                value={formatKrw(data.summary.currentBaseKrw)}
                description="이번 달 기준금액 (KRW)"
              />
              <SummaryCard
                badge={formatCommissionRateBadge(data.summary.commissionRate)}
                badgeClassName="bg-[#FFE8EE] text-[#F43F5E]"
                value={formatKrw(data.summary.currentProfitKrw)}
                description={formatProfitDescription("KRW", data.summary.commissionRate)}
              />
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-[18px] border border-[#E7ECF3] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[14px] font-bold tracking-[-0.02em] text-[#111827]">월별 파트너 수익</h2>
                    <p className="mt-2 text-[13px] font-bold text-[#377BEA]">{`${formatMoney(selectedProfitTotal, currencyTab)} 수익`}</p>
                  </div>
                  <div className="inline-flex rounded-full bg-[#F3F6FB] p-1">
                    {(["NZD", "KRW"] as CurrencyTab[]).map((tab) => {
                      const isActive = currencyTab === tab;

                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setCurrencyTab(tab)}
                          className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition ${isActive ? "bg-[#2B73F6] text-white shadow-sm" : "text-[#5F6B7C]"
                            }`}
                        >
                          {tab === "NZD" ? "NZ NZD" : "KR KRW"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex h-[200px] items-end gap-3">
                    {monthlyBars.map((bar) => (
                      <div key={bar.monthKey} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-[10px] font-semibold text-[#7C8797]">{formatMoney(bar.value, currencyTab)}</span>
                        <div className="flex h-[128px] w-full items-end">
                          <div className="w-full rounded-t-[6px] bg-[#377BEA]" style={{ height: `${bar.height}px` }} />
                        </div>
                        <span className="text-[11px] font-medium text-[#8A94A6]">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[18px] border border-[#E7ECF3] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.05)]">
                <h2 className="text-[14px] font-bold tracking-[-0.02em] text-[#111827]">최근 주문 내역</h2>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-[#EEF2F6] text-left text-[11px] font-bold text-[#7C8797]">
                        <th className="px-4 py-3">거래번호</th>
                        <th className="px-4 py-3">고객</th>
                        <th className="px-4 py-3">제품</th>
                        <th className="px-4 py-3">기준금액</th>
                        <th className="px-4 py-3">파트너수익</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.length ? (
                        data.recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-[#F3F5F8] last:border-b-0">
                            <td className="px-4 py-3.5 text-[12px] font-medium text-[#3C4A63]">{order.orderNumber}</td>
                            <td className="px-4 py-3.5 text-[12px] font-medium text-[#3C4A63]">{order.customerName}</td>
                            <td className="px-4 py-3.5 text-[12px] font-medium text-[#3C4A63]">{order.productName}</td>
                            <td className="px-4 py-3.5 text-[12px] font-medium text-[#3C4A63]">{formatMoney(order.baseAmount, order.currencyCode)}</td>
                            <td className="px-4 py-3.5 text-[12px] font-medium text-[#3C4A63]">{formatMoney(order.partnerProfit, order.currencyCode)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-[13px] font-semibold text-[#98A2B3]">
                            표시할 최근 주문 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
