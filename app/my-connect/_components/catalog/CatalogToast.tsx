"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

type CatalogToastProps = {
  message: string;
  onClose: () => void;
};

export function CatalogToast({ message, onClose }: CatalogToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[60] w-[min(360px,calc(100vw-2.5rem))] rounded-[20px] border border-[#D7E7FF] bg-white px-4 py-3 shadow-[0_18px_48px_rgba(49,130,246,0.18)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] text-[#3182F6]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[#191F28]">저장되었습니다.</p>
          <p className="mt-0.5 text-[13px] leading-5 text-[#667085]">{message}</p>
        </div>
      </div>
    </div>
  );
}
