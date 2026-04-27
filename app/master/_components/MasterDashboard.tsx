"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { type CurrencyCode, formatCurrency, normalizeCurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { MasterLoadingState } from "./MasterLoadingState";
import { useIsClient } from "./useIsClient";

type DashboardRequest = {
  id: string;
  request_number: string;
  client_id: string;
  manufacturer_name: string;
  product_name: string;
  status: string;
  total_price: number;
  commission_rate_percent: number | null;
  commission_amount: number | null;
  settlement_amount: number | null;
  commission_locked_at: string | null;
  currency_code: string | null;
  created_at: string;
};

type DashboardProfile = {
  id: string;
  full_name: string | null;
  role: "master" | "partner" | "manufacturer" | "member" | null;
};

type DashboardPartnerRequest = {
  id: string;
  status: string;
  created_at: string;
};

type DashboardDispute = {
  id: string;
  dispute_number: string;
  applicant_name: string;
  reason: string;
  status: "new" | "in_progress" | "resolved" | "disputing" | "refunded";
  created_at: string;
};

type DashboardAuditLog = {
  rfq_request_id: string;
  next_status: string | null;
  created_at: string;
};

interface MasterDashboardProps {
  refreshKey?: number;
  onOpenDisputeCenter?: () => void;
}

const MONTH_OFFSETS = [0, 1, 2, 3];
const SALES_RECORDED_STATUSES = new Set([
  "payment_completed",
  "ordered",
  "manufacturing_completed",
  "delivery_completed",
  "completed",
  "fulfilled",
]);

function getSalesRecordedAt(request: DashboardRequest, salesRecordedAtMap: Map<string, string>) {
  return salesRecordedAtMap.get(request.id) || request.commission_locked_at || request.created_at;
}

function isSalesRecordedRequest(request: DashboardRequest) {
  return SALES_RECORDED_STATUSES.has(request.status);
}

const COPY = {
  dashboard: "대시보드",
  subtitle: "두고커넥트 운영 관리 시스템",
  greeting: "안녕하세요, 관리자님",
  greetingTail: "두고커넥트 운영 현황입니다.",
  currentMonth: "이번달",
  baseLabel: "기준",
  loading: "대시보드 데이터를 불러오는 중입니다.",
  memberFallback: "회원",
  topCards: [
    {
      icon: "📋",
      label: "신규 요청",
      subLabel: "미처리 포함",
      wrap: "from-[#E7F0FF] to-[#F4F8FF]",
      valueClass: "text-[#2563EB]",
    },
    {
      icon: "🏭",
      label: "생산 진행중",
      subLabel: "현재 제조중",
      wrap: "from-[#FFF3CF] to-[#FFF9EB]",
      valueClass: "text-[#EA7A00]",
    },
    {
      icon: "👥",
      label: "활성 회원수",
      subLabel: "의뢰자 기준",
      wrap: "from-[#F4EAFE] to-[#F8F3FF]",
      valueClass: "text-[#9333EA]",
    },
    {
      icon: "📩",
      label: "미답변 문의",
      subLabel: "제조사 입점 문의",
      wrap: "from-[#FFECEF] to-[#FFF6F7]",
      valueClass: "text-[#F43F5E]",
    },
  ],
  salesTitle: "매출 현황",
  salesCards: {
    orders: "총 주문 횟수",
    ordersDesc: "",
    cost: "원가 매출 (제품 원가)",
    costDesc: "제조 원가 기준",
    revenue: "실시간 매출 (총 판매금액)",
    revenueDesc: "의뢰자 결제 기준",
    fee: "수수료 수익",
    feeDesc: "거래별 확정 수수료",
    daily: "일별",
    dailyTail: "총 판매금액 (마우스 오버 시 금액 표시)",
  },
  orderStatus: "주문 현황",
  total: "총",
  statusRows: {
    newRequest: "신규 요청",
    producing: "제조 진행중",
    completed: "제조 완료",
    delivered: "배송 완료",
  },
  sideCards: [
    {
      title: "🆕 신규 요청",
      desc: "미처리 견적 요청",
      accent: "text-[#2563EB]",
      bg: "bg-[#DBE9FE]",
      border: "border-l-[#2F6BFF]",
      wrap: "from-[#E9F2FF] to-[#F5F9FF]",
    },
    {
      title: "⏳ 생산 대기",
      desc: "승인 후 제조 시작 대기",
      accent: "text-[#EA7A00]",
      bg: "bg-[#FEF3C7]",
      border: "border-l-[#F59E0B]",
      wrap: "from-[#FFF7DA] to-[#FFFBEF]",
    },
    {
      title: "⚙️ 제조중",
      desc: "현재 공장 제조 진행중",
      accent: "text-[#F97316]",
      bg: "bg-[#FFEDD5]",
      border: "border-l-[#F97316]",
      wrap: "from-[#FFF1E3] to-[#FFF7F0]",
    },
    {
      title: "✅ 제조완료 · 배송완료",
      desc: "이달 누적 완료 건수",
      accent: "text-[#16A34A]",
      bg: "bg-[#DCFCE7]",
      border: "border-l-[#22C55E]",
      wrap: "from-[#E7FFF1] to-[#F3FFF7]",
    },
  ],
  recentRequests: "최근 요청 목록",
  recentAlerts: "최근 분쟁 알림",
  more: "더보기 →",
  table: {
    requestNumber: "요청번호",
    requester: "의뢰자",
    product: "제품",
    manufacturer: "제조사",
    status: "상태",
    disputeNumber: "분쟁번호",
    applicant: "신청자",
    content: "내용",
  },
} as const;

