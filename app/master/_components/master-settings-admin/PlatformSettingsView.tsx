"use client";

import { Loader2 } from "lucide-react";
import type { CommissionHistory, PlatformSettings } from "./types";

type PlatformSettingsViewProps = {
  settings: PlatformSettings;
  commissionHistory: CommissionHistory[];
  saving: boolean;
  message: string;
  error: string;
  onSettingsChange: (updater: (prev: PlatformSettings) => PlatformSettings) => void;
  onSave: () => void;
  onPointValue: (value: string | number) => number;
  onPercentValue: (value: string | number) => number;
};

export function PlatformSettingsView({
  settings,
  commissionHistory,
  saving,
  message,
  error,
  onSettingsChange,
  onSave,
  onPointValue,
  onPercentValue,
}: PlatformSettingsViewProps) {
  return (
    <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-[#111827]">
        <span>🔧</span>
        플랫폼 기본 설정
      </h2>

      <div className="space-y-5">
        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">플랫폼명</span>
          <input
            value={settings.platformName}
            onChange={(event) => onSettingsChange((prev) => ({ ...prev, platformName: event.target.value }))}
            className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">수수료율 (%)</span>
          <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">제조사 신규 등록 시 자동 적용 (기본값 3%)</p>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={settings.commissionRatePercent}
            onChange={(event) =>
              onSettingsChange((prev) => ({
                ...prev,
                commissionRatePercent: onPercentValue(event.target.value),
              }))
            }
            className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <div className="rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#374151]">수수료율 변경 히스토리</span>
            <span className="text-[11px] font-semibold text-[#9CA3AF]">최근 10개</span>
          </div>
          <div className="mt-3 space-y-2">
            {commissionHistory.length ? (
              commissionHistory.map((history) => (
                <div key={history.id} className="flex items-center justify-between rounded-[10px] bg-white px-3 py-2 text-[12px]">
                  <span className="font-bold text-[#374151]">
                    {history.previousRatePercent}% → {history.nextRatePercent}%
                  </span>
                  <span className="font-medium text-[#9CA3AF]">
                    {new Date(history.createdAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-[10px] bg-white px-3 py-3 text-[12px] font-medium text-[#9CA3AF]">아직 변경 히스토리가 없습니다.</p>
            )}
          </div>
        </div>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">회원가입 지급 포인트(P)</span>
          <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">추천인 코드를 입력한 회원에게 지급 (기본값 10,000P)</p>
          <input
            type="number"
            min={0}
            step={1}
            value={settings.refereeRewardPoints}
            onChange={(event) =>
              onSettingsChange((prev) => ({
                ...prev,
                refereeRewardPoints: onPointValue(event.target.value),
              }))
            }
            className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">제조 견적 차감 포인트(P)</span>
          <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">견적 요청 시 차감 (기본값 5,000P)</p>
          <input
            type="number"
            min={0}
            step={1}
            value={settings.rfqRequestCostPoints}
            onChange={(event) =>
              onSettingsChange((prev) => ({
                ...prev,
                rfqRequestCostPoints: onPointValue(event.target.value),
              }))
            }
            className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <div className="border-t border-[#F2F4F7] pt-5">
          <h3 className="text-[13px] font-bold text-[#374151]">포인트 충전 패키지 설정</h3>
          <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">충전 금액, 지급 포인트, 보너스 포인트를 설정합니다.</p>
          <div className="mt-3 space-y-3">
            {settings.pointPurchasePackages.map((pointPackage, index) => (
              <div key={pointPackage.id} className="rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="block">
                    <span className="text-[11px] font-bold text-[#6B7280]">패키지명</span>
                    <input
                      value={pointPackage.label}
                      onChange={(event) =>
                        onSettingsChange((prev) => ({
                          ...prev,
                          pointPurchasePackages: prev.pointPurchasePackages.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value } : item
                          ),
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-[#6B7280]">결제 금액(원)</span>
                    <input
                      type="number"
                      min={1}
                      value={pointPackage.amountKrw}
                      onChange={(event) =>
                        onSettingsChange((prev) => ({
                          ...prev,
                          pointPurchasePackages: prev.pointPurchasePackages.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, amountKrw: onPointValue(event.target.value) } : item
                          ),
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-[#6B7280]">지급 포인트</span>
                    <input
                      type="number"
                      min={1}
                      value={pointPackage.points}
                      onChange={(event) =>
                        onSettingsChange((prev) => ({
                          ...prev,
                          pointPurchasePackages: prev.pointPurchasePackages.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, points: onPointValue(event.target.value) } : item
                          ),
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-[#6B7280]">보너스 포인트</span>
                    <input
                      type="number"
                      min={0}
                      value={pointPackage.bonusPoints}
                      onChange={(event) =>
                        onSettingsChange((prev) => ({
                          ...prev,
                          pointPurchasePackages: prev.pointPurchasePackages.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, bonusPoints: onPointValue(event.target.value) } : item
                          ),
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-10 items-center justify-center rounded-[12px] bg-[#2563EB] px-5 text-[13px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장하기"}
        </button>
        {message ? <p className="text-[12px] font-bold text-[#16A34A]">{message}</p> : null}
        {error ? <p className="text-[12px] font-bold text-[#DC2626]">{error}</p> : null}
      </div>
    </section>
  );
}
