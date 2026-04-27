"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";
import { getPortalHomeByRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";

type PartnerLoginTab = "admin" | "partner";

const TAB_ROLE_MAP: Record<PartnerLoginTab, AppRole> = {
  admin: "master",
  partner: "partner",
};

function normalizeTab(value: string | null): PartnerLoginTab {
  return value === "partner" ? "partner" : "admin";
}

async function getProfileRole(userId: string) {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.role || "member") as AppRole;
}

async function getPartnerStatus(userId: string) {
  const { data, error } = await supabase
    .from("partner_profiles")
    .select("status, deleted_at")
    .eq("profile_id", userId)
    .maybeSingle<{ status: string | null; deleted_at: string | null }>();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.deleted_at) {
    return "inactive";
  }

  return data?.status === "inactive" ? "inactive" : "active";
}

function PartnerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<PartnerLoginTab>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const role = await getProfileRole(session.user.id);
        if (role === "partner") {
          const partnerStatus = await getPartnerStatus(session.user.id);
          if (partnerStatus !== "active") {
            await supabase.auth.signOut();
            setIsCheckingSession(false);
            return;
          }
        }

        router.replace(getPortalHomeByRole(role));
      } catch (sessionError) {
        console.error("Partner portal session check failed:", sessionError);
        setIsCheckingSession(false);
      }
    };

    void syncSession();
  }, [router]);

  const handleTabChange = (tab: PartnerLoginTab) => {
    setActiveTab(tab);
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/partner?${params.toString()}`);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인 세션을 확인하지 못했습니다.");
      }

      const role = await getProfileRole(user.id);
      if (role !== TAB_ROLE_MAP[activeTab]) {
        await supabase.auth.signOut();
        throw new Error(activeTab === "admin" ? "관리자 계정만 로그인할 수 있습니다." : "파트너 계정만 로그인할 수 있습니다.");
      }

      if (role === "partner") {
        const partnerStatus = await getPartnerStatus(user.id);
        if (partnerStatus !== "active") {
          await supabase.auth.signOut();
          throw new Error("비활성 처리된 파트너 계정입니다.");
        }
      }

      router.replace(getPortalHomeByRole(role));
    } catch (submitError) {
      const message =
        submitError instanceof Error && submitError.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : submitError instanceof Error
            ? submitError.message
            : "로그인 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbff]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7fbff] p-4 font-sans">
      <div className="mb-6 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Image src="/image/doogo_logo_full.png" alt="DOOGO Connect 로고" width={240} height={60} className="object-contain" priority />
        </div>
        <h1 className="mb-1 text-2xl font-bold text-[#1e293b]">파트너센터</h1>
        <p className="text-[13px] text-gray-500">파트너 전용 관리자 로그인</p>
      </div>

      <div className="mb-5 flex w-full max-w-[500px] items-start gap-2.5 rounded-lg border border-[#ffec99] bg-[#fff9db] p-3.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#bb4d00]" />
        <p className="text-[13px] leading-relaxed text-[#bb4d00]">
          관리자와 파트너 계정은 이 페이지에서만 로그인할 수 있습니다. 의뢰자와 제조사는 메인 사이트 로그인만 사용할 수 있습니다.
        </p>
      </div>

      <div className="w-full max-w-[500px] overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_rgb(0,0,0,0.04)]">
        <div className="flex border-b border-gray-50">
          <button
            onClick={() => handleTabChange("admin")}
            className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] font-semibold transition-all ${
              activeTab === "admin" ? "bg-[#2563eb] text-white" : "bg-white text-[#1e293b] hover:bg-gray-50"
            }`}
          >
            <span className="text-base">🛡</span> 관리자
          </button>
          <button
            onClick={() => handleTabChange("partner")}
            className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] font-semibold transition-all ${
              activeTab === "partner" ? "bg-[#2563eb] text-white" : "bg-white text-[#1e293b] hover:bg-gray-50"
            }`}
          >
            <span className="text-base">🤝</span> 파트너
          </button>
        </div>

        <div className="p-7">
          <div className="mb-7 text-center">
            <p className="text-[13px] text-[#1e293b]">
              {activeTab === "admin" ? "두고커넥트 플랫폼 관리자 로그인" : "영업 파트너 / 어필리에이트 로그인"}
            </p>
          </div>

          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-1.5">
              <label className="ml-1 block text-[13px] font-bold text-gray-700">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={activeTab === "admin" ? "admin@doogobiz.com" : "partner@example.com"}
                autoComplete="email"
                className="w-full rounded-xl border border-gray-100 bg-[#f8fafc] px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[13px] font-bold text-gray-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력해 주세요."
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-100 bg-[#f8fafc] px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            {error ? <p className="text-[13px] font-medium text-[#dc2626]">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#2563eb] py-3.5 text-[15px] font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> 로그인 중...
                </span>
              ) : (
                "로그인"
              )}
            </button>
          </form>

          <div className="mt-7 text-center">
            <p className="text-[11px] text-gray-400">
              계정 관리 문의:{" "}
              <a href="mailto:doogobiz@gmail.com" className="text-blue-500 hover:underline">
                doogobiz@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center">
        <p className="text-[11px] tracking-tight text-gray-400">© 2026 DOOGO Connect. All rights reserved.</p>
      </footer>
    </div>
  );
}

function PartnerLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7fbff]">
      <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
    </div>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={<PartnerLoginFallback />}>
      <PartnerLoginContent />
    </Suspense>
  );
}
