"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function HeroGraphic() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="hidden lg:block relative w-full"
      style={{ height: "500px" }} // 기존 높이 유지
    >
      {/* 1. 좌측 하단 카드: 제조사 선택 (w-64 유지) */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-0 bottom-16 z-10 w-64 bg-white rounded-2xl shadow-2xl p-4 border border-gray-50/50"
      >
        <p className="text-[10px] font-bold text-[#AFAFAF] uppercase tracking-wider mb-0.5">
          Custom OEM 견적
        </p>
        <p className="text-sm font-bold text-[#191F28] mb-3">제조사 선택</p>

        <div className="space-y-2">
          {/* 활성화된 제조사: 이미지 색상 반영 */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#EBF2FF] border border-[#0064FF]/20">
            <div className="w-8 h-8 bg-[#0064FF] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-black">D</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[12px] text-[#191F28]">DOOGOBIO NZ</p>
              <p className="text-[10px] text-[#808080]">뉴질랜드 오클랜드</p>
            </div>
            <Check className="w-3.5 h-3.5 text-[#0064FF] flex-shrink-0" strokeWidth={3} />
          </div>

          {/* 비활성화된 제조사 */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#F2F2F2]">
            <div className="w-8 h-8 bg-[#F2F2F2] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-[#AFAFAF] text-xs font-black">한</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[12px] text-[#AFAFAF]">(주) 한미양행</p>
              <p className="text-[10px] text-[#D2D2D2]">한국 경기도</p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#F2F2F2]">
          <p className="text-[10px] text-[#808080] mb-1">검증된 제조사 50+</p>
          <div className="flex gap-1 mt-1 mb-3">
            {["GMP", "FDA", "KFDA", "ISO"].map((tag) => (
              <span key={tag} className="text-[8px] bg-[#EBF2FF] text-[#0064FF] px-1.5 py-0.5 rounded font-bold">
                {tag}
              </span>
            ))}
          </div>
          <button className="w-full bg-[#0064FF] text-white text-xs py-2 rounded-xl font-bold hover:bg-[#0054FF] transition-colors shadow-md">
            다음 단계 →
          </button>
          <p className="text-[9px] text-[#0064FF] mt-1.5 text-center font-bold">
            ● 뉴질랜드 · 한국 · 독일
          </p>
        </div>
      </motion.div>

      {/* 2. 우측 상단 카드: 실시간 견적 (w-60 유지) */}
      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute right-0 top-0 z-20 w-60 bg-white rounded-2xl shadow-2xl p-4 border border-gray-50/50"
      >
        <p className="text-[10px] font-bold text-[#AFAFAF] uppercase tracking-wider mb-1">
          실시간 견적
        </p>
        <p className="text-3xl font-black text-[#0064FF] mb-0.5">NZD 28.00</p>
        <p className="text-xs text-[#808080] mb-3">빌베리 60,000mg / 50개</p>

        <div className="bg-[#EDFAF3] border border-[#E1F2EA] rounded-xl px-4 py-2 mb-3 text-center">
          <span className="text-[#2ECC71] font-bold text-sm">견적 완료 ✓</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-[#808080]">
          <span>수량 50개</span>
          <span>단가 NZD 0.56</span>
          <span>용기: 캡슐병</span>
          <span>디자인: 기본</span>
        </div>
      </motion.div>

      {/* 3. 우측 하단 카드: 제조 진행 상황 (w-48 유지) */}
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute right-8 bottom-0 z-20 w-48 bg-white rounded-2xl shadow-2xl p-4 border border-gray-50/50"
      >
        <p className="text-[10px] font-bold text-[#AFAFAF] uppercase tracking-wider mb-3">
          제조 진행 상황
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#0064FF]"></div>
            <span className="text-sm font-bold text-[#191F28]">결제 완료</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#0064FF]"></div>
            <span className="text-sm font-bold text-[#191F28]">제조 시작</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#D2D2D2]"></div>
            <span className="text-sm font-bold text-[#D2D2D2]">제조 완료</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}