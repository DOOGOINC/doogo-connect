"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { type CurrencyCode } from "@/lib/currency";
import { MasterLoadingState } from "./MasterLoadingState";
import { MONTH_LABELS, SALES_CURRENCIES, useMasterStatisticsData } from "./useMasterStatisticsData";

type HoveredPoint = {
  monthIndex: number;
  x: number;
  y: number;
};

type Point = {
  x: number;
  y: number;
};

function formatMoney(value: number, currency: CurrencyCode) {
  const rounded = Math.round(value);

  if (currency === "KRW") {
    return `KRW ${rounded.toLocaleString("ko-KR")}`;
  }

  if (currency === "NZD") {
    return `NZD ${rounded.toLocaleString("en-NZ")}`;
  }

  return `USD ${rounded.toLocaleString("en-US")}`;
}

function formatCount(value: number, suffix: string) {
  return `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

function getNiceStep(maxValue: number, segments = 4) {
  if (maxValue <= 0) return 1;

  const rawStep = maxValue / segments;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 2.5) return 2.5 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function getYAxisTicks(maxValue: number) {
  const step = getNiceStep(maxValue, 4);
  const top = Math.max(step * 4, Math.ceil(maxValue / step) * step);
  return Array.from({ length: 5 }, (_, index) => top - step * index);
}

function formatAxisTick(value: number, currency: CurrencyCode) {
  if (currency === "KRW") {
    if (value >= 100000000) return `${(value / 100000000).toFixed(value % 100000000 === 0 ? 0 : 1)}억`;
    if (value >= 10000) return `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}만`;
    return Math.round(value).toLocaleString("ko-KR");
  }

  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return Math.round(value).toLocaleString("en-US");
}

function buildSmoothLinePath(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let path = `M ${points[0].x},${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
  }

  return path;
}

