"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { formatRfqCurrency, formatRfqDate, RFQ_STATUS_LABELS, type RfqRequestRow } from "@/lib/rfq";

interface StatusOption {
  value: string;
  label: string;
}

interface ProjectListProps {
  requests?: RfqRequestRow[];
  activeRequestId?: string | null;
  onRequestSelect?: (requestId: string) => void;
  title?: string;
  emptyLabel?: string;
  showCreateButton?: boolean;
  statusOptions?: StatusOption[];
  statusLabelOverrides?: Partial<Record<string, string>>;
}

const ITEMS_PER_PAGE = 10;

export function ProjectList({
  requests = [],
  activeRequestId = null,
  onRequestSelect,
  title = "프로젝트 리스트",
  emptyLabel = "등록된 프로젝트가 없습니다.",
  showCreateButton = true,
  statusLabelOverrides,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        request.brand_name.toLowerCase().includes(q) ||
        request.product_name.toLowerCase().includes(q) ||
        request.manufacturer_name.toLowerCase().includes(q) ||
        request.request_number.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredRequests]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="mb-3 text-sm font-bold text-gray-900">{title}</h3>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="프로젝트명 검색"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-xs transition-all focus:border-[#0064FF] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {paginatedRequests.length ? (
          paginatedRequests.map((request) => {
            const isActive = activeRequestId === request.id;

            return (
              <button
                key={request.id}
                type="button"
                onClick={() => onRequestSelect?.(request.id)}
                className={`w-full border-b border-gray-100 px-4 py-4 text-left transition-colors ${
                  isActive ? "border-l-2 border-l-[#0064FF] bg-blue-50" : "border-l-2 border-l-transparent hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    <Image src={request.product_image || "/image/image01.jpg"} alt={request.product_name} fill className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{request.product_name}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-gray-400">{request.manufacturer_name}</p>

                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          isActive ? "bg-white text-[#0064FF]" : "bg-blue-50 text-[#0064FF]"
                        }`}
                      >
                        {statusLabelOverrides?.[request.status] ?? RFQ_STATUS_LABELS[request.status]}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400">{formatRfqDate(request.created_at)}</span>
                    </div>

                    <p className="mt-1 text-xs font-bold text-[#0064FF]">{formatRfqCurrency(request.total_price, request.currency_code)}</p>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="px-5 py-10 text-center text-xs font-medium text-gray-400">{emptyLabel}</div>
        )}
      </div>

      {filteredRequests.length > ITEMS_PER_PAGE ? (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="mb-2 text-[11px] font-medium text-gray-400">
            총 {filteredRequests.length}건 · {currentPage}/{totalPages}페이지
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              className="h-8 rounded-full border border-gray-200 px-3 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`h-8 min-w-8 rounded-full px-3 text-[11px] font-semibold transition ${
                  currentPage === pageNumber ? "bg-[#0064FF] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              className="h-8 rounded-full border border-gray-200 px-3 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      ) : null}

      {showCreateButton ? (
        <div className="border-t border-gray-100 p-4">
          <Link
            href="/estimate"
            className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            새 견적 요청하기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
