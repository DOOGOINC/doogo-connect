"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { buildReferralLink, sanitizeReferralCode } from "@/utils/referral";

interface Profile {
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  referral_code: string | null;
  referred_by_code: string | null;
  referred_by_profile_id?: string | null;
}

type PointSummaryPayload = {
  referralCount?: number;
};

function isKakaoUser(user: User | null | undefined) {
  if (!user) return false;

  if (user.app_metadata?.provider === "kakao") {
    return true;
  }

  if (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("kakao")) {
    return true;
  }

  return (user.identities || []).some((identity) => identity.provider === "kakao");
}

const TEXT = {
  settings: "\uACC4\uC815 \uC124\uC815",
  accountInfo: "\uACC4\uC815 \uC815\uBCF4",
  basicInfo: "\uAE30\uBCF8 \uC815\uBCF4",
  referral: "\uCD94\uCC9C\uC778 \uCF54\uB4DC",
  email: "\uC774\uBA54\uC77C",
  password: "\uBE44\uBC00\uBC88\uD638",
  name: "\uC774\uB984",
  phone: "\uC5F0\uB77D\uCC98",
  change: "\uBCC0\uACBD\uD558\uAE30",
  changeConfirm: "\uBCC0\uACBD \uD655\uC778",
  cancel: "\uCDE8\uC18C",
  noEmail: "\uC774\uBA54\uC77C \uC815\uBCF4 \uC5C6\uC74C",
  noName: "\uC774\uB984 \uC815\uBCF4 \uC5C6\uC74C",
  noPhone: "\uC5F0\uB77D\uCC98 \uC815\uBCF4 \uC5C6\uC74C",
  emailPending: "\uC778\uC99D \uB300\uAE30 \uC911",
  passwordMailSent: "\uC7AC\uC124\uC815 \uBA54\uC77C \uBC1C\uC1A1 \uC644\uB8CC",
  socialNotice: "\uCE74\uCE74\uC624 \uB85C\uADF8\uC778 \uACC4\uC815\uC740 \uC774 \uD654\uBA74\uC5D0\uC11C \uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uC9C1\uC811 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  infoReadonly: "\uC774\uB984\uACFC \uC5F0\uB77D\uCC98 \uC815\uBCF4\uB294 \uACE0\uAC1D\uC13C\uD130\uB97C \uD1B5\uD574\uC11C\uB9CC \uBCC0\uACBD \uAC00\uB2A5\uD569\uB2C8\uB2E4.",
  referralDesc:
    "\uB0B4 \uCD94\uCC9C \uB9C1\uD06C\uB97C \uACF5\uC720\uD558\uAC70\uB098, \uB9C1\uD06C \uC5C6\uC774 \uAC00\uC785\uD55C \uACBD\uC6B0 \uC544\uB798\uC5D0\uC11C \uCD94\uCC9C\uC778 \uCF54\uB4DC\uB97C \uC0AC\uD6C4 \uC785\uB825\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  myCode: "\uB0B4 \uCF54\uB4DC",
  generating: "\uC0DD\uC131 \uC911",
  copyLink: "\uCD94\uCC9C \uB9C1\uD06C \uBCF5\uC0AC",
  copying: "\uBCF5\uC0AC \uC911...",
  registeredReferrer: "\uB4F1\uB85D\uB41C \uCD94\uCC9C\uC778",
  referralOnlyOnce: "\uCD94\uCC9C\uC778 \uB4F1\uB85D\uC740 \uACC4\uC815\uB2F9 1\uD68C\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4.",
  manualReferral: "\uCD94\uCC9C\uC778 \uCF54\uB4DC \uC0AC\uD6C4 \uC785\uB825",
  manualReferralHint:
    "\uB9C1\uD06C \uC5C6\uC774 \uAC00\uC785\uD588\uB354\uB77C\uB3C4 \uC720\uD6A8\uD55C \uCD94\uCC9C\uC778 \uCF54\uB4DC\uB97C \uC54C\uACE0 \uC788\uC73C\uBA74 \uC5EC\uAE30\uC11C \uD55C \uBC88\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  referralInput: "\uCD94\uCC9C\uC778 \uCF54\uB4DC \uC785\uB825",
  referralRegister: "\uCD94\uCC9C\uC778 \uB4F1\uB85D",
  referralRegistering: "\uB4F1\uB85D \uC911...",
  userUpdated: "\uACC4\uC815 \uC815\uBCF4\uAC00 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  resetConfirm:
    "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uBA54\uC77C\uC744 \uBCF4\uB0B4\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uD655\uC778\uC744 \uB204\uB974\uBA74 \uBA54\uC77C\uB85C \uC7AC\uC124\uC815 \uB9C1\uD06C\uAC00 \uC804\uC1A1\uB429\uB2C8\uB2E4.",
  resetSent: "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uBA54\uC77C\uC744 \uBC1C\uC1A1\uD588\uC2B5\uB2C8\uB2E4. \uBA54\uC77C\uD568\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
  resetFailed: "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uBA54\uC77C \uBC1C\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  invalidEmail: "\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4.",
  sameEmail: "\uD604\uC7AC \uC774\uBA54\uC77C\uACFC \uB3D9\uC77C\uD569\uB2C8\uB2E4.",
  changeEmailConfirm:
    "\uBCC0\uACBD\uB41C \uC774\uBA54\uC77C\uC5D0\uC11C \uC778\uC99D\uC744 \uC644\uB8CC\uD574\uC57C \uCD5C\uC885 \uBC18\uC601\uB429\uB2C8\uB2E4.",
  emailChangedMail: "\uC8FC\uC18C\uB85C \uC778\uC99D \uBA54\uC77C\uC744 \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4. \uBA54\uC77C\uC5D0\uC11C Confirm \uBC84\uD2BC\uC744 \uB20C\uB7EC\uC57C \uCD5C\uC885 \uBC18\uC601\uB429\uB2C8\uB2E4.",
  emailChangeFailed: "\uC774\uBA54\uC77C \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  referralNeedInput: "\uCD94\uCC9C\uC778 \uCF54\uB4DC\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
  referralSaved: "\uCD94\uCC9C\uC778 \uCF54\uB4DC\uAC00 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  referralSaveFailed: "\uCD94\uCC9C\uC778 \uCF54\uB4DC \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  referralCopied: "\uCD94\uCC9C \uB9C1\uD06C\uB97C \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.",
  referralCopyFailed: "\uCD94\uCC9C \uB9C1\uD06C \uBCF5\uC0AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
} as const;