function buildAreaPath(points: Point[], height: number) {
  if (points.length === 0) return "";
  const linePath = buildSmoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x},${height} L ${first.x},${height} Z`;
}

function getSeriesPoints(values: number[], maxValue: number, width: number, height: number, lastIndex: number) {
  if (lastIndex < 0) return [];

  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const safeMax = Math.max(maxValue, 1);

  return values.slice(0, lastIndex + 1).map((value, index) => ({
    x: stepX * index,
    y: height - (value / safeMax) * height,
  }));
}

function getMemberEventMonths(monthlyMembers: number[]) {
  return monthlyMembers.map((value, index) => {
    if (index === 0) return value > 0;
    return value !== monthlyMembers[index - 1];
  });
}

export function MasterStatisticsAdmin() {
  const router = useRouter();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonthIndex = useMemo(() => new Date().getMonth(), []);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [currency, setCurrency] = useState<CurrencyCode>("NZD");
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const {
    activeYear,
    availableYears,
    error,
    loading,
    manufacturers,
    monthlyRequesterMembers,
    monthlySales,
    requesterProfiles,
    totalPointBalance,
    totalPointsIssued,
    totalPointsSpent,
    yearlyCompletedRequests,
    yearlyPointPurchases,
    yearlyRequests,
    yearlySalesSummary,
  } = useMasterStatisticsData(selectedYear);

  const cumulativeSales = useMemo(() => {
    const source = monthlySales[currency];
    return source.reduce<number[]>((accumulator, value, index) => {
      const previous = index === 0 ? 0 : accumulator[index - 1];
      accumulator.push(previous + value);
      return accumulator;
    }, []);
  }, [currency, monthlySales]);

  const memberEventMonths = useMemo(() => getMemberEventMonths(monthlyRequesterMembers), [monthlyRequesterMembers]);

  const lastDataIndex = useMemo(() => {
    let lastIndex = -1;

    cumulativeSales.forEach((value, index) => {
      if (value > 0) lastIndex = index;
    });

    memberEventMonths.forEach((hasEvent, index) => {
      if (hasEvent) lastIndex = Math.max(lastIndex, index);
    });

    if (activeYear === currentYear) {
      return Math.min(lastIndex, currentMonthIndex);
    }

    return lastIndex;
  }, [activeYear, cumulativeSales, currentMonthIndex, currentYear, memberEventMonths]);

  const chartWidth = 880;
  const chartHeight = 260;
  const salesSeries = lastDataIndex >= 0 ? cumulativeSales.slice(0, lastDataIndex + 1) : [];
  const memberSeries = lastDataIndex >= 0 ? monthlyRequesterMembers.slice(0, lastDataIndex + 1) : [];
  const maxSalesValue = Math.max(...salesSeries, 0);
  const maxMemberValue = Math.max(...memberSeries, 0);
  const salesTicks = getYAxisTicks(maxSalesValue);
  const memberTicks = getYAxisTicks(maxMemberValue);
  const salesTop = salesTicks[0] || 1;
  const memberTop = memberTicks[0] || 1;
  const salesPoints = getSeriesPoints(cumulativeSales, salesTop, chartWidth, chartHeight, lastDataIndex);
  const memberPoints = getSeriesPoints(monthlyRequesterMembers, memberTop, chartWidth, chartHeight, lastDataIndex);
  const salesPath = buildSmoothLinePath(salesPoints);
  const salesAreaPath = buildAreaPath(salesPoints, chartHeight);
  const memberPath = buildSmoothLinePath(memberPoints);
  const tooltipValue = hoveredPoint ? cumulativeSales[hoveredPoint.monthIndex] : 0;
  const tooltipMembers = hoveredPoint ? monthlyRequesterMembers[hoveredPoint.monthIndex] : 0;

  if (loading) {
    return <MasterLoadingState message="통계 데이터를 불러오는 중입니다." />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-6 py-7 lg:px-8 lg:py-8">
      <div className="flex w-full max-w-[1600px] flex-col gap-4">
        <section>
          <div className="flex items-center gap-2">
            <span className="text-[20px] leading-none">📊</span>
            <h1 className="text-[20px] font-bold tracking-tight text-[#1f2937]">통계</h1>
          </div>
          <p className="mt-1 text-[14px] font-medium text-[#6b7280]">두고커넥트 운영 관리 시스템</p>
        </section>

        <section className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#303443]">
              <span className="text-[12px]">🗓️</span> 연도 선택
            </label>
            <div className="relative">
              <select
                value={activeYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="h-10 w-[120px] appearance-none rounded-[10px] border border-[#e2e8f0] bg-white px-4 pr-10 text-[14px] font-bold text-[#1e293b] shadow-sm outline-none transition focus:border-[#2563eb]"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
          <p className="text-[12px] font-medium text-[#94a3b8]">{activeYear}년 1월~12월 선그래프 (플랫폼 성장 추이)</p>
        </section>

        {error ? (
          <section className="rounded-[14px] border border-[#fecaca] bg-[#fff7f7] px-5 py-4 text-[14px] font-semibold text-[#b91c1c]">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
              <span className="text-[#2563eb]">💵</span> 누적 판매금액(NZD)
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#2563eb]">{formatMoney(yearlySalesSummary.NZD.sales, "NZD")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 최근 값</p>
          </article>

          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
              <span className="text-[#16a34a]">💰</span> 누적 판매금액(KRW)
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#16a34a]">{formatMoney(yearlySalesSummary.KRW.sales, "KRW")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 최근 값</p>
          </article>

          <button
            type="button"
            onClick={() => router.push("/master?tab=requesters")}
            className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 text-left shadow-sm transition hover:border-[#2453d8]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
                <span className="text-[#9333ea]">👥</span> 총 회원수
              </div>
              <span className="text-[11px] font-bold text-[#2563eb]">→ 메뉴</span>
            </div>
            <p className="mt-1 text-[20px] text-[#9333ea] font-bold text-[#1e293b]">{formatCount(requesterProfiles.length, "명")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 최근 값</p>
          </button>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => router.push("/master?tab=manufacturers")}
            className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 text-left shadow-sm transition hover:border-[#2453d8]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
                <span className="text-[#ea580c]">🏭</span> 등록 제조사
              </div>
              <span className="text-[11px] font-bold text-[#2563eb]">→ 메뉴</span>
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#ea580c]">{formatCount(manufacturers.length, "개")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 최근 값</p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/master?tab=point-settings")}
            className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 text-left shadow-sm transition hover:border-[#2453d8]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
                <span className="text-[#d97706]">⚡</span> 포인트 총 발급
              </div>
              <span className="text-[11px] font-bold text-[#2563eb]">→ 메뉴</span>
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#d97706]">{formatCount(totalPointsIssued, "P")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">사용 {formatCount(totalPointsSpent, "P")} / 잔액 {formatCount(totalPointBalance, "P")}</p>
          </button>

          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
              <span className="text-[#16a34a]">✅</span> 완료된 요청
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#16a34a]">{formatCount(yearlyCompletedRequests.length, "건")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 거래완료만 집계</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
              <span className="text-[#303443]">📦</span> 총 제조 요청
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#9333ea]">{formatCount(yearlyRequests.length, "건")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 생성된 요청 기준</p>
          </article>

          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
              <span className="text-[#0f766e]">🪙</span> 포인트 충전 건수
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#0f766e]">{formatCount(yearlyPointPurchases.length, "건")}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 완료된 포인트 구매 기준</p>
          </article>

          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#303443]">
              <span className="text-[#7c3aed]">💳</span> 포인트 충전 금액
            </div>
            <p className="mt-1 text-[20px] font-bold text-[#7c3aed]">
              {formatMoney(yearlyPointPurchases.reduce((sum, purchase) => sum + Number(purchase.amount_krw || 0), 0), "KRW")}
            </p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">{activeYear}년 완료된 포인트 구매 합계</p>
          </article>
        </section>

        <section className="rounded-[14px] border border-[#eef2f7] bg-white px-6 py-4 shadow-sm">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#111827]">
              <span className="text-[#2563eb]">📈</span> 누적 판매금액 + 회원수 추이 — {activeYear}년
            </h2>

            <div className="flex items-center rounded-full bg-[#eef2f8] p-1">
              {SALES_CURRENCIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrency(item)}
                  className={`rounded-full px-5 py-2 text-[12px] font-bold transition ${currency === item ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280]"
                    }`}
                >
                  {item === "NZD" ? "Nz NZD" : item === "KRW" ? "KR KRW" : "US USD"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[420px] w-full">
            <div className="absolute inset-y-[52px] left-[42px] right-[72px] flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="h-px w-full bg-[#dfe6ef]" />
              ))}
            </div>

            <div className="absolute left-0 top-[34px] bottom-[78px] flex w-[52px] flex-col justify-between text-right text-[12px] font-semibold text-[#303443]">
              {salesTicks.map((tick) => (
                <span key={tick}>{formatAxisTick(tick, currency)}</span>
              ))}
            </div>

            <div className="absolute right-0 top-[34px] bottom-[78px] flex w-[62px] flex-col justify-between text-right text-[12px] font-semibold text-[#9333ea]">
              {memberTicks.map((tick) => (
                <span key={tick}>{`${Math.round(tick).toLocaleString("ko-KR")}명`}</span>
              ))}
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="absolute left-[52px] right-[72px] top-[34px] h-[260px] w-[calc(100%-124px)] overflow-visible"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="statistics-sales-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              {salesAreaPath ? <path d={salesAreaPath} fill="url(#statistics-sales-fill)" /> : null}
              {salesPath ? <path d={salesPath} fill="none" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /> : null}
              {memberPath ? <path d={memberPath} fill="none" stroke="#9333ea" strokeWidth="3.5" strokeDasharray="10 8" strokeLinecap="round" strokeLinejoin="round" /> : null}

              {salesPoints.map((point, index) => (
                <g
                  key={`sales-${MONTH_LABELS[index]}`}
                  onMouseEnter={() => setHoveredPoint({ monthIndex: index, x: point.x, y: point.y })}
                  onMouseMove={() => setHoveredPoint({ monthIndex: index, x: point.x, y: point.y })}
                >
                  <rect x={point.x - 24} y={0} width={48} height={chartHeight} fill="transparent" />
                  <circle cx={point.x} cy={point.y} r="10" fill="#3b82f6" opacity="0.18" />
                  <circle cx={point.x} cy={point.y} r="8" fill="#3b82f6" stroke="#ffffff" strokeWidth="3" />
                  <circle cx={point.x} cy={point.y} r="3.5" fill="#ffffff" />
                  <title>{`${MONTH_LABELS[index]} | ${formatMoney(cumulativeSales[index], currency)}`}</title>
                </g>
              ))}

              {memberPoints.map((point, index) => (
                <g
                  key={`member-${MONTH_LABELS[index]}`}
                  onMouseEnter={() => setHoveredPoint({ monthIndex: index, x: point.x, y: point.y })}
                  onMouseMove={() => setHoveredPoint({ monthIndex: index, x: point.x, y: point.y })}
                >
                  <circle cx={point.x} cy={point.y} r="8" fill="#ffffff" stroke="#9333ea" strokeWidth="3" />
                  <circle cx={point.x} cy={point.y} r="3" fill="#9333ea" />
                </g>
              ))}

              {hoveredPoint ? (
                <g transform={`translate(${Math.min(Math.max(hoveredPoint.x - 92, 12), chartWidth - 188)}, ${Math.max(hoveredPoint.y - 60, 12)})`}>
                  <rect width="184" height="54" rx="12" fill="#101828" fillOpacity="0.94" />
                  <text x="12" y="22" fill="#ffffff" fontSize="12" fontWeight="700">
                    {formatMoney(tooltipValue, currency)}
                  </text>
                  <text x="12" y="40" fill="#d8b4fe" fontSize="12" fontWeight="700">
                    {`${tooltipMembers.toLocaleString("ko-KR")}명`}
                  </text>
                </g>
              ) : null}
            </svg>

            <div className="absolute bottom-[42px] left-[52px] right-[72px] flex justify-between text-[12px] font-medium text-[#c5ccd6]">
              {MONTH_LABELS.map((month, index) => (
                <span key={month} className={index <= lastDataIndex ? "text-[#303443]" : ""}>
                  {month}
                </span>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-between gap-4 pt-4">
              <div className="flex flex-wrap items-center gap-6 text-[12px] font-bold text-[#303443]">
                <div className="flex items-center gap-2">
                  <div className="h-[3px] w-8 bg-[#3b82f6]" />
                  <span>누적 판매금액({currency})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-[3px] w-8 border-t-2 border-dashed border-[#9333ea]" />
                  <span>총 회원수(의뢰자)</span>
                </div>
              </div>
              <p className="text-[12px] font-medium text-[#98a2b3]">데이터 없는 월은 연결선 없음</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-7 shadow-sm">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#303443]">
              <span className="text-[14px]">📊</span> {activeYear}년 총 매출 ({currency})
            </div>
            <p className="mt-4 text-[24px] font-bold text-[#165cf9]">{formatMoney(yearlySalesSummary[currency].sales, currency)}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">그래프 선택 통화 기준 거래완료만 집계</p>
          </article>

          <article className="rounded-[14px] border border-[#f1f5f9] bg-white p-7 shadow-sm">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#303443]">
              <span className="text-[14px]">💼</span> {activeYear}년 플랫폼 수익 ({currency})
            </div>
            <p className="mt-4 text-[24px] font-bold text-[#ea580c]">{formatMoney(yearlySalesSummary[currency].commission, currency)}</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">그래프 선택 통화 기준 거래완료만 집계</p>
          </article>
        </section>
      </div>
    </div>
  );
}
