"use client";

import { Bolt, TrendingDown, ShieldCheck, Globe } from "lucide-react";

const features = [
  {
    icon: <Bolt className="w-6 h-6 text-[#0064FF]" />,
    title: "실시간 견적",
    description: "모든 옵션 선택 시 즉시 가격 계산. 투명한 비용 구조.",
    iconBg: "bg-[#EBF2FF]",
  },
  {
    icon: <TrendingDown className="w-6 h-6 text-[#0064FF]" />,
    title: "소량 제조 가능",
    description: "최소 50개부터 OEM 제조 가능. 초기 브랜드 론칭 최적화.",
    iconBg: "bg-[#EBF2FF]",
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-[#0064FF]" />,
    title: "GMP 인증 제조사",
    description: "FDA, GMP, KFDA 인증 검증된 제조사만 입점.",
    iconBg: "bg-[#EBF2FF]",
  },
  {
    icon: <Globe className="w-6 h-6 text-[#0064FF]" />,
    title: "해외 수출 특화",
    description: "미국, 유럽, 동남아 등 글로벌 시장 진출 지원.",
    iconBg: "bg-[#EBF2FF]",
  },
];

export function Section07() {
  return (
    <section className="bg-white py-16 px-6 mx-auto max-w-6xl">
      <div>
        {/* --- 상단 헤더 --- */}
        <div className="text-center mb-16">
          <h2 className="text-[30px] font-bold text-[#191f28] tracking-tight">
            왜 두고커넥트인가요?
          </h2>
          <p className="mt-1 text-[16px] font-medium leading-relaxed text-[#595e63]">
            해외 건강식품 OEM의 모든 과정을 더 쉽고 투명하게
          </p>
        </div>

        {/* --- 카드 그리드 --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group border border-[#e5e8eb] rounded-[14px] p-8 bg-white transition-all duration-300  hover:shadow-[0_10px_10px_rgba(0,0,0,0.06)] hover:border-[#d1d6db]"
            >
              {/* 아이콘 영역 */}
              <div
                className={`w-12 h-12 rounded-[14px] flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${feature.iconBg}`}
              >
                {feature.icon}
              </div>

              {/* 텍스트 영역 */}
              <h3 className="text-[20px] font-bold text-[#191f28] mb-3">
                {feature.title}
              </h3>
              <p className="text-[15px] leading-[1.6] text-[#4e5968] font-medium break-keep">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}