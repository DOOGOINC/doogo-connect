"use client";

import { TrendingUp, Globe, Award, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// --- Types ---
interface Story {
  image: string;
  tags: string[];
  region: string;
  date: string;
  brandName: string;
  title: string;
  company: string;
  location: string;
  exportTo: string;
  description: string;
  revenue: string;
  initialOrder: string;
  currentOrder: string;
}

interface Review {
  id: number;
  author: string;
  product: string;
  content: string;
}

// --- Data ---
const stats = [
  { icon: TrendingUp, value: 94, suffix: "%", label: "고객 재주문율", decimals: 0 },
  { icon: Globe, value: 12, suffix: "개국", label: "수출 국가", decimals: 0 },
  { icon: Award, value: 200, suffix: "+", label: "성공 브랜드", decimals: 0 },
  { icon: Star, value: 4.9, suffix: "/5", label: "평균 만족도", decimals: 1 },
];

const stories: Story[] = [
  {
    image: "../image/success-stories/밀크씨슬.jpeg",
    tags: ["밀크씨슬", "뉴질랜드 GMP", "소량생산"],
    region: "NZ",
    date: "2026.01.15 런칭",
    brandName: "밀크씨슬슬",
    title: "빌베리 60,000mg 60캡슐",
    company: "DOOGOBIO NZ",
    location: "뉴질랜드",
    exportTo: "해외 직구",
    description: "부업의정석을 통해 시작된 브랜드로 초기 소량 테스트 후 빠르게 확장된 실제 사례입니다. 뉴질랜드 현지 생산 기반으로 안정적인 브랜드 운영 중입니다.",
    revenue: "NZD 45,000/월",
    initialOrder: "200",
    currentOrder: "1,000개/월"
  },
  {
    "image": "../image/success-stories/초록홍합.jpeg",
    "tags": ["초록홍합", "뉴질랜드", "GMP"],
    "region": "NZ",
    "date": "2026.01.15 런칭",
    "brandName": "초록홍합",
    "title": "초록홍합",
    "company": "DOOGOBIO",
    "location": "NZ 뉴질랜드",
    "exportTo": "해외 직구",
    "description": "뉴질랜드 초록홍합으로 시작한 프리미엄 건강 브랜드\n\n청정 뉴질랜드 바다에서 자란 초록홍합을 기반으로 부업의정석 창업자가 직접 소싱하여 시작한 브랜드입니다. 처음은 단 하나의 원료에서 출발했지만, “진짜 좋은 원료는 팔린다”는 확신으로 빠르게 제품화까지 이어진 케이스입니다.",
    "revenue": "₩ 4,000,000/월",
    "initialOrder": "50",
    "currentOrder": "500개/월"
  },
  {
    "image": "../image/success-stories/유산균.png",
    "tags": ["유산균", "뉴질랜드 GMP", "소량생산"],
    "region": "NZ",
    "date": "2026.02.15 런칭",
    "brandName": "유산균",
    "title": "유산균",
    "company": "DOOGOBIO",
    "location": "NZ 뉴질랜드",
    "exportTo": "해외 직구",
    "description": "수많은 유산균 제품 속에서 “진짜 좋은 것만 고르겠다”는 기준으로 시작된 브랜드입니다.\n\n 부업의정석 창업자가 직접 원료와 배합을 검증하며 단순 판매가 아닌 ‘선택’의 기준을 만들었습니다.",
    "revenue": "USD 28,000/월",
    "initialOrder": "100",
    "currentOrder": "800개/월"
  },
  {
    "image": "../image/success-stories/로얄제리.jpg",
    "tags": ["로얄젤리", "뉴질랜드 GMP", "소량생산"],
    "region": "NZ",
    "date": "2026.02.15 런칭",
    "brandName": "로얄젤리",
    "title": "로얄젤리",
    "company": "DOOGOBIO NZ",
    "location": "뉴질랜드",
    "exportTo": "직구 및 수입판매",
    "description": "여왕의 원료, 브랜드가 되다\n\n벌집 속 극소량만 생산되는 로얄제리를 기반으로 부업의정석 창업자가 기획한 프리미엄 브랜드입니다. 쉽게 접근할 수 없는 원료이지만, 소량 테스트를 통해 시장 반응을 검증하고 브랜드로 확장된 실제 사례입니다.",
    "revenue": "USD 21,000/월",
    "initialOrder": "50",
    "currentOrder": "600개/월"
  },
  {
    "image": "../image/success-stories/마누카꿀.webp",
    "tags": ["마누카 꿀", "뉴질랜드 GMP", "소량생산"],
    "region": "NZ",
    "date": "2026.02.15 런칭",
    "brandName": "마누카꿀",
    "title": "마누카꿀",
    "company": "DOOGOBIO NZ",
    "location": "뉴질랜드",
    "exportTo": "직구 및 수입판매",
    "description": "뉴질랜드 마누카꿀로 시작된 글로벌 건강 브랜드\n\n뉴질랜드 청정 자연에서만 생산되는 마누카꿀을 기반으로 부업의정석 창업자가 직접 기획한 프리미엄 브랜드입니다. 초기 소량 테스트로 시작했지만 ‘원료의 힘’ 하나로 빠르게 시장 반응을 만들고 수입 까지 확장된 실제 사례입니다.",
    "revenue": "₩ 3,200,000/월",
    "initialOrder": "100",
    "currentOrder": "400개/월"
  },
  {
    "image": "../image/success-stories/알티지오메가3.jpg",
    "tags": ["알티지오메가3", "뉴질랜드 GMP", "소량생산"],
    "region": "NZ",
    "date": "2026.02.15 런칭",
    "brandName": "알티지오메가3",
    "title": "알티지오메가3",
    "company": "DOOGOBIO NZ",
    "location": "뉴질랜드",
    "exportTo": "직구 및 수입판매",
    "description": "같은 오메가3, 흡수율이 다르다\n\n일반 오메가3가 아닌 흡수율이 높은 rTG 형태를 기반으로 부업의정석 창업자가 기획한 프리미엄 제품입니다. 단순한 가격 경쟁이 아닌, ‘차이를 아는 고객’을 타겟으로 시작된 브랜드입니다.",
    "revenue": "NZD 12,000/월",
    "initialOrder": "50",
    "currentOrder": "300개/월"
  }
];

const reviews: Review[] = [
  {
    id: 1,
    author: "수강생 김*수",
    product: "분말 스틱",
    content: "부업으로 시작하고 싶었는데 제조 공정부터 패키지 디자인까지 두고커넥트에서 한 번에 해결해주셔서 너무 편했습니다. 지금은 월 매출 300만원 이상 꾸준히 나오고 있어요.",
  },
  {
    id: 2,
    author: "수강생 박*아",
    product: "콜라겐 젤리",
    content: "처음 해보는 사업이라 걱정이 많았는데 전문가분들의 꼼꼼한 피드백 덕분에 성공적으로 런칭할 수 있었습니다. 특히 소량 생산이 가능하다는 점이 가장 큰 장점인 것 같아요.",
  },
  {
    id: 3,
    author: "강동현",
    product: "마누카꿀 소프트젤",
    content: "처음엔 OEM이 너무 어렵게만 느껴졌는데 두고커넥트 써보니까 진짜 별거 아니더라고요. 1분 견적 시스템이 진짜 편해요. 월 매출 500만원 목표로 달려가고 있습니다!",
  },
  {
    id: 4,
    author: "김지영",
    product: "콜라겐 젤리 스틱 100개",
    content: "처음 OEM을 시도해봤는데 두고커넥트 덕분에 정말 쉽게 진행했어요. 담당자가 친절하게 도와주셔서 소량 50개로 시작했는데 품질이 너무 좋아요. 쿠팡에서 첫 주문 받았을 때 진짜 눈물 날 뻔...",
  },
  {
    id: 5,
    author: "박서준",
    product: "빌베리 60,000mg 60캡슐",
    content: "강의에서 배운 대로 제품 기획하고 두고커넥트로 제조했어요. 뉴질랜드 제조사에서 품질 인증까지 받았고 납기도 정확했습니다. 스마트스토어 론칭 2달 만에 월 매출 200만원 달성했어요!",
  },
  {
    id: 6,
    author: "이민지",
    product: "프로바이오틱스 분말 스틱",
    content: "해외 수출용 제품을 만들고 싶었는데 패키지 디자인까지 전부 도와주셔서 혼자였으면 절대 못 했을 것 같아요. 지금도 이미 진행 중입니다.",
  }
];

// --- Sub-Components ---
const CountUp = ({ to, decimals = 0 }: { to: number; decimals?: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(decimals));

  useEffect(() => {
    const controls = animate(count, to, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [to, count]);

  return <motion.span>{rounded}</motion.span>;
};

const StoryCard = ({ story }: { story: Story }) => (
  <div className="group overflow-hidden rounded-[14px] border border-gray-200 bg-white  transition-all hover:shadow-sm text-left">
    <div className="relative h-[220px] w-full overflow-hidden">
      <img
        src={story.image}
        alt={story.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />

      <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
        {story.tags.map((tag, j) => (
          <span key={j} className="rounded-full bg-[#2563EB] px-3 py-1 text-[10px] font-bold text-white shadow-sm">
            {tag}
          </span>
        ))}
      </div>

      <div className="absolute top-4 right-4 flex h-8 w-11 items-center justify-center rounded-full bg-white/95 text-[12px] font-bold text-slate-900 shadow-sm backdrop-blur-sm">
        {story.region}
      </div>

      <div className="absolute bottom-4 left-4 text-white">
        <h4 className="text-[14px] font-bold tracking-tight mb-0.5">{story.brandName}</h4>
        <p className="text-[12px] font-bold text-white/80">{story.date}</p>
      </div>
    </div>

    <div className="min-h-[128px] p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[16px] font-bold leading-tight text-slate-900 tracking-tight">
          {story.title}
        </h3>
        <div className="flex text-[#FFB800] mt-1 shrink-0">
          {[...Array(5)].map((_, j) => (
            <Star key={j} className="h-3.5 w-3.5 fill-current" />
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-[12px] text-[#165cf9] flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
          <path d="M2 12h20"></path>
        </svg>
        <span>
          {story.company} · {story.location}
          <span className="mx-1 text-[#165cf9] font-bold">›</span>
          {story.exportTo}
        </span>
      </p>

      <p
        className="mt-2.5 line-clamp-5 whitespace-pre-line text-[12px] font-medium leading-[1.45] text-slate-500"
        title={story.description} // 마우스를 올리면 전체 텍스트가 팝업으로 뜹니다.
      >
        {story.description}
      </p>

      {/* <div className="mt-2.5 space-y-3.5 border-t border-gray-50 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-slate-400">월 수익</span>
          <span className="text-[14px] font-bold text-blue-600 tracking-tight">
            {story.revenue}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-slate-400">주문량</span>
          <div className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
            초기 <span className="text-slate-500 font-bold">{story.initialOrder}개</span>
            <span className="text-blue-600 font-bold">→</span>
            현재 <span className="text-slate-500 font-bold">{story.currentOrder}</span>
          </div>
        </div>
      </div> */}
    </div>
  </div>
);

// --- Main Page ---
export default function SuccessStoriesPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero Section */}
      <section className="relative bg-slate-900 pt-32 pb-32 text-center text-white md:pt-40 md:pb-20">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?auto=format&fit=crop&q=80&w=1920"
            alt="Success Background"
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 opacity-85"
            style={{
              background: 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(26, 58, 108) 50%, rgb(10, 22, 40) 100%)'
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[1100px] px-6 text-left md:text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 backdrop-blur-md mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              🏆 SUCCESS CASES
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl lg:leading-tight mb-6">
            두고커넥트와 함께<br /> 브랜드를 만든 이야기
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-16">
            전 세계 12개국, 200개 이상의 건강식품 브랜드가 두고커넥트에서 시작되었습니다.
          </p>

          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-gray-100 rounded-[18px] border border-gray-100 bg-white py-6 shadow-2xl md:grid-cols-4 overflow-hidden">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center px-4 text-center">
                <stat.icon className={`h-6 w-6 mb-3 ${i === 3 ? "text-blue-600 fill-blue-600" : "text-blue-600"}`} />
                <div className="text-2xl font-bold text-gray-900 md:text-2xl tracking-tight">
                  <CountUp to={stat.value} decimals={stat.decimals} />
                  {stat.suffix}
                </div>
                <div className="mt-1 text-[13px] font-bold text-gray-400 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Success Stories Grid */}
      <section className="relative z-0 bg-white px-6 pt-18 pb-18 md:pt-18">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl tracking-tight">
              성공사례
            </h2>

            <p className="mt-6 text-[17px] text-slate-500">
              두고커넥트와 함께 브랜드를 만든 고객들
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story, i) => (
              <StoryCard key={i} story={story} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Student Review Section */}
      <section className="bg-gray-50 py-16 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <img
            src="https://skyagent-artifacts.skywork.ai/page/skbpy2hzm6/images/buup_logo.png"
            alt="부업의정석 로고"
            className="h-12 mx-auto mb-4 object-contain"
          />
          <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
            수강생 성공 사례
          </span>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">부업의정석 수강생 성공리뷰</h2>
          <p className="text-gray-500">
            부업의정석 강의 수강 후 두고커넥트로 OEM 제조에 성공한 실제 수강생 후기
          </p>
        </div>

        <div className="relative flex overflow-hidden">
          <div className="flex gap-5 animate-marquee-left hover:[animation-play-state:paused] w-max py-4">
            {[...reviews, ...reviews, ...reviews, ...reviews].map((review, index) => (
              <div
                key={`${review.id}-${index}`}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-72 flex-shrink-0 transition-all hover:shadow-md"
              >

                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="lucide lucide-star w-4 h-4 fill-amber-400 text-amber-400"
                    >
                      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                    </svg>
                  ))}
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  &quot;{review.content}&quot;
                </p>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {review.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{review.author}</p>
                    <p className="text-xs text-gray-400">부업의정석 수강생</p>
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">{review.product}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CTA Section */}
      <section className="bg-[#0052ff] py-24 text-center text-white">
        <div className="mx-auto max-w-[1000px] px-6">
          <h2 className="text-3xl font-bold md:text-4xl leading-tight tracking-tight">
            다음 성공사례의 주인공이 되어보세요
          </h2>
          <p className="mt-6 text-[19px] font-bold text-white/80">
            두고커넥트와 함께 나만의 건강식품 브랜드를 시작하세요.
          </p>
          <div className="mt-8">
            <Link
              href="/estimate"
              className="group inline-flex items-center gap-3 rounded-[12px] bg-white px-8 py-3 text-[14px] font-bold text-[#0052ff] shadow-lg transition-all hover:scale-105"
            >
              지금 바로 견적내기
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
