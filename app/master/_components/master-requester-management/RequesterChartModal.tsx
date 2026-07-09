"use client";

import { X } from "lucide-react";
import type { MonthlyBar } from "./types";

type RequesterChartModalProps = {
  isOpen: boolean;
  monthlyBars: MonthlyBar[];
  onClose: () => void;
};

export function RequesterChartModal({ isOpen, monthlyBars, onClose }: RequesterChartModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="flex max-h-[calc(100vh-48px)] w-full max-w-[980px] flex-col overflow-hidden rounded-[20px] border border-[#E7ECF3] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
        <div className="flex items-center justify-between border-b border-[#EEF2F6] px-6 py-5">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-[#24324A]">
            <span className="text-[16px]">📊</span>
            월별 신규 가입자 추이
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#191F28]"
            aria-label="Close requester chart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto px-6 py-6">
          <div className="min-w-[1180px]">
            <p className="text-[11px] font-bold text-[#98A2B3]">월별 신규 가입자 수 (마우스 오버 시 인원 표시)</p>
            <div className="mt-6 grid items-end gap-2" style={{ gridTemplateColumns: `repeat(${monthlyBars.length}, minmax(0, 1fr))` }}>
              {monthlyBars.map((bar) => (
                <div key={bar.label} className="flex flex-col items-center gap-2">
                  <div className="flex h-[160px] w-full items-end">
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
                        <div className="w-full rounded-t-[6px] bg-[#5B9DF1] transition hover:bg-[#4389e8]" style={{ height: `${Math.max(bar.height * 2, 24)}px` }} />
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
  );
}
