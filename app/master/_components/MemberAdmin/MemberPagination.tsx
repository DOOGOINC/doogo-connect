"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function MemberPagination({ currentPage, totalCount, pageSize, onPageChange }: Props) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#F2F4F6] flex items-center justify-between">
      <p className="text-xs font-medium text-[#8B95A1]">
        총 <span className="text-[#4E5968]">{totalCount}</span>명 중 {startIdx}-{endIdx} 표시
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-[#E5E8EB] bg-white text-[#4E5968] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                currentPage === page 
                  ? "bg-[#0064FF] text-white" 
                  : "text-[#4E5968] hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-[#E5E8EB] bg-white text-[#4E5968] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