function getPeriodMeta(baseYear: number, baseMonth: number, offset: number) {
  const date = new Date(baseYear, baseMonth - 1 - offset, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function formatCompactMoney(value: number, currency: CurrencyCode) {
  const roundedValue = Math.round(value);

  if (currency === "NZD") {
    return `NZD ${roundedValue.toLocaleString("en-NZ")}`;
  }

  return formatCurrency(roundedValue, currency);
}

function getGraphBarClass(currency: CurrencyCode) {
  if (currency === "KRW") {
    return "bg-[#4de2b3] hover:bg-[#32d8a3]";
  }

  if (currency === "USD") {
    return "bg-[#ffb25b] hover:bg-[#f59a2f]";
  }

  return "bg-[#7EB1F0] hover:bg-[#5F9BEC]";
}

function formatCount(value: number) {
  return `${value}건`;
}

function formatPeople(value: number) {
  return `${value}명`;
}

function getRequestStatusMeta(status: string) {
  switch (status) {
    case "pending":
      return { label: "신규", badge: "bg-[#E8F1FF] text-[#2563EB]" };
    case "reviewing":
    case "quoted":
      return { label: "승인", badge: "bg-[#E8FFF1] text-[#16A34A]" };
    case "ordered":
      return { label: "진행중", badge: "bg-[#FFF4D6] text-[#EA7A00]" };
    case "completed":
    case "fulfilled":
      return { label: "완료", badge: "bg-[#F1E8FF] text-[#8B5CF6]" };
    case "rejected":
      return { label: "거절", badge: "bg-[#FFE3E3] text-[#EF4444]" };
    case "request_cancelled":
      return { label: "요청취소", badge: "bg-[#F3F4F6] text-[#4B5563]" };
    default:
      return { label: "대기", badge: "bg-[#F3F4F6] text-[#6B7280]" };
  }
}

function getDisputeStatusMeta(status: DashboardDispute["status"]) {
  switch (status) {
    case "in_progress":
      return { label: "처리중", badge: "bg-[#dbeafe] text-[#2563eb]" };
    case "resolved":
      return { label: "해결됨", badge: "bg-[#dcfce7] text-[#16a34a]" };
    case "disputing":
      return { label: "분쟁중", badge: "bg-[#f3e8ff] text-[#9333ea]" };
    case "refunded":
      return { label: "환불완료", badge: "bg-[#f1f5f9] text-[#475569]" };
    case "new":
    default:
      return { label: "신규", badge: "bg-[#fee2e2] text-[#dc2626]" };
  }
}

export function MasterDashboard({ refreshKey = 0, onOpenDisputeCenter }: MasterDashboardProps) {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("NZD");
  const [isSalesGraphOpen, setIsSalesGraphOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<DashboardPartnerRequest[]>([]);
  const [disputes, setDisputes] = useState<DashboardDispute[]>([]);
  const [auditLogs, setAuditLogs] = useState<DashboardAuditLog[]>([]);
  const mounted = useIsClient();

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);

      const [requestResult, profileResult, partnerResult, disputeResult, auditResult] = await Promise.all([
        supabase
          .from("rfq_requests")
          .select("id, request_number, client_id, manufacturer_name, product_name, status, total_price, commission_rate_percent, commission_amount, settlement_amount, commission_locked_at, currency_code, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, role"),
        supabase.from("partner_requests").select("id, status, created_at").order("created_at", { ascending: false }),
        supabase
          .from("master_disputes")
          .select("id, dispute_number, applicant_name, reason, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("rfq_audit_logs")
          .select("rfq_request_id, next_status, created_at")
          .in("next_status", Array.from(SALES_RECORDED_STATUSES))
          .order("created_at", { ascending: true }),
      ]);

      if (requestResult.error) {
        console.error("Failed to fetch dashboard requests:", requestResult.error.message);
      } else {
        setRequests((requestResult.data as DashboardRequest[] | null) || []);
      }

      if (profileResult.error) {
        console.error("Failed to fetch dashboard profiles:", profileResult.error.message);
      } else {
        setProfiles((profileResult.data as DashboardProfile[] | null) || []);
      }

      if (partnerResult.error) {
        console.error("Failed to fetch dashboard partner requests:", partnerResult.error.message);
      } else {
        setPartnerRequests((partnerResult.data as DashboardPartnerRequest[] | null) || []);
      }

      if (disputeResult.error) {
        console.error("Failed to fetch dashboard disputes:", disputeResult.error.message);
      } else {
        setDisputes((disputeResult.data as DashboardDispute[] | null) || []);
      }

      if (auditResult.error) {
        console.error("Failed to fetch dashboard audit logs:", auditResult.error.message);
      } else {
        setAuditLogs((auditResult.data as DashboardAuditLog[] | null) || []);
      }

      setLoading(false);
    };

    void fetchDashboard();
  }, [refreshKey]);

  const selectedPeriod = useMemo(
    () => getPeriodMeta(selectedYear, currentMonth, selectedMonthOffset),
    [currentMonth, selectedMonthOffset, selectedYear]
  );

  const monthRequests = useMemo(() => {
    const { start, end } = getMonthDateRange(selectedPeriod.year, selectedPeriod.month);
    return requests.filter((request) => {
      const createdAt = new Date(request.created_at);
      return createdAt >= start && createdAt <= end;
    });
  }, [requests, selectedPeriod.month, selectedPeriod.year]);

  const salesRecordedAtMap = useMemo(() => {
    const recordedAtMap = new Map<string, string>();
    auditLogs.forEach((log) => {
      if (!log.next_status || !SALES_RECORDED_STATUSES.has(log.next_status) || recordedAtMap.has(log.rfq_request_id)) {
        return;
      }
      recordedAtMap.set(log.rfq_request_id, log.created_at);
    });
    return recordedAtMap;
  }, [auditLogs]);

  const monthSalesRequests = useMemo(() => {
    const { start, end } = getMonthDateRange(selectedPeriod.year, selectedPeriod.month);
    return requests.filter((request) => {
      if (!isSalesRecordedRequest(request)) return false;
      const recordedAt = new Date(getSalesRecordedAt(request, salesRecordedAtMap));
      return recordedAt >= start && recordedAt <= end;
    });
  }, [requests, salesRecordedAtMap, selectedPeriod.month, selectedPeriod.year]);

  const profileNameMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.full_name?.trim() || COPY.memberFallback])),
    [profiles]
  );

  const topSummary = useMemo(() => {
    const newRequests = monthRequests.filter((request) => request.status === "pending").length;
    const producing = monthRequests.filter((request) => ["reviewing", "quoted", "ordered"].includes(request.status)).length;
    const activeMembers = profiles.filter((profile) => profile.role && profile.role !== "master").length;
    const unansweredPartners = partnerRequests.filter((request) => request.status === "pending").length;

    return {
      newRequests,
      producing,
      activeMembers,
      unansweredPartners,
    };
  }, [monthRequests, partnerRequests, profiles]);

  const salesSummary = useMemo(() => {
    const currencyRequests = monthSalesRequests.filter(
      (request) => normalizeCurrencyCode(request.currency_code) === currency
    );
    const revenue = currencyRequests.reduce((sum, request) => sum + Number(request.total_price || 0), 0);
    const cost = revenue * 0.825;
    const fee = currencyRequests.reduce((sum, request) => {
      const storedFee = Number(request.commission_amount);
      if (Number.isFinite(storedFee) && storedFee > 0) return sum + storedFee;
      const rate = Number(request.commission_rate_percent || 3);
      return sum + Number(request.total_price || 0) * (rate / 100);
    }, 0);

    return {
      orderCount: currencyRequests.length,
      cost,
      revenue,
      fee,
    };
  }, [currency, monthSalesRequests]);

  const allMonthBars = useMemo(() => {
    const totals = new Map<number, number>();
    const currencyRequests = monthSalesRequests.filter(
      (request) => normalizeCurrencyCode(request.currency_code) === currency
    );

    currencyRequests.forEach((request) => {
      const recordedAt = new Date(getSalesRecordedAt(request, salesRecordedAtMap));
      const day = recordedAt.getDate();
      totals.set(day, (totals.get(day) || 0) + Number(request.total_price || 0));
    });

    const daysInMonth = new Date(selectedPeriod.year, selectedPeriod.month, 0).getDate();
    const visibleDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    const max = Math.max(...visibleDays.map((day) => totals.get(day) || 0), 1);

    return visibleDays.map((day) => ({
      day,
      label: `${selectedPeriod.month}/${day}`,
      value: totals.get(day) || 0,
      height: totals.get(day) ? Math.round(((totals.get(day) || 0) / max) * 76) : 0,
    }));
  }, [currency, monthSalesRequests, salesRecordedAtMap, selectedPeriod.month, selectedPeriod.year]);

  const dailyBars = useMemo(() => {
    const daysInMonth = allMonthBars.length;
    const anchorDay =
      selectedPeriod.year === currentYear && selectedPeriod.month === currentMonth
        ? Math.min(today.getDate(), daysInMonth)
        : Math.min(today.getDate(), daysInMonth);
    const startDay = Math.max(1, anchorDay - 9);

    return allMonthBars.filter((bar) => bar.day >= startDay && bar.day <= anchorDay);
  }, [allMonthBars, currentMonth, currentYear, selectedPeriod.month, selectedPeriod.year, today]);

  const statusSummary = useMemo(() => {
    const pending = monthRequests.filter((request) => request.status === "pending").length;
    const producing = monthRequests.filter((request) =>
      ["production_started", "production_in_progress", "ordered"].includes(request.status)
    ).length;
    const completed = monthRequests.filter((request) =>
      ["manufacturing_completed", "completed"].includes(request.status)
    ).length;
    const delivered = monthRequests.filter((request) =>
      ["delivery_completed", "fulfilled"].includes(request.status)
    ).length;
    const total = pending + producing + completed + delivered;

    return {
      pending,
      producing,
      completed,
      delivered,
      total,
    };
  }, [monthRequests]);

  const recentRequests = useMemo(() => requests.slice(0, 5), [requests]);
  const recentAlerts = useMemo(() => disputes.slice(0, 5), [disputes]);

  if (!mounted) return null;

  if (loading) {
    return <MasterLoadingState message={COPY.loading} />;
  }

  return (
    <>
      <div className="flex flex-1 flex-col overflow-auto bg-[#f9fafb] px-5 py-6 lg:px-7">
        <div className="flex w-full flex-col gap-5">
          <section className="">
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 text-[20px] font-bold text-[#1F2A44]">
                  <span className="text-[20px]">🏠</span>
                  <span>{COPY.dashboard}</span>
                </div>
                <p className="mt-1 text-[15px] font-medium text-[#8C96A8]">{COPY.subtitle}</p>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h1 className="text-[16px] font-bold text-[#24324A]">
                    {COPY.greeting} <span className="mx-1">👋</span> {COPY.greetingTail}
                  </h1>
                </div>
                <p className="text-[15px] font-semibold text-[#B0B8C6]">
                  {COPY.baseLabel}: {selectedPeriod.year}
                  {"\uB144"} {selectedPeriod.month}
                  {"\uC6D4"}
                </p>
              </div>
              {/*  */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-full bg-[#f4f6f8] p-1">
                  {[currentYear, currentYear - 1].map((year) => {
                    const isActive = selectedYear === year;
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => setSelectedYear(year)}
                        className={`relative rounded-full px-6 py-1.5 text-[15px] font-extrabold transition-all duration-200 ${isActive
                          ? "bg-white text-[#2563eb] shadow-sm"
                          : "text-[#64748b] hover:text-[#1e293b]"
                          }`}
                      >
                        {year}
                        {"\uB144"}
                      </button>
                    );
                  })}
                </div>

                {MONTH_OFFSETS.map((offset) => {
                  const meta = getPeriodMeta(selectedYear, currentMonth, offset);
                  const isActive = selectedMonthOffset === offset;
                  const label = offset === 0 ? COPY.currentMonth : `${meta.month}${"\uC6D4"}`;

                  return (
                    <button
                      key={`${meta.year}-${meta.month}`}
                      type="button"
                      onClick={() => setSelectedMonthOffset(offset)}
                      className={`rounded-full border px-5 py-1.5 text-[14px] font-extrabold shadow-sm transition ${isActive
                        ? "border-[#2f6bff] bg-[#2f6bff] text-white"
                        : "border-[#dfe5ef] bg-white text-[#667085] hover:bg-[#f8fafc]"
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            {COPY.topCards.map((card, index) => {
              const value =
                index === 0
                  ? formatCount(topSummary.newRequests)
                  : index === 1
                    ? formatCount(topSummary.producing)
                    : index === 2
                      ? formatPeople(topSummary.activeMembers)
                      : formatCount(topSummary.unansweredPartners);

              return (
                <article
                  key={card.label}
                  className={`rounded-[14px] shadow-sm border border-[#E7ECF3] bg-gradient-to-r ${card.wrap} px-5 py-4`}
                >
                  <div className="flex items-center gap-2 text-[12px] font-semi-bold text-[#667085]">
                    <span className="text-[20px]">{card.icon}</span>
                    <span>{card.label}</span>
                  </div>
                  <p className={`mt-2 text-[24px] font-black ${card.valueClass}`}>{value}</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#A0A8B8]">{card.subLabel}</p>
                </article>
              );
            })}
          </section>

          <section className="rounded-[14px] border border-[#E7ECF3] bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#24324A]">
                  <span className="text-[16px]">💰</span>
                  {COPY.salesTitle} ({selectedMonthOffset === 0 ? COPY.currentMonth : `${selectedPeriod.month}${"\uC6D4"}`})
                </h2>

                <div className="inline-flex rounded-full bg-[#F2F4F7] p-1 shadow-inner">
                  {(["NZD", "KRW", "USD"] as CurrencyCode[]).map((option) => {
                    const isActive = currency === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCurrency(option)}
                        className={`rounded-full px-5 py-1 text-[12px] font-black transition ${isActive ? "bg-white text-[#2F6BFF] shadow-sm" : "text-[#667085]"
                          }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
                {[
                  {
                    icon: <span className="text-[14px]">🛒</span>,
                    title: COPY.salesCards.orders,
                    value: formatCount(salesSummary.orderCount),
                    desc: COPY.salesCards.ordersDesc,
                    border: "border-[#E7ECF3]",
                  },
                  {
                    icon: <span className="text-[14px]">📦</span>,
                    title: COPY.salesCards.cost,
                    value: formatCompactMoney(salesSummary.cost, currency),
                    desc: COPY.salesCards.costDesc,
                    border: "border-[#E7ECF3]",
                  },
                  {
                    icon: <span className="text-[14px]">📈</span>,
                    title: COPY.salesCards.revenue,
                    value: formatCompactMoney(salesSummary.revenue, currency),
                    desc: COPY.salesCards.revenueDesc,
                    border: "border-[#D9F5E2]",
                    valueClass: "text-[#00a63e]",
                  },
                  {
                    icon: <span className="text-[14px]">⚡</span>,
                    title: COPY.salesCards.fee,
                    value: formatCompactMoney(salesSummary.fee, currency),
                    desc: COPY.salesCards.feeDesc,
                    border: "border-[#FFE8BF]",
                    valueClass: "text-[#EA7A00]",
                  },
                ].map((item) => (
                  <article key={item.title} className={`rounded-[14px] border ${item.border} bg-[#f9fafb] px-5 py-3`}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#667085]">
                      <span className="text-[#98A2B3]">{item.icon}</span>
                      <span>{item.title}</span>
                    </div>
                    <p className={`mt-2 text-[18px] font-bold  ${item.valueClass || ""}`}>{item.value}</p>
                    <p className="mt-1 text-[9px] font-semibold text-[#A0A8B8]">{item.desc}</p>
                  </article>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsSalesGraphOpen(true)}
                className="block w-full px-5 py-5 text-left"
              >
                <p className="text-[11px] font-bold text-[#98A2B3]">
                  {COPY.salesCards.daily} {currency} {COPY.salesCards.dailyTail}
                </p>
                <div className="mt-6 grid grid-cols-10 items-end gap-1.5 lg:gap-2">
                  {dailyBars.map((bar) => (
                    <div key={bar.day} className="flex flex-col items-center gap-2">
                      <div className="flex h-[84px] w-full items-end">
                        <div className="group relative flex w-full justify-center">
                          {/* Custom Tooltip */}
                          {bar.height > 0 && (
                            <div className="pointer-events-none absolute bottom-full mb-2 hidden flex-col items-center group-hover:flex z-10">
                              <div className="whitespace-nowrap rounded-lg bg-[#1E293B] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                                {formatCompactMoney(bar.value, currency)}
                              </div>
                              <div className="-mt-1 h-2 w-2 rotate-45 bg-[#1E293B]" />
                            </div>
                          )}
                          {/* Bar */}
                          {bar.height > 0 ? (
                            <div
                              className={`w-full rounded-t-[6px] transition ${getGraphBarClass(currency)}`}
                              style={{ height: `${bar.height}px` }}
                            />
                          ) : null}
                        </div>
                      </div>
                      <span className="text-[9px] text-[#A0A8B8]">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </button>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_0.98fr]">
            <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#24324A]">
                  <span className="text-[14px]">📊</span>
                  {COPY.orderStatus}
                </h2>
                <span className="text-[12px] font-bold text-[#B0B8C6]">
                  {COPY.total} {formatCount(statusSummary.total)}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {[
                  {
                    label: COPY.statusRows.newRequest,
                    count: statusSummary.pending,
                    color: "bg-[#3B82F6]",
                    percent: statusSummary.total ? Math.round((statusSummary.pending / statusSummary.total) * 100) : 0,
                  },
                  {
                    label: COPY.statusRows.producing,
                    count: statusSummary.producing,
                    color: "bg-[#FFB703]",
                    percent: statusSummary.total ? Math.round((statusSummary.producing / statusSummary.total) * 100) : 0,
                  },
                  {
                    label: COPY.statusRows.completed,
                    count: statusSummary.completed,
                    color: "bg-[#22C55E]",
                    percent: statusSummary.total ? Math.round((statusSummary.completed / statusSummary.total) * 100) : 0,
                  },
                  {
                    label: COPY.statusRows.delivered,
                    count: statusSummary.delivered,
                    color: "bg-[#C084FC]",
                    percent: statusSummary.total ? Math.round((statusSummary.delivered / statusSummary.total) * 100) : 0,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-semibold text-[#667085]">
                      <span>{item.label}</span>
                      <span>
                        {formatCount(item.count)} ({item.percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#F2F4F7]">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex h-3 overflow-hidden rounded-full bg-[#F2F4F7]">
                  {[
                    { value: statusSummary.pending, color: "bg-[#3B82F6]" },
                    { value: statusSummary.producing, color: "bg-[#FFB703]" },
                    { value: statusSummary.completed, color: "bg-[#22C55E]" },
                    { value: statusSummary.delivered, color: "bg-[#C084FC]" },
                  ].map((segment, index) => (
                    <div
                      key={`${segment.color}-${index}`}
                      className={segment.color}
                      style={{ width: `${statusSummary.total ? (segment.value / statusSummary.total) * 100 : 0}%` }}
                    />
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-[12px] font-semibold text-[#667085]">
                  {[
                    { color: "bg-[#3B82F6]", label: COPY.statusRows.newRequest },
                    { color: "bg-[#FFB703]", label: COPY.statusRows.producing },
                    { color: "bg-[#22C55E]", label: COPY.statusRows.completed },
                    { color: "bg-[#C084FC]", label: COPY.statusRows.delivered },
                  ].map((legend) => (
                    <span key={legend.label} className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${legend.color}`} />
                      {legend.label}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <div className="space-y-4">
              {COPY.sideCards.map((item, index) => {
                const value =
                  index === 0
                    ? statusSummary.pending
                    : index === 1
                      ? statusSummary.producing
                      : index === 2
                        ? statusSummary.completed
                        : statusSummary.delivered;

                return (
                  <article
                    key={item.title}
                    className={`rounded-[24px] border border-[#f4f5f7] border-l-4 ${item.border} bg-gradient-to-r ${item.wrap} px-5 py-4`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[14px] font-bold text-[#24324A]">{item.title}</div>
                        <p className="mt-1 text-[11px] font-semibold text-[#98A2B3]">{item.desc}</p>
                      </div>
                      <div className={`rounded-full ${item.bg} px-4 py-2 text-[18px] font-bold ${item.accent}`}>
                        {formatCount(value)}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#24324A]">
              <span className="text-[16px]">📋</span>
              {COPY.recentRequests}
            </h2>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-[#EEF2F6] text-[12px] font-bold text-[#6a7282]">
                    <th className="px-2 py-3">{COPY.table.requestNumber}</th>
                    <th className="px-2 py-3">{COPY.table.requester}</th>
                    <th className="px-2 py-3">{COPY.table.product}</th>
                    <th className="px-2 py-3">{COPY.table.manufacturer}</th>
                    <th className="px-2 py-3">{COPY.table.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request) => {
                    const statusMeta = getRequestStatusMeta(request.status);
                    return (
                      <tr key={request.id} className="border-b border-[#F5F7FA] text-[14px]  text-[#475467] last:border-b-0">
                        <td className="px-2 py-3">{request.request_number}</td>
                        <td className="px-2 py-3">{profileNameMap.get(request.client_id) || COPY.memberFallback}</td>
                        <td className="px-2 py-3">{request.product_name}</td>
                        <td className="px-2 py-3">{request.manufacturer_name}</td>
                        <td className="px-2 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#24324A]">
                <span className="text-[16px]">⚖️</span>
                {COPY.recentAlerts}
              </h2>
              <button
                type="button"
                onClick={onOpenDisputeCenter}
                className="rounded-full border border-[#D8E7FF] bg-white px-4 py-1.5 text-[12px] font-bold text-[#2F6BFF] transition hover:bg-[#F6F9FF]"
              >
                {COPY.more}
              </button>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-[#EEF2F6] text-[12px] font-bold text-[#6a7282]">
                    <th className="px-2 py-3">{COPY.table.disputeNumber}</th>
                    <th className="px-2 py-3">{COPY.table.applicant}</th>
                    <th className="px-2 py-3">{COPY.table.content}</th>
                    <th className="px-2 py-3">{COPY.table.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.map((alert) => {
                    const statusMeta = getDisputeStatusMeta(alert.status);
                    return (
                      <tr key={alert.id} className="border-b border-[#F5F7FA] text-[15px]  text-[#475467] last:border-b-0">
                        <td className="px-2 py-4">{alert.dispute_number}</td>
                        <td className="px-2 py-4">{alert.applicant_name}</td>
                        <td className="px-2 py-4">{alert.reason}</td>
                        <td className="px-2 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {isSalesGraphOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="flex max-h-[calc(100vh-48px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[20px] border border-[#E7ECF3] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] px-6 py-5">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-[#24324A]">
                <span className="text-[16px]">💰</span>
                {COPY.salesTitle} ({selectedMonthOffset === 0 ? COPY.currentMonth : `${selectedPeriod.month}${"\uC6D4"}`})
              </h3>
              <button
                type="button"
                onClick={() => setIsSalesGraphOpen(false)}
                className="rounded-full p-2 text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#191F28]"
                aria-label="Close sales graph"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto px-6 py-6">
              <div className="min-w-[980px]">
                <p className="text-[11px] font-bold text-[#98A2B3]">
                  {COPY.salesCards.daily} {currency} {COPY.salesCards.dailyTail}
                </p>
                <div
                  className="mt-6 grid items-end gap-2"
                  style={{ gridTemplateColumns: `repeat(${allMonthBars.length}, minmax(0, 1fr))` }}
                >
                  {allMonthBars.map((bar) => (
                    <div key={bar.day} className="flex flex-col items-center gap-2">
                      <div className="flex h-[160px] w-full items-end">
                        <div className="group relative flex w-full justify-center">
                          {bar.height > 0 ? (
                            <div className="pointer-events-none absolute bottom-full mb-2 hidden flex-col items-center group-hover:flex z-10">
                              <div className="whitespace-nowrap rounded-lg bg-[#1E293B] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                                {formatCompactMoney(bar.value, currency)}
                              </div>
                              <div className="-mt-1 h-2 w-2 rotate-45 bg-[#1E293B]" />
                            </div>
                          ) : null}
                          {bar.height > 0 ? (
                            <div
                              className={`w-full rounded-t-[6px] transition ${getGraphBarClass(currency)}`}
                              style={{ height: `${Math.max(bar.height * 2, 8)}px` }}
                            />
                          ) : null}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#A0A8B8]">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
