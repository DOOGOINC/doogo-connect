"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";

export function Section03() {
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

  const steps = ["제품 선택", "견적 확인", "해외 송금", "디자인 컨펌", "제조 & 배송"];

  return (
    <section id="section03" className="bg-[#0a1628] px-6 py-16  overflow-hidden">
      <div className="mx-auto max-w-7xl flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

        {/* --- 왼쪽: 텍스트 콘텐츠 --- */}
        <div className="flex-1 text-left">
          <h2 className="text-[32px] font-bold text-white tracking-tight leading-[1.2]">
            복잡한 제조 과정,<br />
            두고커넥트에서는<br />
            간단합니다
          </h2>
          <p className="mt-6 text-[16px] text-slate-400 font-medium leading-relaxed break-keep">
            견적부터 송금, 디자인, 제조, 배송까지<br />
            모든 과정을 한 번에 진행하세요
          </p>

          {/* 1~5 단계 리스트 */}
          <div className="mt-10 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0064FF] text-[12px] font-bold text-white">
                  {i + 1}
                </div>
                <span className="text-[16px] font-bold text-white/90">{step}</span>
              </div>
            ))}
          </div>

          {/* 버튼 */}
          <div className="mt-12">
            <Link
              href="/estimate"
              onClick={(e) => {
                if (!session) {
                  e.preventDefault();
                  setIsAuthModalOpen(true);
                }
              }}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#0064FF] px-8 text-[16px] font-bold text-white transition-all hover:bg-[#0052cc] active:scale-[0.98]"
            >
              1분 견적 진행하기
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* 하단 베네핏 리스트 */}
          <div className="mt-10 space-y-2.5">
            {["평균 견적 확인 1분", "최소 수량 제조 가능", "제조 진행 상태 실시간 확인"].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0064FF]" />
                <span className="text-[14px] font-medium text-slate-400">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- 오른쪽: 진행 중인 주문 그래픽 (Mock UI) --- */}
        <div className="flex-1 w-full max-w-[580px]">
          <div className="relative rounded-[32px] border border-white/5 bg-[#111d35] p-6 md:p-10 backdrop-blur-sm shadow-2xl">

            <div className="flex items-center justify-between mb-8">
              <h4 className="text-[18px] font-bold text-white">진행 중인 주문</h4>
              <span className="rounded-full bg-[#0064FF]/10 px-3 py-1 text-[12px] font-bold text-[#0064FF]">2개 진행 중</span>
            </div>

            <div className="space-y-4">
              {/* 주문 카드 1 */}
              <div className="rounded-2xl border border-white/5 bg-[#1a2d4a]/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0064FF] text-white font-bold">D</div>
                    <div>
                      <div className="text-[14px] font-bold text-white">DOOGOBIO NZ</div>
                      <div className="text-[12px] text-slate-500">빌베리 캡슐 60,000mg</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#0064FF]/10 px-3 py-1 text-[11px] font-bold text-[#0064FF]">제조 중</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-500">진행률</span>
                    <span className="text-white">60%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800">
                    <div className="h-full w-[60%] rounded-full bg-[#0064FF]" />
                  </div>
                  <div className="flex gap-4 pt-2 text-[11px] font-medium text-slate-400">
                    <span>수량: 50개</span>
                    <span>NZD 28.00</span>
                    <span className="text-[#0064FF]">D+18일</span>
                  </div>
                </div>
              </div>

              {/* 주문 카드 2 */}
              <div className="rounded-2xl border border-white/5 bg-[#1a2d4a]/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white font-bold text-[14px]">한</div>
                    <div>
                      <div className="text-[14px] font-bold text-white">(주) 한미양행</div>
                      <div className="text-[12px] text-slate-500">콜라겐 젤리 스틱</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#10B981]/10 px-3 py-1 text-[11px] font-bold text-[#10B981]">결제 완료</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-500">진행률</span>
                    <span className="text-white">20%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800">
                    <div className="h-full w-[20%] rounded-full bg-[#10B981]" />
                  </div>
                  <div className="flex gap-4 pt-2 text-[11px] font-medium text-slate-400">
                    <span>수량: 100개</span>
                    <span>₩750,000</span>
                    <span className="text-[#10B981]">D+25일</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 프로세스 아이콘 */}
            <div className="mt-10 flex items-center justify-between px-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex flex-col items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${num <= 3 ? "bg-[#0064FF] text-white" : "bg-slate-800 text-slate-500"
                    }`}>
                    {num <= 3 ? <Check className="h-4 w-4" /> : num}
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${num <= 3 ? "text-[#0064FF]" : "text-slate-600"}`}>
                    {steps[num - 1].split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
      />
    </section>
  );
}
