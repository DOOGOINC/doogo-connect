"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchRefereeRewardPoints, formatRewardPoints } from "@/lib/client/referee-reward";
import { DEFAULT_REFEREE_REWARD_POINTS } from "@/lib/points/constants";
import { supabase } from "@/lib/supabase";
import {
  captureReferralFromLocation,
  clearStoredReferralCode,
  getStoredReferralCode,
  isStoredReferralLocked,
  persistReferralCode,
  setStoredReferralLock,
  sanitizeReferralCode,
} from "@/utils/referral";

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export default function SignupPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState(() => getStoredReferralCode() || "");
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [refereeRewardPoints, setRefereeRewardPoints] = useState(DEFAULT_REFEREE_REWARD_POINTS);

  useEffect(() => {
    const capturedReferralCode = captureReferralFromLocation();
    if (!capturedReferralCode && isStoredReferralLocked()) {
      clearStoredReferralCode();
    }
    setReferralCodeInput(getStoredReferralCode() || "");
    setIsReferralLocked(isStoredReferralLocked());
  }, []);

  useEffect(() => {
    let active = true;

    void fetchRefereeRewardPoints().then((points) => {
      if (!active) return;
      setRefereeRewardPoints(points);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleKakaoSignup = async () => {
    setLoading(true);
    setError(null);

    try {
      captureReferralFromLocation();
      const next = "/";
      const kakaoSignupNext = `/kakao-referral?next=${encodeURIComponent(next)}`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(kakaoSignupNext)}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo,
          scopes: "account_email",
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "카카오 회원가입 연결에 실패했습니다.");
    }
  };

  const handleSignup = async () => {
    setError(null);

    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }

    if (!normalizedEmail) {
      setError("이메일을 입력해 주세요.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    if (!normalizedPhone) {
      setError("연락처를 입력해 주세요.");
      return;
    }

    if (!password) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      setError("필수 약관에 동의해야 회원가입이 가능합니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    const normalizedReferralCode = sanitizeReferralCode(referralCodeInput);
    if (referralCodeInput.trim()) {
      if (!normalizedReferralCode) {
        setError("추천인 코드가 올바르지 않습니다.");
        return;
      }

      const referralValidationResponse = await fetch("/api/referral/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralCode: normalizedReferralCode,
        }),
      });
      const referralValidationPayload = (await referralValidationResponse.json()) as { error?: string; valid?: boolean };

      if (!referralValidationResponse.ok || !referralValidationPayload.valid) {
        setError(referralValidationPayload.error || "추천인 코드가 올바르지 않습니다.");
        return;
      }

      persistReferralCode(normalizedReferralCode);
      if (!isReferralLocked) {
        setStoredReferralLock(false);
      }
    } else {
      clearStoredReferralCode();
    }

    setLoading(true);

    try {
      const next = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/")}`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: next,
          data: {
            name: name.trim(),
            full_name: name.trim(),
            phone_number: normalizedPhone,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (signUpData.user?.identities?.length === 0) {
        throw new Error("이미 가입된 계정이거나 이메일 인증 대기 상태입니다.");
      }

      window.alert("인증 메일을 발송했습니다. 메일의 링크를 완료하면 회원가입이 마무리됩니다.");
      router.replace("/?auth=login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-180px)] items-center justify-center px-6 py-20">
      <div className="w-full max-w-[520px] rounded-[14px] bg-white p-6 shadow-sm">
        <div className="mb-6 mt-2">
          <h1 className="text-[20px] font-bold tracking-tight text-[#191f28]">회원가입</h1>
          <p className="mt-1 text-[12px] font-medium text-[#8b95a1]">DOOGO Connect 서비스를 시작해보세요</p>
        </div>

        <button
          type="button"
          onClick={() => void handleKakaoSignup()}
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-[15px] font-bold text-[#191f28] transition-all hover:bg-[#FADA00] active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3C6.477 3 2 6.48 2 10.79c0 2.72 1.8 5.12 4.54 6.51-.18.66-.65 2.37-.74 2.74-.11.45.16.44.34.33.14-.09 2.27-1.54 3.19-2.17.89.12 1.8.19 2.73.19 5.52 0 10-3.48 10-7.79S17.52 3 12 3z" />
            </svg>
          )}
          카카오로 회원가입
        </button>

        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-slate-100" />
          <span className="mx-3 flex-shrink text-[12px] font-bold text-[#adb5bd]">또는 이메일</span>
          <div className="flex-grow border-t border-slate-100" />
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSignup();
          }}
        >
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
          />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
          />
          <input
            type="tel"
            placeholder="연락처"
            value={phone}
            onChange={(event) => setPhone(normalizePhoneNumber(event.target.value))}
            autoComplete="tel"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
          />
          <div>
            <div className="flex h-12 w-full items-center justify-between rounded-[24px] border border-slate-200 bg-white px-6">
              <input
                type="text"
                placeholder="추천인 코드 (선택)"
                value={referralCodeInput}
                onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase())}
                autoComplete="off"
                disabled={isReferralLocked}
                className="h-full flex-1 bg-transparent text-[14px] font-medium text-[#191f28] outline-none placeholder:text-[#adb5bd] disabled:text-[#98A2B3]"
              />
              <span className="inline-flex h-8 items-center rounded-full bg-[#E8F9EE] px-4 text-[13px] font-bold text-[#16A34A]">
                +{formatRewardPoints(refereeRewardPoints)}
              </span>
            </div>
            {isReferralLocked ? (
              <p className="mt-2 text-[12px] font-medium text-[#6b7684]">파트너 추천 링크로 자동 적용된 코드입니다.</p>
            ) : null}
            <p className="mt-3 flex items-center gap-2 text-[12px] font-bold text-[#16A34A]">
              <span aria-hidden="true">*</span>
              추천인 코드 입력 시 {formatRewardPoints(refereeRewardPoints)}를 즉시 지급합니다
            </p>
            <p className="mt-2 text-[12px] font-medium text-[#6b7684]">가입 완료 후 인증 메일의 링크를 눌러야 로그인할 수 있습니다.</p>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-[#4E5968]">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0064FF] focus:ring-[#0064FF]"
            />
            <span className="leading-5">
              <Link
                href="/policy/terms"
                className="font-semibold text-[#0064FF] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                이용약관
              </Link>{" "}
              동의 (필수)
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-[#4E5968]">
            <input
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(event) => setAgreedToPrivacy(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0064FF] focus:ring-[#0064FF]"
            />
            <span className="leading-5">
              <Link
                href="/policy/privacy"
                className="font-semibold text-[#0064FF] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                개인정보처리방침
              </Link>{" "}
              동의 (필수)
            </span>
          </label>

          {error ? <p className="text-center text-[12px] font-medium text-[#f04452]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || !agreedToTerms || !agreedToPrivacy}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#0064FF] text-[16px] font-bold text-white transition-all hover:bg-[#0052d4] active:scale-[0.98] disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "회원가입 완료"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[13px] font-medium text-[#6b7684]">
            이미 계정이 있으신가요?{" "}
            <Link href="/?auth=login" className="font-bold text-[#0064FF] hover:underline">
              로그인
            </Link>
          </p>
          <Link href="/forgot-password" className="text-[12px] font-medium text-[#adb5bd] hover:text-[#8b95a1] hover:underline">
            비밀번호를 잊으셨나요?
          </Link>
        </div>
      </div>
    </main>
  );
}
