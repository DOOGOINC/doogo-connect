"use client";

import { X } from "lucide-react";

type AciExpressSignupModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AciExpressSignupModal({ open, onClose }: AciExpressSignupModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f172a]/55 px-4 py-8">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[24px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <div className="border-b border-[#eaecf0] bg-[#f8fafc] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#2453d8]">ACI EXPRESS</p>
              <h3 className="mt-2 text-[22px] font-bold text-[#111827]">신청 전 확인해 주세요</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#667085]">ACI EXPRESS 가입 후 진행해 주세요.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[#667085] transition hover:bg-white"
              aria-label="ACI EXPRESS 안내 팝업 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8efff] text-[15px] font-bold text-[#2453d8]">
                1
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold text-[#111827]">ACI EXPRESS 가입</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#667085]">
                  아래 버튼을 눌러 가입을 먼저 진행해 주세요.
                </p>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScTIkfgeKiWyAfTpK3WAuw9Z1ZfcQrVE-x1csqFl4c3W2BuZA/viewform"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-[14px] bg-[#2453d8] px-4 text-[14px] font-semibold text-white transition hover:bg-[#1d44b2]"
                >
                  ACI EXPRESS 가입하기
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[#e5e7eb] bg-[#fcfcfd] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8efff] text-[15px] font-bold text-[#2453d8]">
                2
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold text-[#111827]">이미 가입하셨나요?</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#667085]">
                  이미 가입해서 진행하셨다면 아래 패스 버튼을 눌러주세요.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#2453d8] px-5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#1d44b2]"
            >
              패스
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
