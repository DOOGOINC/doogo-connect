"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";

type PartnerSettings = {
  fullName: string;
  email: string;
  referralCode: string;
  commissionRate: number;
  companyName: string;
  businessRegistrationNumber: string;
  representativeName: string;
  businessCategory: string;
  businessAddress: string;
  contactPhone: string;
  taxInvoiceEmail: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
};

type PartnerSettingsResponse = {
  success: boolean;
  settings: PartnerSettings;
  error?: string;
};

type PartnerSettingsPanelProps = {
  onDisplayNameChange?: (value: string) => void;
};

type SavedSection = "business" | "password" | "bank" | "";

const EMPTY_SETTINGS: PartnerSettings = {
  fullName: "",
  email: "",
  referralCode: "",
  commissionRate: 2,
  companyName: "",
  businessRegistrationNumber: "",
  representativeName: "",
  businessCategory: "",
  businessAddress: "",
  contactPhone: "",
  taxInvoiceEmail: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
};

function readRouteError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

function formatCommissionRate(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function StaticInfoItem({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-[#6B7280]">{label}</p>
      <p className={`mt-1 text-[15px] font-bold ${accent ? "tracking-[0.04em] text-[#2563EB]" : "text-[#111827]"}`}>{value || "-"}</p>
    </div>
  );
}

export function PartnerSettingsPanel({ onDisplayNameChange }: PartnerSettingsPanelProps) {
  const [settings, setSettings] = useState<PartnerSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [savedSection, setSavedSection] = useState<SavedSection>("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch("/api/partner/settings");
      const payload = (await response.json()) as PartnerSettingsResponse;

      if (!response.ok) {
        throw new Error(readRouteError(payload, "설정 정보를 불러오지 못했습니다."));
      }

      setSettings(payload.settings);
      onDisplayNameChange?.(payload.settings.fullName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "설정 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (key: keyof PartnerSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = async (section: Extract<SavedSection, "business" | "bank">) => {
    setSavingProfile(true);
    setError("");
    setSavedSection("");

    try {
      const response = await authFetch("/api/partner/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as PartnerSettingsResponse;

      if (!response.ok) {
        throw new Error(readRouteError(payload, "설정을 저장하지 못했습니다."));
      }

      setSettings(payload.settings);
      setSavedSection(section);
      onDisplayNameChange?.(payload.settings.fullName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    setSavingPassword(true);
    setError("");
    setSavedSection("");

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("비밀번호 항목을 모두 입력해 주세요.");
      }
      if (newPassword.length < 6) {
        throw new Error("새 비밀번호는 6자 이상이어야 합니다.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = settings.email.trim() || user?.email || "";
      if (!email) {
        throw new Error("현재 계정 이메일을 확인할 수 없습니다.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("현재 비밀번호가 올바르지 않습니다.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSavedSection("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <section className="flex flex-1 items-center justify-center bg-[#f9fafb] px-6 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </section>
    );
  }

  return (
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#f9fafb] px-6 py-6">
      <div className="w-full max-w-[800px]">
        <div className="mb-6">
          <h1 className="text-[20px] font-bold tracking-[-0.03em] text-[#111827]">설정</h1>
        </div>

        {error ? (
          <div className="mb-4 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B91C1C]">{error}</div>
        ) : null}

        <div className="space-y-5">
          <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm">
            <h2 className="text-[14px] font-bold text-[#111827]">파트너 기본 정보</h2>
            <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
              <StaticInfoItem label="이름" value={settings.fullName} />
              <StaticInfoItem label="이메일" value={settings.email} />
              <StaticInfoItem label="추천 코드" value={settings.referralCode} accent />
              <StaticInfoItem label="수수료율" value={formatCommissionRate(settings.commissionRate)} />
            </div>
          </section>

          <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm">
            <h2 className="text-[14px] font-bold text-[#111827]">사업자 정보</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={settings.companyName}
                onChange={(event) => handleSettingsChange("companyName", event.target.value)}
                placeholder="상호명(법인명)"
                className="h-11 rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="text"
                value={settings.businessRegistrationNumber}
                onChange={(event) => handleSettingsChange("businessRegistrationNumber", event.target.value)}
                placeholder="사업자등록번호"
                className="h-11 rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="text"
                value={settings.representativeName}
                onChange={(event) => handleSettingsChange("representativeName", event.target.value)}
                placeholder="대표자명"
                className="h-11 rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="text"
                value={settings.businessCategory}
                onChange={(event) => handleSettingsChange("businessCategory", event.target.value)}
                placeholder="업태/업종"
                className="h-11 rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="text"
                value={settings.businessAddress}
                onChange={(event) => handleSettingsChange("businessAddress", event.target.value)}
                placeholder="사업장 주소"
                className="h-11 rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF] md:col-span-2"
              />
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(event) => handleSettingsChange("contactPhone", event.target.value)}
                placeholder="연락처"
                className="h-11 rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="email"
                value={settings.taxInvoiceEmail}
                onChange={(event) => handleSettingsChange("taxInvoiceEmail", event.target.value)}
                placeholder="세금계산서 이메일"
                className="h-11 rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void saveSettings("business")}
                disabled={savingProfile}
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2563EB] px-5 text-[14px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장하기"}
              </button>
              {savedSection === "business" ? <span className="text-[13px] font-semibold text-[#16A34A]">설정이 저장되었습니다.</span> : null}
            </div>
          </section>

          <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm">
            <h2 className="text-[14px] font-bold text-[#111827]">비밀번호 변경</h2>
            <div className="mt-5 space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="현재 비밀번호"
                className="h-11 w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="새 비밀번호"
                className="h-11 w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="비밀번호 확인"
                className="h-11 w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handlePasswordChange()}
                disabled={savingPassword}
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2563EB] px-5 text-[14px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "변경하기"}
              </button>
              {savedSection === "password" ? <span className="text-[13px] font-semibold text-[#16A34A]">설정이 저장되었습니다.</span> : null}
            </div>
          </section>

          <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm">
            <h2 className="text-[14px] font-bold text-[#111827]">정산 계좌 정보</h2>
            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={settings.bankName}
                onChange={(event) => handleSettingsChange("bankName", event.target.value)}
                placeholder="은행명"
                className="h-11 w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="text"
                value={settings.bankAccountNumber}
                onChange={(event) => handleSettingsChange("bankAccountNumber", event.target.value)}
                placeholder="계좌번호"
                className="h-11 w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
              <input
                type="text"
                value={settings.bankAccountHolder}
                onChange={(event) => handleSettingsChange("bankAccountHolder", event.target.value)}
                placeholder="예금주"
                className="h-11 w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 text-[13px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void saveSettings("bank")}
                disabled={savingProfile}
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2563EB] px-5 text-[14px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장하기"}
              </button>
              {savedSection === "bank" ? <span className="text-[13px] font-semibold text-[#16A34A]">설정이 저장되었습니다.</span> : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
