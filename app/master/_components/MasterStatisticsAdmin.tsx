"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function MasterStatisticsAdmin() {
  const [selectedYear, setSelectedYear] = useState("2025년");
  const [currency, setCurrency] = useState<"NZD" | "KRW">("NZD");

  // Mock data for the chart points
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const salesData = [8, 14, 21, 27, 32, 38, 42, 46, 52, 58, 62, 65]; // in k (NZD)
  const membersData = [25, 34, 45, 55, 62, 70, 78, 85, 92, 105, 118, 130];

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-6 py-7 lg:px-8 lg:py-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        {/* Header */}
        <section>
          <div className="flex items-center gap-2">
            <span className="text-[20px] leading-none">📊</span>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1f2937]">통계</h1>
          </div>
          <p className="mt-1 text-[14px] font-medium text-[#6b7280]">두고커넥트 운영 관리 시스템</p>
        </section>

        {/* Filters */}
        <section className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#64748b]">
              <span className="text-[14px]">📅</span> 연도 선택
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-10 w-[120px] appearance-none rounded-[10px] border border-[#e2e8f0] bg-white px-4 pr-10 text-[14px] font-bold text-[#1e293b] shadow-sm outline-none transition focus:border-[#2563eb]"
              >
                <option>2025년</option>
                <option>2024년</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
          <p className="mt-6 text-[12px] font-medium text-[#94a3b8]">1월~12월 선그래프 (플랫폼 성장 추이)</p>
        </section>

        {/* Summary Cards Row 1 */}
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
              <span className="text-[#f97316]">🔥</span> 누적 판매금액(NZD)
            </div>
            <p className="mt-3 text-[24px] font-black text-[#2563eb]">NZD 65,200</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">2025년 최근값</p>
          </article>

          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
              <span className="text-[#16a34a]">💵</span> 누적 판매금액(KRW)
            </div>
            <p className="mt-3 text-[24px] font-black text-[#16a34a]">18,200,000원</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">2025년 최근값</p>
          </article>

          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
                <span className="text-[#9333ea]">👥</span> 총 회원수(의뢰자)
              </div>
              <span className="text-[11px] font-bold text-[#2563eb]">→ 메뉴</span>
            </div>
            <p className="mt-3 text-[24px] font-black text-[#1e293b]">130명</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">2025년 최근값</p>
          </article>
        </section>

        {/* Summary Cards Row 2 */}
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
                <span className="text-[#ef4444]">🏭</span> 등록 제조사
              </div>
              <span className="text-[11px] font-bold text-[#2563eb]">→ 메뉴</span>
            </div>
            <p className="mt-3 text-[24px] font-black text-[#ea580c]">8개</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">2025년 최근값</p>
          </article>

          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
                <span className="text-[#f59e0b]">⚡</span> 포인트 총 발급
              </div>
              <span className="text-[11px] font-bold text-[#2563eb]">→ 메뉴</span>
            </div>
            <p className="mt-3 text-[24px] font-black text-[#ea580c]">58만P</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">2025년 최근값</p>
          </article>

          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
              <span className="text-[#22c55e]">✅</span> 완료된 요청
            </div>
            <p className="mt-3 text-[24px] font-black text-[#16a34a]">22건</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">2025년 최근값</p>
          </article>
        </section>

        {/* Summary Cards Row 3 */}
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
              <span className="text-[#94a3b8]">📋</span> 총 제조 요청
            </div>
            <p className="mt-3 text-[24px] font-black text-[#9333ea]">30건</p>
            <p className="mt-1 text-[12px] font-medium text-[#94a3b8]">2025년 최근값</p>
          </article>
        </section>

        {/* Main Chart Section */}
        <section className="rounded-[24px] border border-[#f1f5f9] bg-white p-8 shadow-sm">
          <div className="mb-12 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-black text-[#1e293b]">
              <span className="text-[#2563eb]">📈</span> 누적 판매금액 + 회원수 추이 — 2025년
            </h2>

            <div className="flex items-center gap-1 rounded-full bg-[#f1f5f9] p-1">
              <button
                onClick={() => setCurrency("NZD")}
                className={`rounded-full px-4 py-1.5 text-[11px] font-black transition ${
                  currency === "NZD" ? "bg-white text-[#1e293b] shadow-sm" : "text-[#94a3b8]"
                }`}
              >
                <span className="mr-1 text-[9px] opacity-60">NZ</span> NZD
              </button>
              <button
                onClick={() => setCurrency("KRW")}
                className={`rounded-full px-4 py-1.5 text-[11px] font-black transition ${
                  currency === "KRW" ? "bg-white text-[#1e293b] shadow-sm" : "text-[#94a3b8]"
                }`}
              >
                <span className="mr-1 text-[9px] opacity-60">KR</span> KRW
              </button>
            </div>
          </div>

          {/* Line Chart Area */}
          <div className="relative h-[480px] w-full px-4">
            {/* Y-Axis Labels */}
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[16px] font-bold text-[#64748b]">
              <span>65k</span>
              <span>49k</span>
              <span>33k</span>
              <span>16k</span>
              <span>0k</span>
            </div>

            {/* Right Y-Axis Labels (Members) */}
            <div className="absolute inset-y-0 right-0 flex flex-col justify-between text-[16px] font-bold text-[#64748b]">
              <span>130명</span>
              <span>98명</span>
              <span>65명</span>
              <span>33명</span>
              <span>0명</span>
            </div>

            {/* Grid Lines */}
            <div className="absolute inset-0 ml-12 mr-16 flex flex-col justify-between py-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[1px] w-full bg-[#f1f5f9]" />
              ))}
            </div>

            {/* Chart SVG */}
            <svg className="absolute inset-0 ml-12 mr-16 h-full w-[calc(100%-112px)] overflow-visible">
              {/* NZD Sales Line (Blue Solid) */}
              <path
                d="M 0,440 L 80,390 L 160,340 L 240,300 L 320,260 L 400,220 L 480,180 L 560,150 L 640,110 L 720,80 L 800,40 L 880,10"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-lg"
              />
              {/* NZD Data Points */}
              {[
                [0, 440], [80, 390], [160, 340], [240, 300], [320, 260], [400, 220],
                [480, 180], [560, 150], [640, 110], [720, 80], [800, 40], [880, 10]
              ].map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="10" fill="#3b82f6" stroke="white" strokeWidth="3" />
                  <circle cx={x} cy={y} r="4" fill="white" />
                </g>
              ))}

              {/* Member Count Line (Purple Dashed) */}
              <path
                d="M 0,380 L 80,340 L 160,310 L 240,280 L 320,250 L 400,220 L 480,190 L 560,165 L 640,145 L 720,120 L 800,90 L 880,50"
                fill="none"
                stroke="#a855f7"
                strokeWidth="4"
                strokeDasharray="12 8"
                strokeLinecap="round"
              />
              {/* Member Data Points */}
              {[
                [0, 380], [80, 340], [160, 310], [240, 280], [320, 250], [400, 220],
                [480, 190], [560, 165], [640, 145], [720, 120], [800, 90], [880, 50]
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="6" fill="white" stroke="#a855f7" strokeWidth="3" />
              ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="absolute -bottom-12 left-12 right-16 flex justify-between text-[16px] font-bold text-[#64748b]">
              {months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="mt-20 flex items-center justify-between border-t border-[#f1f5f9] pt-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-[3px] w-6 bg-[#3b82f6]" />
                <span className="text-[12px] font-bold text-[#64748b]">누적 판매금액(NZD)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-[3px] w-6 border-t-2 border-dashed border-[#a855f7]" />
                <span className="text-[12px] font-bold text-[#64748b]">총 회원수(의뢰자)</span>
              </div>
            </div>
            <p className="text-[11px] font-medium text-[#94a3b8]">데이터 없는 월은 연결선 없음</p>
          </div>
        </section>

        {/* Footer Summary Cards */}
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-7 shadow-sm">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#64748b]">
              <span className="text-[16px]">📊</span> 이번 달 총 매출액 (12월)
            </div>
            <p className="mt-4 text-[28px] font-black text-[#1e293b]">NZD 65,200</p>
            <p className="mt-1 text-[13px] font-medium text-[#94a3b8]">2025년 12월 기준 누적 판매금액</p>
          </article>

          <article className="rounded-[18px] border border-[#f1f5f9] bg-white p-7 shadow-sm">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#64748b]">
              <span className="text-[16px]">💰</span> 이번 달 3% 플랫폼 수익 (12월)
            </div>
            <p className="mt-4 text-[28px] font-black text-[#ea580c]">NZD 1,956</p>
            <p className="mt-1 text-[13px] font-medium text-[#94a3b8]">총 매출 x 3% = 플랫폼 수수료 수익</p>
          </article>
        </section>
      </div>
    </div>
  );
}
