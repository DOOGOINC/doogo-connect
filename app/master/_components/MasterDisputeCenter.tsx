"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { MasterLoadingState } from "./MasterLoadingState";
import { MasterTablePagination } from "./MasterTablePagination";
import { X } from "lucide-react";

type DisputeStatus = "new" | "in_progress" | "resolved" | "disputing" | "refunded";

type DisputeRow = {
  id: string;
  dispute_number: string;
  applicant_name: string;
  counterparty_name: string;
  reason: string;
  amount: number;
  currency_code: "KRW" | "NZD" | "USD";
  status: DisputeStatus;
  created_at: string;
  detail: string | null;
  request_id?: string | null;
};

interface MasterDisputeCenterProps {
  refreshKey?: number;
  onOpenSupportRoom?: (roomId: string) => void;
}

type DisputeFilter = "all" | DisputeStatus;

const STATUS_TABS: Array<{ id: DisputeFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "new", label: "신규" },
  { id: "in_progress", label: "해결중" },
  { id: "disputing", label: "분쟁중" },
  { id: "resolved", label: "해결됨" },
  { id: "refunded", label: "환불완료" },
];

const STATUS_META: Record<DisputeStatus, { label: string; className: string }> = {
  new: { label: "신규", className: "bg-[#eaf2ff] text-[#2563eb]" },
  in_progress: { label: "해결중", className: "bg-[#fff1db] text-[#d97706]" },
  resolved: { label: "해결됨", className: "bg-[#dcfce7] text-[#16a34a]" },
  disputing: { label: "분쟁중", className: "bg-[#f3e8ff] text-[#9333ea]" },
  refunded: { label: "환불완료", className: "bg-[#f1f5f9] text-[#475569]" },
};

const YEARS = [2025, 2026, 2027];
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const PAGE_SIZE = 10;

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAmount(value: number, currencyCode: DisputeRow["currency_code"]) {
  if (currencyCode === "KRW") return `KRW ${Math.round(value).toLocaleString("ko-KR")}`;
  if (currencyCode === "NZD") return `NZD ${Number(value).toLocaleString("en-NZ")}`;
  return `USD ${Number(value).toLocaleString("en-US")}`;
}

function getDateRange(year: number, month: number, rangeType: "start" | "end") {
  if (rangeType === "start") return new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
  return new Date(year, month, 0, 23, 59, 59, 999).toISOString();
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  throw new Error(text.includes("<!DOCTYPE") ? fallbackMessage : text || fallbackMessage);
}

async function authFetchJson<T>(input: RequestInfo | URL, init: RequestInit, fallbackMessage: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await authFetch(input, init);

    if (response.status === 404 && attempt === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      continue;
    }

    const payload = await parseJsonResponse<T>(response, fallbackMessage);
    return { response, payload };
  }

  throw new Error(fallbackMessage);
}

