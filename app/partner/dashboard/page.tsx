"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, LogOut, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/partner?tab=partner");
  };

  return (
    <main className="min-h-screen bg-[#f4f8ff] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between rounded-[28px] bg-[#0f172a] px-8 py-7 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Partner Portal</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">파트너 전용 대시보드</h1>
            <p className="mt-2 text-sm text-white/70">어필리에이트 계정은 이 포털에서만 접근할 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-[24px] border border-[#dbe4f0] bg-white p-7 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e0ecff] text-[#2563eb]">
              <Handshake className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-[#0f172a]">파트너 전용 영역 준비 완료</h2>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              현재는 로그인 및 권한 분리까지 적용된 상태입니다. 이후 리퍼럴 실적, 정산, 초대 링크 같은 파트너 기능을 이 영역에 확장하면 됩니다.
            </p>
          </article>

          <article className="rounded-[24px] border border-[#dbe4f0] bg-white p-7 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8fff2] text-[#15803d]">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-[#0f172a]">운영 기준</h2>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              `partner` 역할 계정만 이 페이지에 접근할 수 있고, 일반 사이트 로그인에서는 자동으로 차단됩니다.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