export function AccountSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isPasswordSent, setIsPasswordSent] = useState(false);
  const [isSocialAccount, setIsSocialAccount] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [referralError, setReferralError] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [isCopyingReferralLink, setIsCopyingReferralLink] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    void fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "USER_UPDATED") {
        window.alert(TEXT.userUpdated);
        void fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      setIsSocialAccount(isKakaoUser(session.user));

      await authFetch("/api/profile/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session.user.email || null,
        }),
      });

      const { data, error } = await supabase
        .from("profiles")
        .select("email, full_name, phone_number, referral_code, referred_by_code, referred_by_profile_id")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);

      const pointSummaryResponse = await authFetch("/api/points/summary");
      const pointSummaryPayload = (await pointSummaryResponse.json()) as PointSummaryPayload & { error?: string };
      if (pointSummaryResponse.ok) {
        setReferralCount(Number(pointSummaryPayload.referralCount || 0));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email || isSocialAccount) return;

    if (!window.confirm(TEXT.resetConfirm)) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setIsPasswordSent(true);
      window.alert(TEXT.resetSent);
      setTimeout(() => setIsPasswordSent(false), 5000);
    } catch {
      window.alert(TEXT.resetFailed);
    }
  };

  const handleEmailUpdate = async () => {
    if (isSocialAccount) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError(TEXT.invalidEmail);
      return;
    }

    if (newEmail === profile?.email) {
      setEmailError(TEXT.sameEmail);
      return;
    }

    if (!window.confirm(`Email: ${newEmail}\n${TEXT.changeEmailConfirm}`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setIsEmailSent(true);
      setIsChangingEmail(false);
      window.alert(`${newEmail} ${TEXT.emailChangedMail}`);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : TEXT.emailChangeFailed);
    }
  };

  const handleApplyReferral = async () => {
    const referralCode = sanitizeReferralCode(referralInput);

    if (!referralCode) {
      setReferralError(TEXT.referralNeedInput);
      return;
    }

    setIsApplyingReferral(true);
    setReferralError("");
    setReferralMessage("");

    try {
      const response = await authFetch("/api/referral/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralCode,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || TEXT.referralSaveFailed);
      }

      setReferralInput("");
      setReferralMessage(TEXT.referralSaved);
      await fetchProfile();
    } catch (err) {
      setReferralError(err instanceof Error ? err.message : TEXT.referralSaveFailed);
    } finally {
      setIsApplyingReferral(false);
    }
  };

  const handleCopyReferralLink = async () => {
    if (!profile?.referral_code) return;

    const referralLink = buildReferralLink(profile.referral_code);
    if (!referralLink) return;

    try {
      setIsCopyingReferralLink(true);
      await navigator.clipboard.writeText(referralLink);
      setReferralMessage(TEXT.referralCopied);
      setReferralError("");
    } catch {
      setReferralError(TEXT.referralCopyFailed);
    } finally {
      setIsCopyingReferralLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
      <div className="mx-auto max-w-[800px]">
        <h1 className="mb-8 text-2xl font-bold text-[#191F28]">{TEXT.settings}</h1>

        <section className="mb-6 rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-[#191F28]">{TEXT.accountInfo}</h2>

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium text-[#8B95A1]">{TEXT.email}</p>
                {isChangingEmail ? (
                  <div className="mt-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value);
                        setEmailError("");
                      }}
                      placeholder="New email address"
                      className="h-12 w-full max-w-sm rounded-xl border border-[#E5E8EB] px-4 text-[15px] outline-none focus:border-[#0064FF] focus:ring-1 focus:ring-[#0064FF]"
                    />
                    {emailError ? <p className="mt-1 text-xs text-red-500">{emailError}</p> : null}
                    <div className="mt-3 flex gap-2">
                      <button onClick={handleEmailUpdate} className="rounded-lg bg-[#0064FF] px-4 py-2 text-sm font-semibold text-white">
                        {TEXT.changeConfirm}
                      </button>
                      <button
                        onClick={() => setIsChangingEmail(false)}
                        className="rounded-lg bg-[#F2F4F6] px-4 py-2 text-sm font-semibold text-[#4E5968]"
                      >
                        {TEXT.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-[#333D4B]">{profile?.email || TEXT.noEmail}</span>
                    {isEmailSent ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#E6FBF7] px-2 py-0.5 text-xs font-medium text-[#00D4B1] animate-pulse">
                        <CheckCircle2 className="h-3 w-3" /> {TEXT.emailPending}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {!isChangingEmail ? (
                <button
                  onClick={() => setIsChangingEmail(true)}
                  disabled={isSocialAccount}
                  className="rounded-lg border border-[#E5E8EB] px-4 py-2 text-sm font-semibold text-[#4E5968] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {TEXT.change}
                </button>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-[#F9FAFB] pt-6">
              <div>
                <p className="mb-1 text-sm font-medium text-[#8B95A1]">{TEXT.password}</p>
                <span className="text-[16px] font-semibold text-[#333D4B]">••••••••</span>
                {isPasswordSent ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#00D4B1]">
                    <CheckCircle2 className="h-3 w-3" /> {TEXT.passwordMailSent}
                  </p>
                ) : null}
              </div>
              <button
                onClick={handlePasswordReset}
                disabled={isSocialAccount}
                className="rounded-lg border border-[#E5E8EB] px-4 py-2 text-sm font-semibold text-[#4E5968] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {TEXT.change}
              </button>
            </div>

            {isSocialAccount ? (
              <p className="rounded-2xl bg-[#FFF8E1] px-4 py-3 text-[13px] text-[#8A6D1F]">{TEXT.socialNotice}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-[#191F28]">{TEXT.basicInfo}</h2>

          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium text-[#4E5968]">{TEXT.name}</p>
              <div className="flex h-14 w-full cursor-not-allowed items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-medium text-[#8B95A1]">
                {profile?.full_name || TEXT.noName}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[#4E5968]">{TEXT.phone}</p>
              <div className="flex h-14 w-full cursor-not-allowed items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-medium text-[#8B95A1]">
                {profile?.phone_number || TEXT.noPhone}
              </div>
            </div>

            <p className="pt-2 text-[13px] text-[#8B95A1]">{TEXT.infoReadonly}</p>
          </div>
        </section>

        <section className="mt-6 rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-[#191F28]">{TEXT.referral}</h2>
          <p className="mb-6 text-sm text-[#667085]">{TEXT.referralDesc}</p>

          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium text-[#4E5968]">{TEXT.myCode}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex h-14 flex-1 items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-semibold text-[#191F28]">
                  {profile?.referral_code || TEXT.generating}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyReferralLink()}
                  disabled={!profile?.referral_code || isCopyingReferralLink}
                  className="h-14 rounded-2xl border border-[#E5E8EB] px-5 text-sm font-semibold text-[#4E5968] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCopyingReferralLink ? TEXT.copying : TEXT.copyLink}
                </button>
              </div>
              <p className="mt-2 text-xs text-[#98A2B3]">나를 추천인으로 가입한 회원: {referralCount.toLocaleString()}명</p>
            </div>

            {profile?.referred_by_code ? (
              <div className="rounded-2xl bg-[#F8FAFC] px-5 py-4">
                <p className="text-sm font-semibold text-[#344054]">{TEXT.registeredReferrer}</p>
                <p className="mt-1 text-[15px] font-bold text-[#191F28]">{profile.referred_by_code}</p>
                <p className="mt-2 text-xs text-[#98A2B3]">{TEXT.referralOnlyOnce}</p>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-medium text-[#4E5968]">{TEXT.manualReferral}</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(event) => {
                      setReferralInput(event.target.value.toUpperCase());
                      setReferralError("");
                      setReferralMessage("");
                    }}
                    placeholder={TEXT.referralInput}
                    className="h-14 flex-1 rounded-2xl border border-[#E5E8EB] px-5 text-[15px] font-medium text-[#191F28] outline-none transition focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10"
                  />
                  <button
                    type="button"
                    onClick={() => void handleApplyReferral()}
                    disabled={isApplyingReferral}
                    className="h-14 rounded-2xl bg-[#0064FF] px-5 text-sm font-semibold text-white transition hover:bg-[#0052D4] disabled:bg-[#AAB4C8]"
                  >
                    {isApplyingReferral ? TEXT.referralRegistering : TEXT.referralRegister}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#98A2B3]">{TEXT.manualReferralHint}</p>
              </div>
            )}

            {referralError ? <p className="text-sm font-medium text-[#E5484D]">{referralError}</p> : null}
            {referralMessage ? <p className="text-sm font-medium text-[#00A86B]">{referralMessage}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
