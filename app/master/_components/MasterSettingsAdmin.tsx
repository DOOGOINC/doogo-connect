"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { DEFAULT_REFEREE_REWARD_POINTS } from "@/lib/points/constants";
import { MasterAiChatbotSettings } from "./MasterAiChatbotSettings";
import { MasterLoadingState } from "./MasterLoadingState";
import { EventSettingsView } from "./master-settings-admin/EventSettingsView";
import { PlatformSettingsView } from "./master-settings-admin/PlatformSettingsView";
import { PopupSettingsView } from "./master-settings-admin/PopupSettingsView";
import { SettingsTabBar } from "./master-settings-admin/SettingsTabBar";
import type { PlatformSettings, PopupSettings, PopupSettingsResponse, SettingsResponse, SettingsTab } from "./master-settings-admin/types";
import { SETTINGS_TABS } from "./master-settings-admin/types";

function toPointValue(value: string | number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function toPercentValue(value: string | number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Number(numeric.toFixed(2))));
}

export function MasterSettingsAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("platform");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [commissionHistory, setCommissionHistory] = useState<SettingsResponse["commissionHistory"]>([]);
  const [studentDiscountEnabled, setStudentDiscountEnabled] = useState(false);
  const [lastStudentDiscountPercent, setLastStudentDiscountPercent] = useState(10);
  const [popupSettings, setPopupSettings] = useState<PopupSettings>({
    id: 1,
    enabled: false,
    title: "대량 OEM, 두고커넥트로 시작하세요",
    content: "50개 단위로 시작하는 나만의 건강식품 브랜드",
    featureTitle: "1분 견적 시스템",
    featureDescription: "제조사 선택 후 수량 입력 시 즉시 견적 확인",
    eventTitle: "신규 이벤트: 첫 의뢰 포인트 2배!",
    eventDescription: "기간: ~2026.04.30 | 5,000P 의뢰 → 10,000P 적립",
    buttonLabel: "자세히보기",
    buttonUrl: "/estimate",
    updatedAt: null,
  });
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: "DOOGO Connect",
    commissionRatePercent: 3,
    studentDiscountPercent: 0,
    referrerRewardPoints: 1000,
    refereeRewardPoints: DEFAULT_REFEREE_REWARD_POINTS,
    rfqRequestCostPoints: 5000,
    pointPurchasePackages: [
      { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
      { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
      { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 7000, amountKrw: 50000 },
    ],
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsResponse, popupResponse] = await Promise.all([
          authFetch("/api/admin/point-settings"),
          authFetch("/api/admin/popup-settings"),
        ]);
        const payload = (await settingsResponse.json()) as SettingsResponse & { error?: string };
        const popupPayload = (await popupResponse.json()) as PopupSettingsResponse;
        if (!settingsResponse.ok) {
          throw new Error(payload.error || "설정을 불러오지 못했습니다.");
        }
        if (!popupResponse.ok) {
          throw new Error(popupPayload.error || "팝업 설정을 불러오지 못했습니다.");
        }

        setSettings({
          platformName: payload.settings.platformName || "DOOGO Connect",
          commissionRatePercent: Number(payload.settings.commissionRatePercent ?? 3),
          studentDiscountPercent: Number(payload.settings.studentDiscountPercent ?? 0),
          referrerRewardPoints: Number(payload.settings.referrerRewardPoints ?? 1000),
          refereeRewardPoints: Number(payload.settings.refereeRewardPoints ?? DEFAULT_REFEREE_REWARD_POINTS),
          rfqRequestCostPoints: Number(payload.settings.rfqRequestCostPoints ?? 5000),
          pointPurchasePackages: payload.settings.pointPurchasePackages || [
            { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
            { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
            { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 7000, amountKrw: 50000 },
          ],
        });
        const fetchedStudentDiscountPercent = Number(payload.settings.studentDiscountPercent ?? 0);
        setStudentDiscountEnabled(fetchedStudentDiscountPercent > 0);
        setLastStudentDiscountPercent(fetchedStudentDiscountPercent > 0 ? fetchedStudentDiscountPercent : 10);
        setCommissionHistory(payload.commissionHistory || []);
        setPopupSettings(popupPayload.settings);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, []);

  const handleStudentDiscountToggle = () => {
    const nextEnabled = !studentDiscountEnabled;
    const confirmed = window.confirm(
      nextEnabled ? "수강생 할인 이벤트를 진행하시겠습니까?" : "수강생 할인 이벤트를 종료하시겠습니까?"
    );

    if (!confirmed) {
      return;
    }

    setStudentDiscountEnabled(nextEnabled);
    setSettings((prev) => {
      if (nextEnabled) {
        const nextPercent = prev.studentDiscountPercent > 0 ? prev.studentDiscountPercent : lastStudentDiscountPercent;
        return { ...prev, studentDiscountPercent: nextPercent };
      }

      if (prev.studentDiscountPercent > 0) {
        setLastStudentDiscountPercent(prev.studentDiscountPercent);
      }
      return { ...prev, studentDiscountPercent: 0 };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await authFetch("/api/admin/point-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...settings,
          studentDiscountPercent: studentDiscountEnabled ? settings.studentDiscountPercent : 0,
        }),
      });
      const payload = (await response.json()) as SettingsResponse & { error?: string };
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "설정 저장에 실패했습니다.");
      }

      setSettings(payload.settings);
      setStudentDiscountEnabled(Number(payload.settings.studentDiscountPercent ?? 0) > 0);
      if (Number(payload.settings.studentDiscountPercent ?? 0) > 0) {
        setLastStudentDiscountPercent(Number(payload.settings.studentDiscountPercent ?? 0));
      }
      const historyResponse = await authFetch("/api/admin/point-settings");
      const historyPayload = (await historyResponse.json()) as SettingsResponse & { error?: string };
      if (historyResponse.ok) {
        setCommissionHistory(historyPayload.commissionHistory || []);
      }
      setMessage("설정이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePopupSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await authFetch("/api/admin/popup-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(popupSettings),
      });
      const payload = (await response.json()) as PopupSettingsResponse;
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "팝업 설정 저장에 실패했습니다.");
      }

      setPopupSettings(payload.settings);
      setMessage("팝업 설정이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "팝업 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <MasterLoadingState />;
  }

  return (
    <div className="flex flex-1 overflow-y-auto bg-[#F7F8FA] px-6 py-5">
      <div className="w-full max-w-[760px]">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-[#1F2937]">
            <span>⚙</span>
            설정
          </h1>
          <p className="mt-1 text-[12px] font-medium text-[#6B7280]">두고커넥트 운영 관리 시스템</p>
        </header>

        <SettingsTabBar tabs={SETTINGS_TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "ai-chatbot" ? <MasterAiChatbotSettings /> : null}
        {activeTab === "platform" ? (
          <PlatformSettingsView
            settings={settings}
            commissionHistory={commissionHistory || []}
            saving={saving}
            message={message}
            error={error}
            onSettingsChange={(updater) => setSettings((prev) => updater(prev))}
            onSave={() => void handleSave()}
            onPointValue={toPointValue}
            onPercentValue={toPercentValue}
          />
        ) : null}
        {activeTab === "popup" ? (
          <PopupSettingsView
            popupSettings={popupSettings}
            saving={saving}
            message={message}
            error={error}
            onPopupSettingsChange={(updater) => setPopupSettings((prev) => updater(prev))}
            onSave={() => void handlePopupSave()}
          />
        ) : null}
        {activeTab === "event" ? (
          <EventSettingsView
            studentDiscountEnabled={studentDiscountEnabled}
            studentDiscountPercent={settings.studentDiscountPercent}
            saving={saving}
            message={message}
            error={error}
            onToggle={handleStudentDiscountToggle}
            onChange={(value) =>
              setSettings((prev) => {
                const nextPercent = toPercentValue(value);
                if (nextPercent > 0) {
                  setLastStudentDiscountPercent(nextPercent);
                }
                return { ...prev, studentDiscountPercent: nextPercent };
              })
            }
            
            onSave={() => void handleSave()}
          />
        ) : null}
        {activeTab !== "ai-chatbot" && activeTab !== "platform" && activeTab !== "popup" && activeTab !== "event" ? (
          <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-[13px] font-bold text-[#6B7280]">준비 중인 설정입니다.</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
