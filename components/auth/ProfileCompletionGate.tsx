"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { clearStoredReferralCode, getStoredReferralCode } from "@/utils/referral";

type ProfileRow = {
  full_name: string | null;
  phone_number: string | null;
  ban_type: "none" | "temporary" | "permanent" | null;
  ban_expires_at: string | null;
};

function trimValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatBanDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

function isBannedProfile(profile: Pick<ProfileRow, "ban_type" | "ban_expires_at"> | null | undefined) {
  if (!profile) return false;
  if (profile.ban_type === "permanent") return true;
  if (profile.ban_type === "temporary" && profile.ban_expires_at) {
    return new Date(profile.ban_expires_at).getTime() > Date.now();
  }
  return false;
}

function getBanLoginMessage(profile: Pick<ProfileRow, "ban_type" | "ban_expires_at"> | null | undefined) {
  if (!profile) {
    return "이 계정은 현재 제재 상태입니다. 관리자에게 문의해 주세요.";
  }

  if (profile.ban_type === "permanent") {
    return "이 계정은 현재 영구 차단 상태입니다. 관리자에게 문의해 주세요.";
  }

  if (profile.ban_type === "temporary" && profile.ban_expires_at) {
    return `이 계정은 ${formatBanDate(profile.ban_expires_at)}까지 로그인할 수 없습니다.`;
  }

  return "이 계정은 현재 제재 상태입니다. 관리자에게 문의해 주세요.";
}

async function readRouteError(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallbackMessage;
  }

  return fallbackMessage;
}

export function ProfileCompletionGate() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const alertedUserRef = useRef<string | null>(null);

  const checkProfileCompletion = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setError("");

    if (!nextSession?.user) {
      setIsOpen(false);
      setIsChecking(false);
      setFullName("");
      setPhoneNumber("");
      alertedUserRef.current = null;
      return;
    }

    setIsChecking(true);

    try {
      const referralCode = getStoredReferralCode();
      const kakaoUser = isKakaoUser(nextSession.user);

      if (kakaoUser || referralCode) {
        const response = await authFetch("/api/profile/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: nextSession.user.email || null,
            referralCode,
          }),
        });

        if (!response.ok) {
          throw new Error(await readRouteError(response, "프로필 동기화에 실패했습니다."));
        }

        if (referralCode) {
          clearStoredReferralCode();
        }
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone_number, ban_type, ban_expires_at")
        .eq("id", nextSession.user.id)
        .maybeSingle<ProfileRow>();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (isBannedProfile(data)) {
        setIsOpen(false);
        setFullName("");
        setPhoneNumber("");
        alertedUserRef.current = null;
        window.alert(getBanLoginMessage(data));
        await supabase.auth.signOut();
        window.location.href = "/?auth=login";
        return;
      }

      if (!kakaoUser || pathname === "/kakao-referral") {
        setIsOpen(false);
        setIsChecking(false);
        setFullName("");
        setPhoneNumber("");
        alertedUserRef.current = null;
        return;
      }

      const nextFullName = trimValue(data?.full_name);
      const nextPhoneNumber = normalizePhoneNumber(trimValue(data?.phone_number));
      const isIncomplete = !nextFullName || !nextPhoneNumber;

      setFullName(nextFullName);
      setPhoneNumber(nextPhoneNumber);
      setIsOpen(isIncomplete);

      if (isIncomplete && alertedUserRef.current !== nextSession.user.id) {
        alertedUserRef.current = nextSession.user.id;
        window.alert("카카오 로그인 이후에는 기본 정보 입력이 필요합니다. 이름과 연락처를 입력해 주세요.");
      }
    } catch (err) {
      console.error("Profile completion check failed:", err);
      setIsOpen(false);
    } finally {
      setIsChecking(false);
    }
  }, [pathname]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      void checkProfileCompletion(nextSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void checkProfileCompletion(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkProfileCompletion]);

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!trimmedName) {
      setError("이름을 입력해 주세요.");
      return;
    }

    if (normalizedPhone.length < 10) {
      setError("연락처를 정확히 입력해 주세요.");
      return;
    }

    if (!session?.user) {
      setError("로그인 상태를 다시 확인해 주세요.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const referralCode = getStoredReferralCode();
      const profileResponse = await authFetch("/api/profile/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: trimmedName,
          email: session.user.email || null,
          phoneNumber: normalizedPhone,
          referralCode,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error(await readRouteError(profileResponse, "프로필 저장에 실패했습니다."));
      }

      if (referralCode) {
        clearStoredReferralCode();
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

      setFullName(trimmedName);
      setPhoneNumber(normalizedPhone);
      setIsOpen(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-6">
      <div className="w-full max-w-md rounded-[14px] bg-white p-8 shadow-2xl">
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold text-[#0064FF]">카카오 로그인 완료</p>
          <h2 className="text-2xl font-bold text-[#191F28]">기본 정보를 입력해 주세요.</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7684]">
            카카오에서는 이메일만 연동됩니다. 서비스 이용을 위해 이름과 연락처를 한 번만 입력해 주세요.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#333D4B]" htmlFor="profile-full-name">
              이름
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              disabled={isChecking || isSaving}
              className="h-12 w-full rounded-xl border border-[#E5E8EB] px-4 text-[15px] text-[#191F28] outline-none transition focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10 disabled:bg-[#F2F4F6]"
              placeholder="이름을 입력해 주세요."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#333D4B]" htmlFor="profile-phone-number">
              연락처
            </label>
            <input
              id="profile-phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(normalizePhoneNumber(event.target.value))}
              autoComplete="tel"
              disabled={isChecking || isSaving}
              className="h-12 w-full rounded-xl border border-[#E5E8EB] px-4 text-[15px] text-[#191F28] outline-none transition focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10 disabled:bg-[#F2F4F6]"
              placeholder="01012345678"
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-[#E5484D]">{error}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSaving}
            className="h-12 flex-1 rounded-xl border border-[#E5E8EB] text-sm font-semibold text-[#4E5968] transition hover:bg-[#F8F9FA] disabled:opacity-60"
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isChecking || isSaving}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#0064FF] text-sm font-semibold text-white transition hover:bg-[#0052D4] disabled:bg-[#AAB4C8]"
          >
            {isChecking || isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장하고 계속하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
