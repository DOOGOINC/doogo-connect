"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { fetchRefereeRewardPoints, formatRewardPoints } from "@/lib/client/referee-reward";
import { DEFAULT_REFEREE_REWARD_POINTS } from "@/lib/points/constants";
import { supabase } from "@/lib/supabase";
import { clearStoredReferralCode, getStoredReferralCode, persistReferralCode, sanitizeReferralCode } from "@/utils/referral";

type ProfileRow = {
  full_name: string | null;
  phone_number: string | null;
  referred_by_code: string | null;
};

type KakaoReferralPageClientProps = {
  nextPath: string;
};

function trimValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function isKakaoUser(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string | null }> | null;
} | null) {
  if (!user) return false;

  if (user.app_metadata?.provider === "kakao") {
    return true;
  }

  if (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("kakao")) {
    return true;
  }

  return (user.identities || []).some((identity) => identity.provider === "kakao");
}

async function readRouteError(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallbackMessage;
  }

  return fallbackMessage;
}

export default function KakaoReferralPageClient({ nextPath }: KakaoReferralPageClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [appliedReferralCode, setAppliedReferralCode] = useState("");
  const [error, setError] = useState("");
  const [refereeRewardPoints, setRefereeRewardPoints] = useState(DEFAULT_REFEREE_REWARD_POINTS);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session?.user) {
          router.replace("/?auth=signup");
          return;
        }

        if (!isKakaoUser(session.user)) {
          router.replace(nextPath);
          return;
        }

        setEmail(session.user.email || "");

        const storedReferralCode = getStoredReferralCode();
        if (storedReferralCode) {
          setReferralCodeInput(storedReferralCode);
        }

        const response = await authFetch("/api/profile/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: session.user.email || null,
          }),
        });

        if (!response.ok) {
          throw new Error(await readRouteError(response, "프로필 정보를 불러오지 못했습니다."));
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, phone_number, referred_by_code")
          .eq("id", session.user.id)
          .maybeSingle<ProfileRow>();

        if (profileError) {
          throw new Error(profileError.message);
        }

        if (!active) return;

        setFullName(trimValue(data?.full_name));
        setPhoneNumber(normalizePhoneNumber(trimValue(data?.phone_number)));
        setAppliedReferralCode(trimValue(data?.referred_by_code));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "카카오 회원가입 정보를 준비하지 못했습니다.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchRefereeRewardPoints(controller.signal).then((points) => {
      setRefereeRewardPoints(points);
    });

    return () => {
      controller.abort();
    };
  }, []);

  const handleSubmit = async () => {
    const trimmedName = fullName.trim();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const normalizedReferralCode = sanitizeReferralCode(referralCodeInput);

    setError("");

    if (!trimmedName) {
      setError("이름을 입력해 주세요.");
      return;
    }

    if (normalizedPhone.length < 10) {
      setError("연락처를 정확히 입력해 주세요.");
      return;
    }

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
    }

    setIsSaving(true);

    try {
      if (normalizedReferralCode) {
        persistReferralCode(normalizedReferralCode);
      } else {
        clearStoredReferralCode();
      }

      const profileResponse = await authFetch("/api/profile/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: trimmedName,
          email: email || null,
          phoneNumber: normalizedPhone,
          referralCode: normalizedReferralCode,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error(await readRouteError(profileResponse, "프로필 저장에 실패했습니다."));
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          name: trimmedName,
          full_name: trimmedName,
          phone_number: normalizedPhone,
        },
      });

      if (metadataError) {
        console.warn("Auth metadata update skipped:", metadataError.message);
      }

      clearStoredReferralCode();
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "카카오 회원가입 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl items-center px-6 py-18">
      <section className="w-full p-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-[#0064FF]">카카오 회원가입</p>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[#191F28]">기본 정보와 추천인 코드를 입력해 주세요</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7684]">
            카카오로 로그인한 회원은 이 단계에서 이름과 연락처만 한 번 입력하면 됩니다.
            <br />
            추천인 코드는 선택 입력이며 최초 1회만 적용됩니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[#333D4B]" htmlFor="kakao-email">
              이메일
            </label>
            <input
              id="kakao-email"
              type="email"
              value={email}
              disabled
              className="h-12 w-full rounded-xl border border-[#E5E8EB] bg-[#F8FAFC] px-4 text-[15px] text-[#98A2B3] outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#333D4B]" htmlFor="kakao-full-name">
              이름
            </label>
            <input
              id="kakao-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={isLoading || isSaving}
              autoComplete="name"
              className="h-12 w-full rounded-xl border border-[#E5E8EB] px-4 text-[15px] text-[#191F28] outline-none transition focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10 disabled:bg-[#F2F4F6]"
              placeholder="이름을 입력해 주세요"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#333D4B]" htmlFor="kakao-phone-number">
              연락처
            </label>
            <input
              id="kakao-phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(normalizePhoneNumber(event.target.value))}
              disabled={isLoading || isSaving}
              autoComplete="tel"
              className="h-12 w-full rounded-xl border border-[#E5E8EB] px-4 text-[15px] text-[#191F28] outline-none transition focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10 disabled:bg-[#F2F4F6]"
              placeholder="01012345678"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[#333D4B]" htmlFor="kakao-referral-code">
              추천인 코드
            </label>
            <div className="flex h-12 w-full items-center justify-between rounded-[24px] border border-[#E5E8EB] bg-white px-6">
              <input
                id="kakao-referral-code"
                type="text"
                value={appliedReferralCode || referralCodeInput}
                onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase())}
                disabled={isLoading || isSaving || Boolean(appliedReferralCode)}
                autoComplete="off"
                className="h-full flex-1 bg-transparent text-[14px] font-medium text-[#191F28] outline-none placeholder:text-[#ADB5BD] disabled:text-[#98A2B3]"
                placeholder="추천인 코드 (선택)"
              />
              <span className="inline-flex h-8 items-center rounded-full bg-[#E8F9EE] px-4 text-[13px] font-bold text-[#16A34A]">
                +{formatRewardPoints(refereeRewardPoints)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-[#16A34A]">추천인 코드 입력 시 {formatRewardPoints(refereeRewardPoints)}를 즉시 지급합니다</p>
            {appliedReferralCode ? (
              <p className="mt-2 text-[12px] font-medium text-[#6B7684]">적용된 추천인 코드: {appliedReferralCode}</p>
            ) : (
              <p className="mt-2 text-[12px] font-medium text-[#6B7684]">추천인 코드는 회원가입 후 최초 1회만 적용됩니다</p>
            )}
          </div>
        </div>

        {error ? <p className="mt-5 text-sm font-medium text-[#E5484D]">{error}</p> : null}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || isSaving}
            className="flex h-12 min-w-[180px] items-center justify-center rounded-xl bg-[#0064FF] px-6 text-sm font-semibold text-white transition hover:bg-[#0052D4] disabled:bg-[#AAB4C8]"
          >
            {isLoading || isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "가입 완료"}
          </button>
        </div>
      </section>
    </main>
  );
}
