"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MasterLoadingState } from "./MasterLoadingState";
import { MasterTablePagination } from "./MasterTablePagination";

type ManufacturingRequest = {
  id: string;
  request_number: string;
  client_id: string;
  manufacturer_name: string;
  product_name: string;
  quantity: number;
  status: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type StatusFilter = "all" | "new" | "approved" | "rejected";

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "new", label: "신규" },
  { id: "approved", label: "승인" },
  { id: "rejected", label: "거절/요청취소" },
];
const PAGE_SIZE = 10;

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

function getStatusMeta(status: string) {
  if (status === "pending") {
    return {
      label: "신규",
      badgeClass: "bg-[#E8F1FF] text-[#2563EB]",
    };
  }

  if (status === "rejected") {
    return {
      label: "거절",
      badgeClass: "bg-[#FFE8E8] text-[#FF4D4F]",
    };
  }

  if (status === "request_cancelled") {
    return {
      label: "요청취소",
      badgeClass: "bg-[#F3F4F6] text-[#4B5563]",
    };
  }

  return {
    label: "승인",
    badgeClass: "bg-[#E7FAEC] text-[#22B35E]",
  };
}

function matchesStatusFilter(status: string, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "new") return status === "pending";
  if (filter === "rejected") return status === "rejected" || status === "request_cancelled";
  return status !== "pending" && status !== "rejected" && status !== "request_cancelled";
}

function getMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function MasterManufacturingRequests({ refreshKey = 0 }: { refreshKey?: number }) {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<ManufacturingRequest[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [requestResult, profileResult] = await Promise.all([
        supabase
          .from("rfq_requests")
          .select("id, request_number, client_id, manufacturer_name, product_name, quantity, status, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name"),
      ]);

      if (requestResult.error) {
        console.error("Failed to fetch manufacturing requests:", requestResult.error.message);
      } else {
        setRequests((requestResult.data as ManufacturingRequest[] | null) || []);
      }

      if (profileResult.error) {
        console.error("Failed to fetch profiles:", profileResult.error.message);
      } else {
        setProfiles((profileResult.data as ProfileRow[] | null) || []);
      }

      setLoading(false);
    };

    void fetchData();
  }, [refreshKey]);

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.full_name?.trim() || "회원"])),
    [profiles]
  );

  const filteredRequests = useMemo(() => {
    const startRange = getMonthRange(startYear, startMonth).start;
    const endRange = getMonthRange(endYear, endMonth).end;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const createdAt = new Date(request.created_at);
      if (createdAt < startRange || createdAt > endRange) {
        return false;
      }

      if (!matchesStatusFilter(request.status, statusFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const requesterName = profileMap.get(request.client_id) || "회원";
      const searchTargets = [
        request.request_number,
        requesterName,
        request.product_name,
        request.manufacturer_name,
      ];

      return searchTargets.some((target) => target.toLowerCase().includes(normalizedSearch));
    });
  }, [endMonth, endYear, profileMap, requests, searchTerm, startMonth, startYear, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedRequests = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return filteredRequests.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRequests, visiblePage]);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#F8FAFC] px-7 py-6">
      <div className="flex w-full flex-col gap-4">
        <section>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[20px] font-bold text-[#1F2A44]">
              <span className="text-[20px]">📋</span>
              <h1>제조 요청</h1>
            </div>
            <p className="text-[14px] font-medium text-[#8C96A8]">두고커넥트 운영 관리 시스템</p>
          </div>
        </section>

        <section className="rounded-[14px] border border-[#E8EDF3] bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#667085]">
                <span className="text-[13px]">🔍</span>
                <span>검색</span>
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
                  placeholder="요청번호·의뢰자·제품·제조사 검색..."
                  className="h-[42px] w-full rounded-full border border-[#E5EAF0] bg-white pl-11 pr-4 text-[14px] font-medium text-[#344054] outline-none placeholder:text-[#98A2B3]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2">
                <div className="mb-2 flex items-center gap-1 text-[13px] font-bold text-[#667085] xl:mb-0">
                  <span className="text-[13px]">🗓️</span>
                  <span>시작</span>
                </div>
                <select
                  value={startYear}
                  onChange={(event) => {
                    setStartYear(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-[36px] rounded-[10px] border border-[#E5EAF0] bg-white px-3 text-[13px] font-bold text-[#344054] outline-none"
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
                  className="h-[36px] rounded-[10px] border border-[#E5EAF0] bg-white px-3 text-[13px] font-bold text-[#344054] outline-none"
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
                <div className="mb-2 flex items-center gap-1 text-[13px] font-bold text-[#667085] xl:mb-0">
                  <span className="text-[13px]">🗓️</span>
                  <span>종료</span>
                </div>
                <select
                  value={endYear}
                  onChange={(event) => {
                    setEndYear(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-[36px] rounded-[10px] border border-[#E5EAF0] bg-white px-3 text-[13px] font-bold text-[#344054] outline-none"
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
                  className="h-[36px] rounded-[10px] border border-[#E5EAF0] bg-white px-3 text-[13px] font-bold text-[#344054] outline-none"
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
          <div className="flex items-center gap-2">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
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

        <section className="overflow-hidden rounded-[14px] border border-[#E8EDF3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-[#EEF2F6] text-left">
                  {[
                    "요청번호",
                    "날짜",
                    "의뢰자",
                    "제품",
                    "수량",
                    "제조사",
                    "상태",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 text-[12px] font-bold text-[#667085]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <MasterLoadingState variant="inline" />
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-[14px] font-semibold text-[#98A2B3]">
                      조회된 제조 요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => {
                    const statusMeta = getStatusMeta(request.status);

                    return (
                      <tr key={request.id} className="border-b border-[#F2F5F8] last:border-b-0">
                        <td className="px-4 py-3 text-[12px] font-bold text-[#667085]">{request.request_number}</td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-[#667085]">{formatDate(request.created_at)}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-[#344054]">{profileMap.get(request.client_id) || "회원"}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-[#4A5568]">{request.product_name}</td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-[#4A5568]">{formatQuantity(request.quantity)}</td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-[#4A5568]">{request.manufacturer_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-extrabold ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
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
  );
}
