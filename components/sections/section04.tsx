"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Section04() {
  return (
    <section id="section04" className="bg-[#f9fafb] px-6 py-20">
      <div className="mx-auto max-w-7xl">

        {/* --- 상단 헤더 --- */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex rounded-full bg-[#EBF2FF] px-4 py-1.5 text-[14px] font-bold tracking-tight text-[#0064FF] mb-3">
            공식 파트너
          </div>
          <h2 className="text-[32px] font-bold text-[#191f28] tracking-tight leading-tight">
            두고커넥트 공식 파트너
          </h2>
          <p className="mt-2 text-[14px] text-slate-500 font-medium">
            글로벌 OEM을 위한 최고의 파트너사와 함께합니다
          </p>
        </div>

        {/* --- 파트너 카드 그리드 --- */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* 1. Utransfer 카드 */}
          <div className="flex flex-col justify-center rounded-[14px] border border-slate-200 bg-white p-8 md:p-12 transition-all hover:shadow-md min-h-[220px]">
            <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-4 mb-8">
                <span className="rounded-lg bg-[#EBF2FF] px-3 py-1.5 text-[13px] font-bold text-[#0064FF]">
                  해외 송금
                </span>
                <div className="text-[20px] font-extrabold text-[#191f28]">Utransfer</div>
              </div>

              <div className="space-y-4 max-w-[400px]">
                <h4 className="text-[17px] font-bold text-[#191f28] leading-tight break-keep text-left">
                  제조사가 해외인가요? 걱정마세요.
                </h4>
                <p className="text-[14px] font-medium leading-[1.7] text-slate-500 break-keep text-left">
                  두고커넥트 공식 파트너 24시간/365일 해외송금 업체 유트랜스퍼Biz로 해외 제조사에 SWIFT 송금을 은행 없이 간편하게 이용하세요.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap justify-start gap-2">
                {["은행 방문 없이", "낮은 수수료", "실시간 환율"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-100 bg-blue-50/30 px-4 py-1 text-[12px] font-bold text-[#0064FF]">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  href="https://utransfer.com"
                  target="_blank"
                  className="inline-flex h-[50px] w-full min-w-[220px] items-center justify-center gap-2 rounded-xl bg-[#0064FF] text-[15px] font-bold text-white transition-all hover:bg-[#0052cc] active:scale-[0.98] shadow-sm"
                >
                  유트랜스퍼 가입하기
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* 2. PortOne 카드*/}
          <div className="flex flex-col justify-center rounded-[14px] border border-slate-200 bg-white p-8 md:p-12 transition-all hover:shadow-md min-h-[220px]">
            <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-4 mb-8">
                <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-[13px] font-bold text-orange-500">
                  결제·정산
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-black flex items-center justify-center p-1.5 shrink-0">
                    <span className="text-[10px] font-black text-white">P</span>
                  </div>
                  <div className="text-[20px] font-extrabold text-[#191f28]">PortOne</div>
                </div>
              </div>

              <div className="space-y-4 max-w-[400px]">
                <h4 className="text-[17px] font-bold text-[#191f28] leading-tight break-keep text-left">
                  안전한 결제·정산 지급대행
                </h4>
                <p className="text-[14px] font-medium leading-[1.7] text-slate-500 break-keep text-left">
                  국내 No.1 PG 통합 솔루션. 두고커넥트의 공식 정산 파트너로 의뢰자와 제조사 간 안전하고 투명한 결제를 지원합니다.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap justify-start gap-2">
                {["PG 통합 결제", "에스크로 보안", "정산 자동화"].map((tag) => (
                  <span key={tag} className="rounded-full border border-orange-100 bg-orange-50/30 px-4 py-1 text-[12px] font-bold text-orange-500">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  href="https://portone.io"
                  target="_blank"
                  className="inline-flex h-[50px] w-full min-w-[220px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#FF7000_0%,#FF5000_100%)] text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
                >
                  포트원 알아보기
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
