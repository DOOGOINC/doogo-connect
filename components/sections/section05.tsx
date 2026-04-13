"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PartnerModal } from "@/components/PartnerModal";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";

export function Section05() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <section id="section05" className="relative w-full overflow-hidden bg-[#0a1628] py-24">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#0A1021]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF]/60 via-[#1E40AF]/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1E40AF/40_0%,_transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center px-6 text-center text-white">

        <div className="inline-flex items-center gap-2 rounded-full bg-[#1E293B]/20 backdrop-blur-md border border-white/10 px-4 py-1.5 mb-8 shadow-lg">
          <span className="text-[13px]">🚀</span>
          <span className="text-[13px] font-bold text-white/90 tracking-tight">
            지금 바로 시작하세요
          </span>
        </div>

        <h2 className="text-[36px] font-bold leading-[1.2] tracking-tight text-white mb-6 break-keep">
          지금 바로 나만의<br />
          건강식품 브랜드를 시작하세요
        </h2>

        <p className="text-[16px] font-medium text-slate-400 leading-relaxed mb-12 break-keep">
          소량 50개부터 프리미엄 건강식품 OEM.<br />
          두고커넥트가 처음부터 끝까지 함께합니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/estimate"
            onClick={(e) => {
              if (!session) {
                e.preventDefault();
                setIsAuthModalOpen(true);
              }
            }}
            className="flex h-[46px] w-[200px] items-center justify-center gap-2 rounded-xl bg-[#0064FF] text-[16px] font-bold text-white transition-all hover:bg-[#0052cc] active:scale-[0.97] shadow-lg shadow-blue-900/20"
          >
            제조 견적 시작하기
            <ChevronRight className="h-5 w-5" />
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-[46px] w-[180px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1E293B]/60 text-[16px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-[0.97]"
          >
            제조사 입점 문의
          </button>
        </div>
      </div>

      {/* 입점 문의 모달 */}
      <PartnerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* 인증 모달 */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode="login" />
    </section>
  );
}
