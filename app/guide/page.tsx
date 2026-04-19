"use client";
import { motion, Variants } from "framer-motion";
import {
  BookOpen,
  Calculator,
  Video,
  CheckCircle,
  Truck,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};


const itemVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  },
};

export default function GuidePage() {
  const stats = [
    { label: "성공 브랜드", value: "200+" },
    { label: "수출 국가", value: "12개국" },
    { label: "재주문율", value: "94%" },
    { label: "평균 만족도", value: "4.9★" },
  ];

  const steps = [
    {
      id: "01",
      icon: <BookOpen className="h-6 w-6 text-[#3182f6]" />,
      title: "제품 및 제조사 선택",
      description: "200가지 이상의 건강식품 제품 중 원하는 카테고리를 선택하세요. 뉴질랜드, 한국, 독일 제조사를 비교할 수 있습니다.",
      features: [
        "카테고리별 제품 필터링",
        "제조사 위치 및 인증 확인",
        "최소 주문 수량(MOQ) 확인",
      ],
      color: "bg-[#eaf3ff]",
    },
    {
      id: "02",
      icon: <Calculator className="h-6 w-6 text-[#00a34c]" />,
      title: "실시간 견적 계산",
      description: "수량을 입력하면 즉시 단가가 계산됩니다. 수량에 따른 가격 변동을 한눈에 확인하세요.",
      features: [
        "수량별 단가 자동 계산",
        "제조사별 리드타임 비교",
        "화폐 단위(NZD/KRW/USD) 선택",
      ],
      color: "bg-[#ebf8f1]",
    },
    {
      id: "03",
      icon: <Video className="h-6 w-6 text-[#a855f7]" />,
      title: "커스터마이징",
      description: "브랜드 라벨, 패키지 디자인, 성분 조정까지 맞춤 설정이 가능합니다.",
      features: [
        "브랜드 라벨 디자인 업로드",
        "패키지 재질 및 형태 선택",
        "성분 추가/조정 요청",
      ],
      color: "bg-[#f5f0ff]",
    },
    {
      id: "04",
      icon: <CheckCircle className="h-6 w-6 text-[#f59e0b]" />,
      title: "주문 확정 및 제조",
      description: "견적 승인 후 계약서 서명과 선금 결제로 제조가 시작됩니다. 진행 상황을 마이커넥트에서 확인하세요.",
      features: [
        "전자 계약서 서명",
        "선금 50% 결제",
        "제조 진행 상황 실시간 확인",
      ],
      color: "bg-[#fff8eb]",
    },
    {
      id: "05",
      icon: <Truck className="h-6 w-6 text-[#ef4444]" />,
      title: "품질 검수 및 배송",
      description: "제조 완료 후 품질 검수를 거쳐 배송됩니다. 잔금 결제 후 출고됩니다.",
      features: [
        "공장 품질 검수 리포트 제공",
        "잔금 결제 후 출고",
        "국제 배송 추적 서비스",
      ],
      color: "bg-[#ffeaeb]",
    }
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      {/* Hero Section */}
      <section className="relative h-[560px] overflow-hidden bg-[linear-gradient(135deg,_rgb(10,22,40)_0%,_rgb(26,58,108)_50%,_rgb(37,99,235)_100%)]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80"
            alt="Container Port"
            className="h-full w-full object-cover mix-blend-overlay opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#001a41]/95 via-[#003da5]/80 to-[#0052cc]/60" />
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-[1200px] flex-col items-center justify-center px-6 text-center pt-10">
          <div className="mb-6 inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md border border-white/10">
            <span className="text-[13px] font-bold text-white">커넥트란?</span>
          </div>
          <h1 className="mb-6 text-[40px] font-bold leading-[1.2] text-white md:text-[56px] tracking-tight">
            두고커넥트로 시작하는<br />
            내 브랜드 건강식품
          </h1>
          <p className="mb-14 text-[17px] md:text-[19px] font-medium text-white/80">
            제조사 선택부터 견적, 디자인, 배송까지 — 원스톱으로 완성하세요
          </p>

          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4 max-w-[1000px]">
            {stats.map((stat, i) => (
              <div key={i} className="rounded-[16px] bg-white/8 p-7 backdrop-blur-xl ">
                <p className="text-[30px] font-bold text-white leading-none">{stat.value}</p>
                <p className="mt-3 text-[14px] font-bold text-white/50 tracking-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mx-auto max-w-[1000px] space-y-6">
            {steps.map((step) => (
              <motion.div
                key={step.id}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                // amount: 0.2 -> 카드가 화면의 20% 정도 보였을 때 애니메이션 시작
                // once: true -> 한 번만 실행 (원치 않으면 false로 변경)
                viewport={{ once: true, amount: 0.2 }}
                className="grid grid-cols-[auto_1fr] items-start gap-6 rounded-[14px] border border-[#f2f4f6] bg-white p-6 shadow-sm"
              >
                {/* 왼쪽: 아이콘 영역 */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-[26px] ${step.color}`}>
                    {step.icon}
                  </div>
                  <span className="text-[40px] font-bold tracking-tight text-[#e0e8eb]">
                    {step.id}
                  </span>
                </div>

                {/* 오른쪽: 텍스트 영역 */}
                <div className="flex-1 pt-1 text-left">
                  <h3 className="text-[20px] font-bold tracking-tight text-[#191f28]">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-[16px] leading-relaxed text-[#4e5968]">
                    {step.description}
                  </p>

                  <ul className="mt-4 space-y-4">
                    {step.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-[14px] text-[#02080e]">
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#3182f6]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-[1100px] px-2 pb-10">
        <div className="rounded-[18px] bg-[#0052cc] py-10 px-8 text-center text-white shadow-xl shadow-[#0052cc]/10">
          <h2 className="text-[32px] font-bold">내 브랜드를 만들고 싶으신가요?</h2>
          <p className="mt-4 text-[20px] text-white/70">두고커넥트에서 여러분의 브랜드를 만들어보세요</p>

          <Link
            href="/estimate"
            className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-[14px] bg-white px-12 text-[16px] font-bold text-[#0052cc]"
          >
            3분 견적 시작하기
            <ChevronRight className="h-6 w-6" />
          </Link>
        </div>
      </section>
    </main>
  );
}