"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";

type PopupSettings = {
  id: number;
  enabled: boolean;
  title: string;
  content: string;
  featureTitle: string;
  featureDescription: string;
  eventTitle: string;
  eventDescription: string;
  buttonLabel: string;
  buttonUrl: string;
  updatedAt: string | null;
};

type PopupResponse = {
  settings?: PopupSettings;
  error?: string;
};

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDismissKey(settings: PopupSettings) {
  return `doogo-connect:client-popup:${getTodayKey()}:${settings.updatedAt || settings.id}`;
}

export function ClientDailyPopup() {
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchPopup = async () => {
      try {
        const response = await authFetch("/api/popup-settings");
        const payload = (await response.json()) as PopupResponse;
        if (!response.ok || !payload.settings?.enabled) {
          return;
        }

        const nextSettings = payload.settings;
        if (window.localStorage.getItem(getDismissKey(nextSettings)) === "hidden") {
          return;
        }

        setSettings(nextSettings);
        setIsOpen(true);
      } catch (error) {
        console.warn("Client popup skipped:", error);
      }
    };

    void fetchPopup();
  }, []);

  if (!settings || !isOpen) {
    return null;
  }

  const close = () => setIsOpen(false);
  const hideToday = () => {
    window.localStorage.setItem(getDismissKey(settings), "hidden");
    close();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-5 py-6">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="relative overflow-hidden bg-[#2454dc] px-4 pb-[44px] pt-8 text-center text-white">
          <div className="absolute -left-16 bottom-[-58px] h-[170px] w-[170px] rounded-full bg-[#2f66ed]/70" />
          <div className="absolute -right-18 top-[-68px] h-[230px] w-[230px] rounded-full bg-[#2f66ed]/80" />
          <div className="relative">
            <div className="text-[56px] leading-none">🌿</div>
            <h2 className="mx-auto mt-5 max-w-[420px] break-keep text-[20px] font-bold leading-[1.28] tracking-[-0.01em]">
              {settings.title}
            </h2>
            <p className="mt-1 break-keep text-[14px] font-semibold leading-5 text-white/68">{settings.content}</p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-[14px] bg-[#f0f4fb] px-5 py-3">
              <span className="text-[20px] leading-none">⚡</span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-7 text-[#111827]">{settings.featureTitle}</p>
                <p className="break-keep text-[12px] font-medium leading-3 text-[#6b7280]">
                  {settings.featureDescription}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[14px] bg-[#f0fbf3] px-5 py-3">
              <span className="text-[20px] leading-none">🎁</span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-7 text-[#111827]">{settings.eventTitle}</p>
                <p className="mt-1 break-keep text-[12px] font-medium leading-3 text-[#6b7280]">
                  {settings.eventDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-3 text-[12px] font-medium text-[#5f6673]">
              <input
                type="checkbox"
                onChange={hideToday}
                className="h-4 w-4 rounded-[4px] border-[#9ca3af] text-[#155dfc] focus:ring-[#155dfc]"
              />
              <span>오늘 하루 열지 않기</span>
            </label>

            <div className="flex shrink-0 items-center gap-3">
              {settings.buttonUrl ? (
                <Link
                  href={settings.buttonUrl}
                  onClick={close}
                  className="flex h-[38px] items-center justify-center rounded-[18px] bg-[#155dfc] px-6 text-[12px] font-bold text-white transition hover:bg-[#0f4fd8]"
                >
                  {settings.buttonLabel}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={close}
                className="h-[38px] rounded-[18px] bg-[#155dfc] px-6 text-[12px] font-bold text-white transition hover:bg-[#0f4fd8]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