export function MasterDisputeCenter({ refreshKey = 0, onOpenSupportRoom }: MasterDisputeCenterProps) {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<DisputeFilter>("all");
  const [startYear, setStartYear] = useState(2026);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(2026);
  const [endMonth, setEndMonth] = useState(4);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(null);
  const [openingChatDisputeId, setOpeningChatDisputeId] = useState<string | null>(null);
  const [updatingStatusDisputeId, setUpdatingStatusDisputeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        search: searchTerm.trim(),
        status: activeFilter,
        start: getDateRange(startYear, startMonth, "start"),
        end: getDateRange(endYear, endMonth, "end"),
      });
      const { response, payload } = await authFetchJson<{ error?: string; disputes?: DisputeRow[] }>(
        `/api/admin/disputes?${params.toString()}`,
        {},
        "분쟁 데이터를 불러오는 중 일시적인 오류가 발생했습니다."
      );

      if (!response.ok) {
        throw new Error(payload.error || "분쟁 데이터를 불러오는 데 실패했습니다.");
      }

      setDisputes(payload.disputes || []);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "분쟁 데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, endMonth, endYear, searchTerm, startMonth, startYear]);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes, refreshKey]);

  const totalCount = useMemo(() => disputes.length, [disputes]);
  const totalPages = Math.max(1, Math.ceil(disputes.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedDisputes = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return disputes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [disputes, visiblePage]);

  const handleOpenChat = async (dispute: DisputeRow) => {
    setOpeningChatDisputeId(dispute.id);

    try {
      const { response, payload } = await authFetchJson<{ error?: string; roomId?: string }>(
        `/api/admin/disputes/${dispute.id}/chat`,
        {
          method: "POST",
        },
        "1:1 대화 연결 중 일시적인 오류가 발생했습니다."
      );

      if (!response.ok || !payload.roomId) {
        throw new Error(payload.error || "1:1 대화방을 열지 못했습니다.");
      }

      onOpenSupportRoom?.(payload.roomId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "1:1 대화방을 열지 못했습니다.");
    } finally {
      setOpeningChatDisputeId(null);
    }
  };

  const handleStatusChange = async (dispute: DisputeRow, status: DisputeStatus) => {
    if (dispute.status === status) return;

    setUpdatingStatusDisputeId(dispute.id);

    try {
      const { response, payload } = await authFetchJson<{ error?: string }>(
        "/api/admin/disputes",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: dispute.id, status }),
        },
        "분쟁 상태 변경 중 일시적인 오류가 발생했습니다."
      );

      if (!response.ok) {
        throw new Error(payload.error || "분쟁 상태 변경에 실패했습니다.");
      }

      setDisputes((prev) => prev.map((item) => (item.id === dispute.id ? { ...item, status } : item)));
      setSelectedDispute((prev) => (prev?.id === dispute.id ? { ...prev, status } : prev));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "분쟁 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingStatusDisputeId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f5f6f8] px-8 py-7">
      <section>
        <h1 className="flex items-center gap-2 text-[20px] font-bold text-[#111827]">
          <span className="text-[20px]">⚖️</span>
          분쟁/중재 센터
        </h1>
        <p className="mt-1 text-[14px] font-medium text-[#6b7280]">두고커넥트 운영 관리 시스템</p>
      </section>

      <section className="mt-6 rounded-[14px] border border-[#e7e9ee] bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-[#6b7280]">
              🔍
              검색 (분쟁번호·신청자·상대방·사유)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(event) => event.key === "Enter" && void fetchDisputes()}
              placeholder="검색어 입력..."
              className="h-[38px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-[15px] font-medium text-[#374151] outline-none placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-[#6b7280]">📅
                시작
              </label>
              <div className="flex gap-1.5">
                <select value={startYear} onChange={(event) => {
                  setStartYear(Number(event.target.value));
                  setCurrentPage(1);
                }} className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[15px] font-semibold text-[#374151] outline-none">
                  {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <select value={startMonth} onChange={(event) => {
                  setStartMonth(Number(event.target.value));
                  setCurrentPage(1);
                }} className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[15px] font-semibold text-[#374151] outline-none">
                  {MONTHS.map((month) => <option key={month} value={month}>{month}월</option>)}
                </select>
              </div>
            </div>

            <span className="pb-3 text-[14px] font-bold text-[#6b7280]">~</span>

            <div>
              <label className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-[#6b7280]">
                📅
                종료
              </label>
              <div className="flex gap-1.5">
                <select value={endYear} onChange={(event) => {
                  setEndYear(Number(event.target.value));
                  setCurrentPage(1);
                }} className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[14px] font-semibold text-[#374151] outline-none">
                  {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <select value={endMonth} onChange={(event) => {
                  setEndMonth(Number(event.target.value));
                  setCurrentPage(1);
                }} className="h-[38px] rounded-[14px] border border-[#e5e7eb] bg-white px-3 text-[14px] font-semibold text-[#374151] outline-none">
                  {MONTHS.map((month) => <option key={month} value={month}>{month}월</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`h-8 rounded-full px-5 text-[14px] font-semibold transition ${isActive ? "bg-[#e11d48] text-white" : "border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f8fafc]"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] font-semibold text-[#98a2b3]">{totalCount}건</p>
      </section>

      <section className="mt-4 overflow-hidden rounded-[14px] border border-[#e7e9ee] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full table-fixed text-left">
            <thead className="bg-[#fbfcfd]">
              <tr className="text-[12px] font-semibold text-[#6b7280]">
                <th className="w-[12%] px-4 py-3">분쟁번호</th>
                <th className="w-[11%] px-4 py-3">날짜</th>
                <th className="w-[9%] px-4 py-3">신청자</th>
                <th className="w-[14%] px-4 py-3">상대방</th>
                <th className="w-[20%] px-4 py-3">사유</th>
                <th className="w-[13%] px-4 py-3">분쟁금액</th>
                <th className="w-[8%] px-4 py-3">상태</th>
                <th className="w-[13%] px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center">
                    <MasterLoadingState variant="inline" />
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center text-[14px] font-semibold text-[#98a2b3]">
                    조회된 분쟁 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedDisputes.map((dispute) => {
                  const statusMeta = STATUS_META[dispute.status];

                  return (
                    <tr key={dispute.id} className="border-t border-[#f2f4f6] text-[12px]  text-[#374151]">
                      <td className="px-4 py-3 -[#4b5563]">{dispute.dispute_number}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{formatDate(dispute.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-[#374151]">{dispute.applicant_name}</td>
                      <td className="px-4 py-3">{dispute.counterparty_name}</td>
                      <td className="truncate px-4 py-3" title={dispute.reason}>{dispute.reason}</td>
                      <td className="px-4 py-3 font-bold text-[#e11d48]">{formatAmount(dispute.amount, dispute.currency_code)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDispute(dispute)}
                            className="rounded-full bg-[#fff1f2] px-3 py-1 text-[12px] font-bold text-[#e11d48] transition hover:bg-[#ffe4e6]"
                          >
                            상세보기
                          </button>
                          <button
                            type="button"
                            disabled={openingChatDisputeId === dispute.id}
                            onClick={() => void handleOpenChat(dispute)}
                            className="rounded-full bg-[#eef2ff] px-3 py-1 text-[12px] font-bold text-[#4f46e5] transition hover:bg-[#e0e7ff]"
                          >
                            {openingChatDisputeId === dispute.id ? "연결중" : "1:1 대화"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <MasterTablePagination
          totalItems={disputes.length}
          currentPage={visiblePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </section>

      {selectedDispute ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[520px] overflow-hidden rounded-[14px] bg-white shadow-xl">
            <div className="relative bg-[#e9003a] px-6 py-4 text-white">
              <p className="text-[12px] font-medium opacity-90">분쟁 케이스</p>
              <h3 className="mt-1 text-[18px] font-extrabold tracking-tight">
                {selectedDispute.dispute_number}
              </h3>
              <p className="mt-1 text-[12px] opacity-80">{formatDate(selectedDispute.created_at)}</p>

              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="absolute right-6 top-6 text-white/80 hover:text-white transition-colors"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="px-6 py-7">
              <div className="flex gap-3">
                <div className="flex-1 rounded-[18px] bg-[#f0f7ff] p-4">
                  <p className="flex items-center text-[12px] font-bold text-[#8b95a1]">
                    <span className="mr-1.5 text-[12px]">👤</span> 신청자
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-[#111827]">{selectedDispute.applicant_name}</p>
                </div>
                <div className="flex-1 rounded-[14px] bg-[#fff0f3] p-4">
                  <p className="flex items-center text-[12px] font-bold text-[#8b95a1]">
                    <span className="mr-1.5 text-[12px]">🏭</span> 상대방
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-[#111827]">{selectedDispute.counterparty_name}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-[#f2f4f7] p-5">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[14px] font-bold text-[#8b95a1]">사유</span>
                    <span className="text-[14px] font-bold text-[#111827]">{selectedDispute.reason}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-bold text-[#8b95a1]">분쟁 금액</span>
                    <span className="text-[14px] font-black text-[#e9003a]">
                      {formatAmount(selectedDispute.amount, selectedDispute.currency_code)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-bold text-[#8b95a1]">현재 상태</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#ebf3ff] px-3 py-1 text-[14px] font-bold text-[#2563eb]">
                        {STATUS_META[selectedDispute.status].label}
                      </span>
                      <select
                        value={selectedDispute.status}
                        disabled={updatingStatusDisputeId === selectedDispute.id}
                        onChange={(event) => void handleStatusChange(selectedDispute, event.target.value as DisputeStatus)}
                        className="h-8 rounded-full border border-[#dbe3ef] bg-white px-3 text-[12px] font-bold text-[#4e5968] outline-none transition focus:border-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {STATUS_TABS.filter((tab): tab is { id: DisputeStatus; label: string } => tab.id !== "all").map((tab) => (
                          <option key={tab.id} value={tab.id}>
                            {tab.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 처리 이력 */}
              <div className="mt-4 rounded-[14px] bg-[#f8fafc] p-3">
                <p className="flex items-center text-[12px] font-bold text-[#4b5563]">
                  <span className="mr-1.5 text-[12px]">⚖️</span> 처리 이력
                </p>
                <p className="mt-2 text-[12px] font-medium text-[#4b5563]">
                  {formatDate(selectedDispute.created_at)}: 분쟁 접수
                </p>
              </div>

              {/* 하단 버튼 그룹 */}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={openingChatDisputeId === selectedDispute.id}
                  onClick={() => void handleOpenChat(selectedDispute)}
                  className="flex h-[38px] items-center justify-center gap-2 rounded-[16px] bg-[#4f3ff5] text-[14px] font-bold text-white transition hover:bg-[#3f2fd5] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  💬
                  {openingChatDisputeId === selectedDispute.id ? "연결중" : "1:1 대화 열기"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="h-[38px] rounded-[16px] bg-[#e9003a] text-[14px] font-bold text-white transition hover:bg-[#c80032]"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
