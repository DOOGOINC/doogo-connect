"use client";

import { Search } from "lucide-react";
import { MasterLoadingState } from "../MasterLoadingState";
import { MasterTablePagination } from "../MasterTablePagination";
import type { RequesterFilter, RequesterTableRow } from "./types";
import { FILTERS, formatDate, formatPoints } from "./utils";

type RequesterDashboardProps = {
  summary: {
    totalCount: number;
    activeCount: number;
    currentMonthCount: number;
  };
  monthlyBars: Array<{ label: string; count: number; height: number }>;
  activeFilter: RequesterFilter;
  onFilterChange: (value: RequesterFilter) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  loading: boolean;
  filteredCount: number;
  requesters: RequesterTableRow[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenChart: () => void;
  onSelectRequester: (requester: RequesterTableRow) => void;
  onMemberGradeChange: (requesterId: string, memberGrade: "student" | "general") => void;
};

function getMemberGradeLabel(memberGrade: "student" | "general") {
  return memberGrade === "student" ? "수강생" : "일반회원";
}

export function RequesterDashboard({
  summary,
  monthlyBars,
  activeFilter,
  onFilterChange,
  searchTerm,
  onSearchTermChange,
  loading,
  filteredCount,
  requesters,
  currentPage,
  totalPages,
  onPageChange,
  onOpenChart,
  onSelectRequester,
  onMemberGradeChange,
}: RequesterDashboardProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <section>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[20px] font-bold text-[#1F2A44]">
            <span className="text-[20px]">👤</span>
            <h1>의뢰자 관리</h1>
          </div>
          <p className="text-[14px] text-[#8C96A8]">두고커넥트 운영 관리 시스템</p>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        {[
          { icon: "👥", label: "총 회원수", value: `${summary.totalCount}명`, valueClass: "text-[#2F6BFF]" },
          { icon: "🟢", label: "활성 회원 (거래완료)", value: `${summary.activeCount}명`, valueClass: "text-[#16A34A]" },
          { icon: "🗓️", label: "이번달 신규", value: `${summary.currentMonthCount}명`, valueClass: "text-[#A855F7]" },
        ].map((card) => (
          <article key={card.label} className="rounded-[14px] border border-[#E8EDF3] bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1 text-[12px] text-[#6a7282]">
              <span className="text-[18px]">{card.icon}</span>
              <span>{card.label}</span>
            </div>
            <p className={`mt-1 text-[24px] font-bold ${card.valueClass}`}>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[14px] border border-[#E8EDF3] bg-white px-5 py-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#24324A]">
          <span className="text-[14px]">📊</span>
          월별 신규 가입자 추이
        </h2>

        <button type="button" onClick={onOpenChart} className="mt-8 block w-full text-left">
          <div className="mt-6 grid grid-cols-7 items-end gap-1.5 lg:gap-2">
            {monthlyBars.map((bar) => (
              <div key={bar.label} className="flex flex-col items-center gap-2">
                <div className="flex h-[84px] w-full items-end">
                  <div className="group relative flex w-full justify-center">
                    {bar.count > 0 ? (
                      <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden flex-col items-center group-hover:flex">
                        <div className="whitespace-nowrap rounded-lg bg-[#1E293B] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                          {bar.count}명
                        </div>
                        <div className="-mt-1 h-2 w-2 rotate-45 bg-[#1E293B]" />
                      </div>
                    ) : null}
                    {bar.height > 0 ? (
                      <div className="w-full rounded-t-[6px] bg-[#5B9DF1] transition hover:bg-[#4389e8]" style={{ height: `${bar.height}px` }} />
                    ) : null}
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-[#A0A8B8]">{bar.label}</span>
              </div>
            ))}
          </div>
        </button>
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterChange(filter.id)}
                className={`rounded-full px-4 py-2 text-[14px] font-bold transition ${isActive ? "bg-[#2F6BFF] text-white" : "border border-[#E3E8EF] bg-white text-[#667085]"}`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full max-w-[420px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="이름·이메일·파트너 검색..."
            className="h-[42px] w-full rounded-full border border-[#E5EAF0] bg-white pl-11 pr-4 text-[14px] font-medium text-[#344054] outline-none placeholder:text-[#98A2B3]"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E8EDF3] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead>
              <tr className="border-b border-[#EEF2F6] text-left">
                {["이름", "파트너사", "회원 등급", "이메일", "가입일", "포인트", "거래횟수", "상태", "관리"].map((label) => (
                  <th key={label} className="px-4 py-3 text-[12px] font-bold text-[#6a7282]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <MasterLoadingState variant="inline" />
                  </td>
                </tr>
              ) : filteredCount === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-[14px] font-semibold text-[#98A2B3]">
                    조회된 의뢰자가 없습니다.
                  </td>
                </tr>
              ) : (
                requesters.map((requester) => (
                  <tr key={requester.id} className="border-b border-[#F2F5F8] last:border-b-0">
                    <td className="px-4 py-3 text-[14px] font-bold text-[#344054]">{requester.name}</td>
                    <td className="px-4 py-3 text-[12px] text-[#344054]">{requester.partnerName}</td>
                    <td className="px-4 py-3">
                      <select
                        value={requester.memberGrade}
                        onChange={(event) => onMemberGradeChange(requester.id, event.target.value === "student" ? "student" : "general")}
                        className="h-9 rounded-[10px] border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#344054] outline-none focus:border-[#2463eb]"
                      >
                        <option value="student">{getMemberGradeLabel("student")}</option>
                        <option value="general">{getMemberGradeLabel("general")}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#344054]">{requester.email}</td>
                    <td className="px-4 py-3 text-[12px] text-[#344054]">{formatDate(requester.createdAt)}</td>
                    <td className="px-4 py-3 text-[12px] font-bold text-[#4B5565]">{formatPoints(requester.points)}</td>
                    <td className="px-4 py-3 text-[12px] text-[#344054]">{requester.completedCount}회</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${requester.status === "활성" ? "bg-[#E5F9EA] text-[#1BA34A]" : requester.status === "벤" ? "bg-[#FDECEC] text-[#E03131]" : "bg-[#F4F5F7] text-[#6B7280]"}`}
                      >
                        {requester.status}
                      </span>
                    </td>
                    <td className="px-4 py-1">
                      <button
                        type="button"
                        onClick={() => onSelectRequester(requester)}
                        className="inline-flex items-center rounded-full bg-[#EEF4FF] px-3 py-1 text-[12px] font-bold text-[#2F6BFF]"
                      >
                        관리
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <MasterTablePagination totalItems={filteredCount} currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      </section>
    </div>
  );
}
