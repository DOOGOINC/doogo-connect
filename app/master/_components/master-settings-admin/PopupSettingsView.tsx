"use client";

import { Loader2 } from "lucide-react";
import type { PopupSettings } from "./types";

type PopupSettingsViewProps = {
  popupSettings: PopupSettings;
  saving: boolean;
  message: string;
  error: string;
  onPopupSettingsChange: (updater: (prev: PopupSettings) => PopupSettings) => void;
  onSave: () => void;
};

export function PopupSettingsView({
  popupSettings,
  saving,
  message,
  error,
  onPopupSettingsChange,
  onSave,
}: PopupSettingsViewProps) {
  return (
    <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-[#111827]">
        <span>💬</span>
        팝업 설정
      </h2>

      <div className="space-y-5">
        <label className="flex items-center justify-between rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3">
          <span>
            <span className="block text-[13px] font-bold text-[#374151]">의뢰자 팝업 노출</span>
            <span className="mt-1 block text-[12px] font-medium text-[#9CA3AF]">의뢰자 회원이 my-connect에 접속할 때만 표시됩니다.</span>
          </span>
          <input
            type="checkbox"
            checked={popupSettings.enabled}
            onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, enabled: event.target.checked }))}
            className="h-5 w-5 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">팝업 제목</span>
          <input
            value={popupSettings.title}
            onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, title: event.target.value }))}
            maxLength={80}
            className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">팝업 내용</span>
          <input
            value={popupSettings.content}
            onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, content: event.target.value }))}
            maxLength={120}
            className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">첫 번째 박스 제목</span>
            <input
              value={popupSettings.featureTitle}
              onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, featureTitle: event.target.value }))}
              maxLength={80}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">첫 번째 박스 설명</span>
            <input
              value={popupSettings.featureDescription}
              onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, featureDescription: event.target.value }))}
              maxLength={160}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">두 번째 박스 제목</span>
            <input
              value={popupSettings.eventTitle}
              onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, eventTitle: event.target.value }))}
              maxLength={80}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">두 번째 박스 설명</span>
            <input
              value={popupSettings.eventDescription}
              onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, eventDescription: event.target.value }))}
              maxLength={160}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">버튼 문구</span>
            <input
              value={popupSettings.buttonLabel}
              onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, buttonLabel: event.target.value }))}
              maxLength={30}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">버튼 링크</span>
            <input
              value={popupSettings.buttonUrl}
              onChange={(event) => onPopupSettingsChange((prev) => ({ ...prev, buttonUrl: event.target.value }))}
              placeholder="/estimate"
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#2563EB]"
            />
          </label>
        </div>

        <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F7F8FA] p-4">
          <p className="text-[12px] font-bold text-[#6B7280]">미리보기</p>
          <div className="mt-3 w-full max-w-[420px] overflow-hidden rounded-[22px] bg-white shadow-sm">
            <div className="relative overflow-hidden bg-[#2454dc] px-8 pb-[54px] pt-12 text-center text-white">
              <div className="absolute -left-16 bottom-[-58px] h-[170px] w-[170px] rounded-full bg-[#2f66ed]/70" />
              <div className="absolute -right-14 top-[-38px] h-[230px] w-[230px] rounded-full bg-[#1f4bc8]/80" />
              <div className="relative">
                <div className="text-[56px] leading-none">🎼</div>
                <h3 className="mx-auto mt-5 max-w-[420px] break-keep text-[20px] font-bold leading-[1.28] tracking-[-0.01em]">
                  {popupSettings.title || "팝업 제목"}
                </h3>
                <p className="mt-4 break-keep text-[14px] font-semibold leading-5 text-white/68">
                  {popupSettings.content || "팝업 내용을 입력해 주세요."}
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 pt-6">
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-[14px] bg-[#f0f4fb] px-5 py-3">
                  <span className="text-[20px] leading-none">✨</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-7 text-[#111827]">{popupSettings.featureTitle || "첫 번째 박스 제목"}</p>
                    <p className="break-keep text-[12px] font-medium leading-3 text-[#6b7280]">
                      {popupSettings.featureDescription || "첫 번째 박스 설명"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[14px] bg-[#f0fbf3] px-5 py-3">
                  <span className="text-[20px] leading-none">🞞</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-7 text-[#111827]">{popupSettings.eventTitle || "두 번째 박스 제목"}</p>
                    <p className="mt-1 break-keep text-[12px] font-medium leading-3 text-[#6b7280]">
                      {popupSettings.eventDescription || "두 번째 박스 설명"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-[12px] font-medium text-[#5f6673]">
                  <span className="h-4 w-4 rounded-[4px] border border-[#9ca3af]" />
                  오늘 하루 다시 안 보기
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex h-[38px] items-center justify-center rounded-[18px] bg-[#155dfc] px-6 text-[12px] font-bold text-white">
                    {popupSettings.buttonLabel || "자세히보기"}
                  </div>
                  <div className="flex h-[38px] items-center justify-center rounded-[18px] bg-[#155dfc] px-6 text-[12px] font-bold text-white">
                    닫기
                  </div>
                </div>
              </div>
            </div>
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
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "팝업 저장하기"}
        </button>
        {message ? <p className="text-[12px] font-bold text-[#16A34A]">{message}</p> : null}
        {error ? <p className="text-[12px] font-bold text-[#DC2626]">{error}</p> : null}
      </div>
    </section>
  );
}
