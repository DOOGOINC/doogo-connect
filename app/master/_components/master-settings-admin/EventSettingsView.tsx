"use client";

import { Loader2 } from "lucide-react";

type EventSettingsViewProps = {
  studentDiscountEnabled: boolean;
  studentDiscountPercent: number;
  saving: boolean;
  message: string;
  error: string;
  onToggle: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function EventSettingsView({
  studentDiscountEnabled,
  studentDiscountPercent,
  saving,
  message,
  error,
  onToggle,
  onChange,
  onSave,
}: EventSettingsViewProps) {
  return (
    <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-[#111827]">
        <span>🎉</span>
        이벤트 설정
      </h2>

      <div className="space-y-5">
        <label className="flex items-center gap-3 rounded-[14px] border border-[#E5E7EB] px-4 py-3">
          <input
            type="checkbox"
            checked={studentDiscountEnabled}
            onChange={onToggle}
            className="h-4 w-4 rounded border border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
          />
          <div>
            <p className="text-[13px] font-bold text-[#111827]">수강생 할인 이벤트 진행</p>
            <p className="mt-0.5 text-[12px] font-medium text-[#6B7280]">체크 시 수강생 할인 이벤트가 활성화됩니다.</p>
          </div>
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">수강생 할인율 (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={studentDiscountPercent}
            onChange={(event) => onChange(event.target.value)}
            disabled={!studentDiscountEnabled}
            className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>
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
