"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { formatCurrency, normalizeCurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { MasterLoadingState } from "./MasterLoadingState";
import { MasterTablePagination } from "./MasterTablePagination";
import { useIsClient } from "./useIsClient";

type ProductionRequest = {
  id: string;
  request_number: string;
  client_id: string;
  manufacturer_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_rate_percent: number | null;
  commission_amount: number | null;
  settlement_amount: number | null;
  commission_locked_at: string | null;
  currency_code: string | null;
  status: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ProductCostRow = {
  id: string;
  cost_price: number | null;
};

type ProductionTab = "all" | "new" | "waiting" | "producing" | "completed" | "delivered" | "refunded" | "cancelled";

const TABS: Array<{ id: ProductionTab; label: string }> = [
  { id: "all", label: "전체" },
  { id: "new", label: "신규요청" },
  { id: "waiting", label: "생산대기" },
  { id: "producing", label: "제조중" },
  { id: "completed", label: "제조완료" },
  { id: "delivered", label: "배송완료" },
  { id: "refunded", label: "환불" },
  { id: "cancelled", label: "요청취소" },
];
const PAGE_SIZE = 10;
const WAITING_STATUSES = ["reviewing", "payment_in_progress", "payment_completed", "production_waiting", "quoted", "approved"];
const PRODUCING_STATUSES = ["production_started", "production_in_progress", "ordered"];
const COMPLETED_STATUSES = ["manufacturing_completed", "completed"];
const DELIVERED_STATUSES = ["delivery_completed", "fulfilled"];

const MANUFACTURER_META: Record<string, string> = {
  "DOOGOBIO NZ": "NZ 뉴질랜드",
  "한미양행": "KR 대한민국",
};

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatQuantity(value: number) {
  return `${value.toLocaleString("ko-KR")}개`;
}

function formatMoney(value: number, currencyCode?: string | null) {
  const currency = normalizeCurrencyCode(currencyCode);
  const rounded = Math.round(value);

  if (currency === "NZD") {
    return `NZD ${rounded.toLocaleString("en-NZ")}`;
  }

  return formatCurrency(rounded, currency);
}

function getPaymentMethod(currencyCode?: string | null) {
  return normalizeCurrencyCode(currencyCode) === "KRW" ? "포트원" : "유트랜스퍼";
}

function getCostAmount(request: ProductionRequest, productCostMap: Map<string, number>) {
  const unitCost = Number(productCostMap.get(request.product_id) || 0);
  return Math.round(unitCost * Number(request.quantity || 0));
}

function getFeeAmount(request: ProductionRequest) {
  const storedFee = Number(request.commission_amount);
  if (Number.isFinite(storedFee) && storedFee > 0) return storedFee;
  const rate = Number(request.commission_rate_percent || 3);
  return Number(request.total_price || 0) * (rate / 100);
}

function getStatusMeta(status: string) {
  if (status === "pending") {
    return { label: "신규요청", badgeClass: "bg-[#E9F0FF] text-[#2563EB]" };
  }

  if (status === "approved") {
    return { label: "승인", badgeClass: "bg-[#E7FAEC] text-[#22B35E]" };
  }

  if (status === "payment_completed") {
    return { label: "결제완료", badgeClass: "bg-[#E7FAEC] text-[#22B35E]" };
  }

  if (WAITING_STATUSES.includes(status)) {
    return { label: "생산대기", badgeClass: "bg-[#FFF4D6] text-[#D88900]" };
  }

  if (status === "production_started") {
    return { label: "제조시작", badgeClass: "bg-[#FFEAD9] text-[#F97316]" };
  }

  if (PRODUCING_STATUSES.includes(status)) {
    return { label: "제조중", badgeClass: "bg-[#FFEAD9] text-[#F97316]" };
  }

  if (COMPLETED_STATUSES.includes(status)) {
    return { label: "제조완료", badgeClass: "bg-[#E1FAE8] text-[#1DAA54]" };
  }

  if (DELIVERED_STATUSES.includes(status)) {
    return { label: "배송완료", badgeClass: "bg-[#F2E4FF] text-[#B257F7]" };
  }

  if (status === "refunded") {
    return { label: "환불", badgeClass: "bg-[#FFE6E6] text-[#FF5A5F]" };
  }

  if (status === "request_cancelled") {
    return { label: "요청취소", badgeClass: "bg-[#F3F4F6] text-[#4B5563]" };
  }

  if (status === "rejected") {
    return { label: "거절", badgeClass: "bg-[#FFE6E6] text-[#FF5A5F]" };
  }

  return { label: "확인필요", badgeClass: "bg-[#F3F4F6] text-[#4B5563]" };
}

function matchesTab(status: string, tab: ProductionTab) {
  if (tab === "all") return true;
  if (tab === "new") return status === "pending";
  if (tab === "waiting") return WAITING_STATUSES.includes(status);
  if (tab === "producing") return PRODUCING_STATUSES.includes(status);
  if (tab === "completed") return COMPLETED_STATUSES.includes(status);
  if (tab === "delivered") return DELIVERED_STATUSES.includes(status);
  if (tab === "cancelled") return status === "request_cancelled";
  return status === "refunded";
}

function getMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function MasterProductionManagement({ refreshKey = 0 }: { refreshKey?: number }) {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ProductionTab>("all");
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [productCosts, setProductCosts] = useState<ProductCostRow[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const mounted = useIsClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const requestResult = await supabase
        .from("rfq_requests")
        .select(
          "id, request_number, client_id, manufacturer_name, product_id, product_name, quantity, unit_price, total_price, commission_rate_percent, commission_amount, settlement_amount, commission_locked_at, currency_code, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (requestResult.error) {
        console.error("Failed to fetch production requests:", requestResult.error.message);
        setLoading(false);
        return;
      }

      const nextRequests = (requestResult.data as ProductionRequest[] | null) || [];
      setRequests(nextRequests);

      const clientIds = Array.from(new Set(nextRequests.map((request) => request.client_id).filter(Boolean)));
      const productIds = Array.from(new Set(nextRequests.map((request) => request.product_id).filter(Boolean)));

      const [profileResult, productResult] = await Promise.all([
        clientIds.length
          ? supabase.from("profiles").select("id, full_name, email").in("id", clientIds)
          : Promise.resolve({ data: [], error: null }),
        productIds.length
          ? supabase.from("manufacturer_products").select("id, cost_price").in("id", productIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profileResult.error) {
        console.error("Failed to fetch profiles:", profileResult.error.message);
      } else {
        setProfiles((profileResult.data as ProfileRow[] | null) || []);
      }

      if (productResult.error) {
        console.error("Failed to fetch product costs:", productResult.error.message);
      } else {
        setProductCosts((productResult.data as ProductCostRow[] | null) || []);
      }

      setLoading(false);
    };

    void fetchData();
  }, [refreshKey]);

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map((profile) => [
        profile.id,
        {
          name: profile.full_name?.trim() || "회원",
          email: profile.email?.trim() || "kim@example.com",
        },
      ])
    );
  }, [profiles]);

  const productCostMap = useMemo(() => {
    return new Map(productCosts.map((product) => [product.id, Number(product.cost_price || 0)]));
  }, [productCosts]);

  const filteredRequests = useMemo(() => {
    const startRange = getMonthRange(startYear, startMonth).start;
    const endRange = getMonthRange(endYear, endMonth).end;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const createdAt = new Date(request.created_at);
      if (createdAt < startRange || createdAt > endRange) {
        return false;
      }

      if (!matchesTab(request.status, activeTab)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const requester = profileMap.get(request.client_id)?.name || "회원";
      const searchTargets = [
        request.request_number,
        requester,
        request.manufacturer_name,
        request.product_name,
      ];

      return searchTargets.some((target) => target.toLowerCase().includes(normalizedSearch));
    });
  }, [activeTab, endMonth, endYear, profileMap, requests, searchTerm, startMonth, startYear]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedRequests = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return filteredRequests.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRequests, visiblePage]);

  const summary = useMemo(() => {
    return {
      newCount: requests.filter((request) => request.status === "pending").length,
      waitingCount: requests.filter((request) => WAITING_STATUSES.includes(request.status)).length,
      producingCount: requests.filter((request) => PRODUCING_STATUSES.includes(request.status)).length,
      completedCount: requests.filter(
        (request) => COMPLETED_STATUSES.includes(request.status) || DELIVERED_STATUSES.includes(request.status)
      ).length,
    };
  }, [requests]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  if (!mounted) return null;

  return (
    <>
      <div className="flex flex-1 flex-col overflow-auto bg-[#F8FAFC] px-6 py-5">
        <div className="flex w-full flex-col gap-4">
          <section>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[20px] font-bold text-[#1F2A44]">
                <span className="text-[20px]">🏭</span>
                <h1>생산 관리</h1>
              </div>
              <p className="text-[14px] font-medium text-[#8C96A8]">두고커넥트 운영 관리 시스템</p>
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-4">
            {[
              {
                icon: "🆕",
                label: "신규 요청",
                value: `${summary.newCount}건`,
                wrap: "from-[#E9F2FF] to-[#F5F9FF]",
                border: "border-[#2F6BFF]/30",
                textClass: "text-[#2563EB]",
              },
              {
                icon: "⏳",
                label: "생산 대기",
                value: `${summary.waitingCount}건`,
                wrap: "from-[#FFF7DA] to-[#FFFBEF]",
                border: "border-[#F59E0B]/30",
                textClass: "text-[#EA7A00]",
              },
              {
                icon: "⚙️",
                label: "제조중",
                value: `${summary.producingCount}건`,
                wrap: "from-[#FFF1E3] to-[#FFF7F0]",
                border: "border-[#F97316]/30",
                textClass: "text-[#F97316]",
              },
              {
                icon: "✅",
                label: "제조완료·배송완료",
                value: `${summary.completedCount}건`,
                wrap: "from-[#E7FFF1] to-[#F3FFF7]",
                border: "border-[#22C55E]/30",
                textClass: "text-[#16A34A]",
              },
            ].map((card) => (
              <article
                key={card.label}
                className={`rounded-[18px] border ${card.border} bg-gradient-to-r ${card.wrap} px-4 py-3`}
              >
                <div className={`flex items-center gap-1.5 text-[12px] font-bold ${card.textClass}`}>
                  <span className="text-[12px]">{card.icon}</span>
                  <span>{card.label}</span>
                </div>
                <p className={`text-[30px] font-bold ${card.textClass}`}>{card.value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-[14px] border border-[#E8EDF3] bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#667085]">
                  <span className="text-[12px]">🔍</span>
                  <span>검색 (주문번호·의뢰자·제품·제조사)</span>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="검색어 입력..."
                    className="h-[40px] w-full rounded-full border border-[#E5EAF0] bg-white pl-11 pr-4 text-[13px] font-medium text-[#344054] outline-none placeholder:text-[#98A2B3]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2">
                  <div className="mb-2 flex items-center gap-1 text-[13px] font-bold text-[#667085] xl:mb-0">
                    <span className="text-[12px]">🗓️</span>
                    <span>시작</span>
                  </div>
                  <select
                    value={startYear}
                    onChange={(event) => {
                      setStartYear(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-[36px] rounded-[12px] border border-[#E5EAF0] bg-white px-3 text-[12px] font-bold text-[#344054] outline-none"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
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
                    className="h-[36px] rounded-[12px] border border-[#E5EAF0] bg-white px-3 text-[12px] font-bold text-[#344054] outline-none"
                  >
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>
                        {month}월
                      </option>
                    ))}
                  </select>
                </div>

                <span className="pb-2 text-[14px] font-bold text-[#98A2B3]">~</span>

                <div className="flex items-center gap-2">
                  <div className="mb-2 flex items-center gap-1 text-[12px] font-bold text-[#667085] xl:mb-0">
                    <span className="text-[12px]">🗓️</span>
                    <span>종료</span>
                  </div>
                  <select
                    value={endYear}
                    onChange={(event) => {
                      setEndYear(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-[36px] rounded-[12px] border border-[#E5EAF0] bg-white px-3 text-[12px] font-bold text-[#344054] outline-none"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
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
                    className="h-[36px] rounded-[12px] border border-[#E5EAF0] bg-white px-3 text-[12px] font-bold text-[#344054] outline-none"
                  >
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>
                        {month}월
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full px-4 py-1.5 text-[14px] font-bold transition ${isActive
                      ? "bg-[#2F6BFF] text-white"
                      : "border border-[#E3E8EF] bg-white text-[#667085]"
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <p className="text-[12px] text-[#98A2B3]">{filteredRequests.length}건</p>
          </section>

          <section className="overflow-hidden rounded-[14px] border border-[#E8EDF3] bg-white shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full w-full table-auto">
                <thead>
                  <tr className="border-b border-[#EEF2F6] text-left">
                    {[
                      "주문번호",
                      "날짜",
                      "의뢰자",
                      "제조사",
                      "제품",
                      "수량",
                      "원가",
                      "판매금액",
                      "결제방식",
                      "상태",
                      "",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 text-[12px] font-bold text-[#6a7282] whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center">
                        <MasterLoadingState variant="inline" />
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center text-[14px] font-semibold text-[#98A2B3]">
                        조회된 생산 관리 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map((request) => {
                      const statusMeta = getStatusMeta(request.status);
                      const requester = profileMap.get(request.client_id);

                      return (
                        <tr key={request.id} className="border-b border-[#F2F5F8] last:border-b-0 hover:bg-[#F8FAFC] transition">
                          <td className="px-4 py-2 text-[12px] text-[#667085] whitespace-nowrap">{request.request_number}</td>
                          <td className="px-4 py-2 text-[12px] text-[#667085] whitespace-nowrap">{formatDate(request.created_at)}</td>
                          <td className="px-4 py-2 text-[12px] font-semibold text-[#344054] whitespace-nowrap">{requester?.name || "회원"}</td>
                          <td className="px-4 py-2 text-[12px] text-[#4A5568] whitespace-nowrap">{request.manufacturer_name}</td>
                          <td className="px-4 py-2 text-[12px] text-[#4A5568] whitespace-nowrap">{request.product_name}</td>
                          <td className="px-4 py-2 text-[12px] text-[#4A5568] whitespace-nowrap">{formatQuantity(request.quantity)}</td>
                          <td className="px-4 py-2 text-[12px] text-[#7A8599] whitespace-nowrap">
                            {formatMoney(getCostAmount(request, productCostMap), request.currency_code)}
                          </td>
                          <td className="px-4 py-2 text-[12px] font-bold text-[#2F6BFF] whitespace-nowrap">
                            {formatMoney(request.total_price, request.currency_code)}
                          </td>
                          <td className="px-4 py-2 text-[12px] text-[#7A8599] whitespace-nowrap">
                            {getPaymentMethod(request.currency_code)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedRequestId(request.id)}
                              className="rounded-full bg-[#EEF4FF] px-3 py-1 text-[12px] font-bold text-[#2F6BFF] whitespace-nowrap"
                            >
                              인보이스
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <MasterTablePagination
              totalItems={filteredRequests.length}
              currentPage={visiblePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </section>
        </div>
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4 py-6">
          <div className="w-full max-w-[480px] overflow-hidden rounded-[18px] bg-white shadow-lg">
            <div className="bg-[#2457E6] px-6 py-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white/80">인보이스</p>
                  <h3 className="text-[20px] font-bold">{selectedRequest.request_number}</h3>
                  <p className="text-[12px] font-semibold text-white/80">{formatDate(selectedRequest.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequestId(null)}
                  className="rounded-full p-1 text-white/85 transition hover:bg-white/10"
                  aria-label="Close invoice"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[14px] bg-[#EEF4FF] px-3 py-2">
                  <p className="text-[11px] text-[#7A8599]">👤 의뢰자</p>
                  <p className="mt-1 text-[16px] font-bold text-[#24324A] truncate">
                    {profileMap.get(selectedRequest.client_id)?.name || "회원"}
                  </p>
                  <p className="text-[11px] font-semibold text-[#7A8599] truncate">
                    {profileMap.get(selectedRequest.client_id)?.email || "kim@example.com"}
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#EFFCF5] px-3 py-2">
                  <p className="text-[11px] text-[#7A8599]">🏭 제조사</p>
                  <p className="mt-1 text-[16px] font-bold text-[#24324A] truncate">{selectedRequest.manufacturer_name}</p>
                  <p className="text-[11px] font-semibold text-[#7A8599] truncate">
                    {MANUFACTURER_META[selectedRequest.manufacturer_name] || "KR 대한민국"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-[#E8EDF3] bg-white px-4 py-3">
                <div className="space-y-1.5">
                  {[
                    { label: "제품", value: selectedRequest.product_name },
                    { label: "수량", value: formatQuantity(selectedRequest.quantity) },
                    { label: "결제 방식", value: getPaymentMethod(selectedRequest.currency_code) },
                    { label: "원가 (제품 원가)", value: formatMoney(getCostAmount(selectedRequest, productCostMap), selectedRequest.currency_code) },
                    { label: "총 판매금액", value: formatMoney(selectedRequest.total_price, selectedRequest.currency_code), valueClass: "text-[#2F6BFF]" },
                    { label: `플랫폼 수수료 (${Number(selectedRequest.commission_rate_percent || 3)}%)`, value: formatMoney(getFeeAmount(selectedRequest), selectedRequest.currency_code), valueClass: "text-[#F08A00]" },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between gap-4 ${index < 2 ? "" : "border-t border-[#EEF2F6] pt-2.5"}`}
                    >
                      <p className="text-[14px] text-[#6a7282]">{item.label}</p>
                      <p className={`text-right text-[14px] font-bold ${item.valueClass || "text-[#24324A]"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequestId(null)}
                className="mt-5 h-[38px] w-full rounded-[16px] bg-[#2A61EA] text-[14px] font-bold text-white shadow-md active:scale-[0.98] transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
