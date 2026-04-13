"use client";

import { Box, Plus } from "lucide-react";
import Link from "next/link";

export function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#f9fafb] p-12">
      <div className="flex h-[360px] w-full max-w-[400px] flex-col items-center justify-center rounded-3xl border border-[#e5e9ef] bg-[#edf2f9] p-8">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/50 shadow-sm">
          <Box className="h-10 w-10 text-[#adb5bd]" />
        </div>
        <h4 className="mb-2 text-center text-[18px] font-bold text-[#191f28]">프로젝트를 선택해 주세요</h4>
        <p className="mb-8 text-center text-[14px] font-medium leading-relaxed text-[#8b95a1]">
          좌측 목록에서 프로젝트를 클릭하면
          <br />
          상세 진행 현황을 확인할 수 있습니다.
        </p>
        <Link
          href="/estimate"
          className="flex h-12 items-center gap-2 rounded-xl bg-[#3182f6] px-8 text-[14px] font-bold text-white shadow-md transition-all hover:bg-[#1b64da] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />새 견적 요청
        </Link>
      </div>
    </div>
  );
}
