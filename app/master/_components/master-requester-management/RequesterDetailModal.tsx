"use client";

import { X } from "lucide-react";
import type { BanAction, RequesterTableRow } from "./types";
import { formatPoints } from "./utils";

type RequesterDetailModalProps = {
  requester: RequesterTableRow | null;
  banReasonInput: string;
  pointAmountInput: string;
  pointReasonInput: string;
  isSubmittingPoint: boolean;
  updatingBanAction: BanAction | null;
  onClose: () => void;
  onBanReasonChange: (value: string) => void;
  onPointAmountChange: (value: string) => void;
  onPointReasonChange: (value: string) => void;
  onAddPoints: (requester: RequesterTableRow) => void;
  onBan: (requester: RequesterTableRow, action: BanAction) => void;
  onStartImpersonation: (requester: RequesterTableRow) => void;
};

export function RequesterDetailModal({
  requester,
  banReasonInput,
  pointAmountInput,
  pointReasonInput,
  isSubmittingPoint,
  updatingBanAction,
  onClose,
  onBanReasonChange,
  onPointAmountChange,
  onPointReasonChange,
  onAddPoints,
  onBan,
  onStartImpersonation,
}: RequesterDetailModalProps) {
  if (!requester) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="w-full max-w-[480px] overflow-hidden rounded-[14px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#2463eb] to-[#2848c7] px-4 py-2 text-white">
          <h3 className="flex items-center gap-3 text-[16px] font-bold">
            <span className="text-[16px]">👤</span>
            {requester.name} 관리
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close requester modal"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-[14px] bg-[#f7f8fa] px-4 py-3">
            <div className="grid grid-cols-[108px_1fr] gap-y-2.5 text-[14px]">
              <span className="font-semibold text-[#7b8597]">이메일</span>
              <span className="text-right font-semibold text-[#1f2937]">{requester.email}</span>
              <span className="font-semibold text-[#7b8597]">현재 포인트</span>
              <span className="text-right text-[14px] font-bold text-[#f07f13]">{formatPoints(requester.points)}</span>
              <span className="font-bold text-[#7b8597]">거래 횟수</span>
              <span className="text-right font-semibold text-[#1f2937]">{requester.completedCount}회</span>
              <span className="font-bold text-[#7b8597]">현재 상태</span>
              <span className="text-right font-semibold text-[#1f2937]">
                {requester.status}
                {requester.banLabel ? ` · ${requester.banLabel}` : ""}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-[#edf1f5] pt-4">
            <button
              type="button"
              onClick={() => onStartImpersonation(requester)}
              className="mb-4 h-[44px] w-full rounded-full bg-[#ff2056] px-5 text-[13px] font-bold text-white transition hover:bg-[#B3163C]"
            >
              관리자 대행모드
            </button>
            <p className="text-[12px] font-semibold text-[#4b5565]">포인트 추가</p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <label className="mb-2 block text-[12px] font-bold text-[#6b7280]">지급 포인트</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pointAmountInput}
                  onChange={(event) => onPointAmountChange(event.target.value)}
                  placeholder="추가할 포인트를 입력해 주세요"
                  className="h-[44px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-[13px] text-[#1f2937] outline-none transition focus:border-[#2463eb] focus:ring-4 focus:ring-[#2463eb]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-bold text-[#6b7280]">지급 사유</label>
                <input
                  type="text"
                  maxLength={120}
                  value={pointReasonInput}
                  onChange={(event) => onPointReasonChange(event.target.value)}
                  placeholder="예: 운영 보상 지급"
                  className="h-[44px] w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-[13px] text-[#1f2937] outline-none transition focus:border-[#2463eb] focus:ring-4 focus:ring-[#2463eb]/10"
                />
              </div>

              <button
                type="button"
                disabled={isSubmittingPoint}
                onClick={() => onAddPoints(requester)}
                className="h-[44px] rounded-full bg-[#2463eb] px-5 text-[13px] font-bold text-white transition hover:bg-[#1f55c8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingPoint ? "지급 중.." : "포인트 추가"}
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-[#edf1f5] pt-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[#4b5565]">
              <span>⚠️</span>
              계정 제재
            </p>

            <div className="mt-3">
              <label className="mb-2 block text-[12px] font-bold text-[#6b7280]">제재 사유</label>
              <textarea
                value={banReasonInput}
                onChange={(event) => onBanReasonChange(event.target.value)}
                placeholder="제재 사유를 입력해 주세요."
                className="h-24 w-full resize-none rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] text-[#1f2937] outline-none transition focus:border-[#2463eb] focus:ring-4 focus:ring-[#2463eb]/10"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                { id: "7d" as const, label: "7일 제재", className: "bg-[#fff8e8] text-[#df7a0f]" },
                { id: "30d" as const, label: "30일 정지", className: "bg-[#fff4ea] text-[#f06417]" },
                { id: "permanent" as const, label: "영구차단", className: "bg-[#fdeff0] text-[#e03131]" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={updatingBanAction !== null}
                  onClick={() => onBan(requester, item.id)}
                  className={`cursor-pointer rounded-full px-3 py-2 text-[12px] font-bold transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${item.className}`}
                >
                  {updatingBanAction === item.id ? "처리 중..." : item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-full bg-[#eef0f3] px-5 py-2.5 text-[14px] font-bold text-[#4b5565] transition hover:bg-[#e5e7eb]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
