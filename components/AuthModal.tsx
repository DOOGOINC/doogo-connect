"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setMounted(true);
    setMode(initialMode);
    setError(null);
    setIsOtpSent(false);
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setVerificationCode("");
    setConfirmPassword("");
  }, [initialMode, isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleKakaoLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const next = `${window.location.pathname}${window.location.search}`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

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
      setError(err instanceof Error ? err.message : "카카오 로그인 연결에 실패했습니다.");
    }
  };

  const handleRequestOtp = async () => {
    if (!email) {
      setError("이메일을 입력해 주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setIsOtpSent(true);
      window.alert("인증번호를 발송했습니다. 메일함을 확인해 주세요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setError(null);

    if (mode === "login") {
      if (!email || !password) {
        setError("이메일과 비밀번호를 모두 입력해 주세요.");
        return;
      }

      setLoading(true);

      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        onClose();
      } catch (err) {
        const message =
          err instanceof Error && err.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 일치하지 않습니다."
            : err instanceof Error
              ? err.message
              : "로그인 중 오류가 발생했습니다.";

        setError(message);
      } finally {
        setLoading(false);
      }

      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }

    if (!email) {
      setError("이메일을 입력해 주세요.");
      return;
    }

    if (!isOtpSent) {
      setError("이메일 인증 요청을 먼저 진행해 주세요.");
      return;
    }

    if (!verificationCode) {
      setError("인증 코드를 입력해 주세요.");
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

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: "email",
      });

      if (verifyError) {
        const { error: verifySignupError } = await supabase.auth.verifyOtp({
          email,
          token: verificationCode,
          type: "signup",
        });

        if (verifySignupError) {
          throw new Error("인증 코드가 올바르지 않거나 만료되었습니다.");
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: name.trim(),
          phone_number: normalizedPhone,
        },
      });

      if (updateError) {
        throw updateError;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profileResponse = await authFetch("/api/profile/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: name.trim(),
            email,
            phoneNumber: normalizedPhone,
          }),
        });
        const profilePayload = (await profileResponse.json()) as { error?: string };

        if (!profileResponse.ok) {
          throw new Error(profilePayload.error || "프로필 저장에 실패했습니다.");
        }
      }

      window.alert("회원가입이 완료되었습니다.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/60 px-6 fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[400px] animate-in rounded-[24px] bg-white p-8 shadow-2xl zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 mt-2 text-center">
          <h2 className="text-[24px] font-bold tracking-tight text-[#191f28]">{mode === "login" ? "로그인" : "회원가입"}</h2>
          <p className="mt-1 text-[14px] font-medium text-[#8b95a1]">DOOGO Connect</p>
        </div>

        <button
          type="button"
          onClick={() => void handleKakaoLogin()}
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
          카카오 로그인
        </button>

        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="mx-3 flex-shrink text-[12px] font-bold text-[#adb5bd]">또는 이메일</span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAuth();
          }}
        >
          {mode === "signup" ? (
            <>
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
              />
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={isOtpSent}
                  className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => void handleRequestOtp()}
                  disabled={loading || isOtpSent}
                  className="h-12 whitespace-nowrap rounded-xl bg-[#f2f4f6] px-4 text-[13px] font-bold text-[#4e5968] transition-all hover:bg-[#e5e8eb] disabled:opacity-50"
                >
                  {isOtpSent ? "발송완료" : "인증요청"}
                </button>
              </div>
              <input
                type="text"
                placeholder="인증 코드"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                autoComplete="one-time-code"
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
            </>
          ) : (
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
            />
          )}

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
          />

          {mode === "signup" ? (
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#adb5bd] focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5"
            />
          ) : null}

          {error ? <p className="text-center text-[12px] font-medium text-[#f04452]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#0064FF] text-[16px] font-bold text-white transition-all hover:bg-[#0052d4] active:scale-[0.98] disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "login" ? "로그인" : "회원가입 완료"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[13px] font-medium text-[#6b7684]">
            {mode === "login" ? "아직 회원이 아니신가요?" : "이미 계정이 있으신가요?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
                setIsOtpSent(false);
              }}
              className="font-bold text-[#0064FF] hover:underline"
            >
              {mode === "login" ? "회원가입" : "로그인"}
            </button>
          </p>
          {mode === "login" ? (
            <Link
              href="/forgot-password"
              onClick={onClose}
              className="text-[12px] font-medium text-[#adb5bd] hover:text-[#8b95a1] hover:underline"
            >
              비밀번호를 잊으셨나요?
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
