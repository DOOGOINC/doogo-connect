"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { DEFAULT_REFEREE_REWARD_POINTS } from "@/lib/points/constants";
import { MasterLoadingState } from "./MasterLoadingState";

type PlatformSettings = {
  platformName: string;
  commissionRatePercent: number;
  referrerRewardPoints: number;
  refereeRewardPoints: number;
  rfqRequestCostPoints: number;
  pointPurchasePackages: PointPackage[];
};

type PointPackage = {
  id: string;
  label: string;
  points: number;
  bonusPoints: number;
  amountKrw: number;
};

type SettingsResponse = {
  settings: PlatformSettings;
  commissionHistory?: CommissionHistory[];
};

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

type PopupSettingsResponse = {
  settings: PopupSettings;
  error?: string;
};

type CommissionHistory = {
  id: string;
  previousRatePercent: number;
  nextRatePercent: number;
  changedBy: string | null;
  createdAt: string;
};

type SettingsTab = "platform" | "popup" | "admin" | "manager";

const TABS: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: "platform", label: "플랫폼 기본 설정", icon: "🔧" },
  { id: "popup", label: "팝업 설정", icon: "💬" },
  { id: "admin", label: "관리자 계정", icon: "🔑" },
  { id: "manager", label: "매니저 관리", icon: "👤" },
];

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
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistory[]>([]);
  const [popupSettings, setPopupSettings] = useState<PopupSettings>({
    id: 1,
    enabled: false,
    title: "소량 OEM, 두고커넥트로 시작하세요!",
    content: "50개부터 시작하는 나만의 건강식품 브랜드",
    featureTitle: "1분 견적 시스템",
    featureDescription: "제조사 선택 → 수량 입력 → 즉시 견적 확인",
    eventTitle: "신규 이벤트: 첫 의뢰 포인트 2배!",
    eventDescription: "기간: ~2026.04.30 | 5,000P 의뢰 → 10,000P 적립",
    buttonLabel: "자세히보기",
    buttonUrl: "/estimate",
    updatedAt: null,
  });
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: "DOOGO Connect",
    commissionRatePercent: 3,
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
          referrerRewardPoints: Number(payload.settings.referrerRewardPoints ?? 1000),
          refereeRewardPoints: Number(payload.settings.refereeRewardPoints ?? DEFAULT_REFEREE_REWARD_POINTS),
          rfqRequestCostPoints: Number(payload.settings.rfqRequestCostPoints ?? 5000),
          pointPurchasePackages: payload.settings.pointPurchasePackages || [
            { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
            { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
            { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 7000, amountKrw: 50000 },
          ],
        });
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
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as SettingsResponse & { error?: string };
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "설정 저장에 실패했습니다.");
      }

      setSettings(payload.settings);
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

  const updatePackage = (index: number, patch: Partial<PointPackage>) => {
    setSettings((prev) => ({
      ...prev,
      pointPurchasePackages: prev.pointPurchasePackages.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  if (loading) {
    return <MasterLoadingState />;
  }

  return (
    <div className="flex flex-1 overflow-y-auto bg-[#F7F8FA] px-6 py-5">
      <div className="w-full max-w-[760px]">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-[#1F2937]">
            <span>⚙️</span>
            설정
          </h1>
          <p className="mt-1 text-[12px] font-medium text-[#6B7280]">두고커넥트 운영 관리 시스템</p>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 rounded-full px-4 text-[13px] font-bold transition ${
                  active ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-[#E5E7EB]" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-white"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "platform" ? (
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
                  onChange={(event) => setSettings((prev) => ({ ...prev, platformName: event.target.value }))}
                  className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-bold text-[#374151]">수수료율 (%)</span>
                <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">제조사 신규 등록 시 자동 적용 (기본값: 3%)</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={settings.commissionRatePercent}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      commissionRatePercent: toPercentValue(event.target.value),
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
                    <p className="rounded-[10px] bg-white px-3 py-3 text-[12px] font-medium text-[#9CA3AF]">
                      아직 변경 히스토리가 없습니다.
                    </p>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="text-[13px] font-bold text-[#374151]">회원가입 지급 포인트 (P)</span>
                <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">추천인 코드를 입력한 회원에게 지급 (기본값: 10,000P)</p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settings.refereeRewardPoints}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      refereeRewardPoints: toPointValue(event.target.value),
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-bold text-[#374151]">제조 견적 차감 포인트 (P)</span>
                <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">견적 요청 시 차감 (기본값: 5,000P)</p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settings.rfqRequestCostPoints}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      rfqRequestCostPoints: toPointValue(event.target.value),
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
                            onChange={(event) => updatePackage(index, { label: event.target.value })}
                            className="mt-1 h-9 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-bold text-[#6B7280]">결제 금액(원)</span>
                          <input
                            type="number"
                            min={1}
                            value={pointPackage.amountKrw}
                            onChange={(event) => updatePackage(index, { amountKrw: toPointValue(event.target.value) })}
                            className="mt-1 h-9 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-bold text-[#6B7280]">지급 포인트</span>
                          <input
                            type="number"
                            min={1}
                            value={pointPackage.points}
                            onChange={(event) => updatePackage(index, { points: toPointValue(event.target.value) })}
                            className="mt-1 h-9 w-full rounded-[10px] border border-[#E5E7EB] px-3 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-bold text-[#6B7280]">보너스 포인트</span>
                          <input
                            type="number"
                            min={0}
                            value={pointPackage.bonusPoints}
                            onChange={(event) => updatePackage(index, { bonusPoints: toPointValue(event.target.value) })}
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
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex h-10 items-center justify-center rounded-[12px] bg-[#2563EB] px-5 text-[13px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장하기"}
              </button>
              {message ? <p className="text-[12px] font-bold text-[#16A34A]">{message}</p> : null}
              {error ? <p className="text-[12px] font-bold text-[#DC2626]">{error}</p> : null}
            </div>
          </section>
        ) : activeTab === "popup" ? (
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
                  onChange={(event) => setPopupSettings((prev) => ({ ...prev, enabled: event.target.checked }))}
                  className="h-5 w-5 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-bold text-[#374151]">팝업 제목</span>
                <input
                  value={popupSettings.title}
                  onChange={(event) => setPopupSettings((prev) => ({ ...prev, title: event.target.value }))}
                  maxLength={80}
                  className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-bold text-[#374151]">팝업 내용</span>
                <input
                  value={popupSettings.content}
                  onChange={(event) => setPopupSettings((prev) => ({ ...prev, content: event.target.value }))}
                  maxLength={120}
                  className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-[13px] font-bold text-[#374151]">첫 번째 박스 제목</span>
                  <input
                    value={popupSettings.featureTitle}
                    onChange={(event) => setPopupSettings((prev) => ({ ...prev, featureTitle: event.target.value }))}
                    maxLength={80}
                    className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-bold text-[#374151]">첫 번째 박스 설명</span>
                  <input
                    value={popupSettings.featureDescription}
                    onChange={(event) => setPopupSettings((prev) => ({ ...prev, featureDescription: event.target.value }))}
                    maxLength={160}
                    className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-bold text-[#374151]">두 번째 박스 제목</span>
                  <input
                    value={popupSettings.eventTitle}
                    onChange={(event) => setPopupSettings((prev) => ({ ...prev, eventTitle: event.target.value }))}
                    maxLength={80}
                    className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-bold text-[#374151]">두 번째 박스 설명</span>
                  <input
                    value={popupSettings.eventDescription}
                    onChange={(event) => setPopupSettings((prev) => ({ ...prev, eventDescription: event.target.value }))}
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
                    onChange={(event) => setPopupSettings((prev) => ({ ...prev, buttonLabel: event.target.value }))}
                    maxLength={30}
                    className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-bold text-[#374151]">버튼 링크</span>
                  <input
                    value={popupSettings.buttonUrl}
                    onChange={(event) => setPopupSettings((prev) => ({ ...prev, buttonUrl: event.target.value }))}
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
                      <div className="text-[56px] leading-none">🌿</div>
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
                        <span className="text-[20px] leading-none">⚡</span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold leading-7 text-[#111827]">
                            {popupSettings.featureTitle || "첫 번째 박스 제목"}
                          </p>
                          <p className="break-keep text-[12px] font-medium leading-3 text-[#6b7280]">
                            {popupSettings.featureDescription || "첫 번째 박스 설명"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-[14px] bg-[#f0fbf3] px-5 py-3">
                        <span className="text-[20px] leading-none">🎁</span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold leading-7 text-[#111827]">
                            {popupSettings.eventTitle || "두 번째 박스 제목"}
                          </p>
                          <p className="mt-1 break-keep text-[12px] font-medium leading-3 text-[#6b7280]">
                            {popupSettings.eventDescription || "두 번째 박스 설명"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-[12px] font-medium text-[#5f6673]">
                        <span className="h-4 w-4 rounded-[4px] border border-[#9ca3af]" />
                        오늘 하루 열지 않기
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
                onClick={() => void handlePopupSave()}
                disabled={saving}
                className="flex h-10 items-center justify-center rounded-[12px] bg-[#2563EB] px-5 text-[13px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "팝업 저장하기"}
              </button>
              {message ? <p className="text-[12px] font-bold text-[#16A34A]">{message}</p> : null}
              {error ? <p className="text-[12px] font-bold text-[#DC2626]">{error}</p> : null}
            </div>
          </section>
        ) : (
          <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-[13px] font-bold text-[#6B7280]">준비 중인 설정입니다.</p>
          </section>
        )}
      </div>
    </div>
  );
}
