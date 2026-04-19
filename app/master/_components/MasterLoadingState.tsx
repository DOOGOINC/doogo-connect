"use client";

import { Loader2 } from "lucide-react";

type MasterLoadingStateVariant = "page" | "inline" | "panel";

interface MasterLoadingStateProps {
  message?: string;
  variant?: MasterLoadingStateVariant;
}

const DEFAULT_MESSAGE = "대시보드 데이터를 불러오는 중입니다.";

export function MasterLoadingState({ message = DEFAULT_MESSAGE, variant = "page" }: MasterLoadingStateProps) {
  if (variant === "inline") {
    return (
      <div className="inline-flex items-center gap-3 rounded-full border border-[#E8EDF3] bg-white px-5 py-3 text-[14px] font-semibold text-[#667085]">
        <Loader2 className="h-4 w-4 animate-spin text-[#2F6BFF]" />
        {message}
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[14px] border border-[#F2F4F6] bg-white py-24">
        <div className="inline-flex items-center gap-3 rounded-full border border-[#E8EDF3] bg-white px-5 py-3 text-[14px] font-semibold text-[#667085]">
          <Loader2 className="h-4 w-4 animate-spin text-[#0064FF]" />
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#F8FAFC]">
      <div className="flex items-center gap-3 rounded-2xl border border-[#E7ECF3] bg-white px-5 py-4 text-[14px] font-semibold text-[#475467] shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
        {message}
      </div>
    </div>
  );
}
