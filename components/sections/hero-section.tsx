"use client";

import { useState, useEffect } from "react";
import { PartnerModal } from "@/components/PartnerModal";
import { AuthModal } from "@/components/AuthModal";
import { HeroGraphic } from "./HeroGraphic";
import { supabase } from "@/lib/supabase";

const heroVideoSrc = "https://capa.ai/static/landing_video_desktop.mp4";
//player.vimeo.com/video/1182417429?autoplay=1&muted=1&loop=1&background=1&quality=1080p&dnt=1

function useCountUp(endValue: number, duration: number = 2000, start: boolean = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || endValue === 0) return;
    let startTime: number | null = null;
    let animationFrameId: number;
    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPercentage = Math.min(progress / duration, 1);
      setCount(Math.floor(endValue * progressPercentage));
      if (progressPercentage < 1) animationFrameId = requestAnimationFrame(animateCount);
    };
    animationFrameId = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [endValue, duration, start]);
  return count;
}

export function HeroSection() {
  const fullText = "제조를 잇다,\n두고 커넥트";
  const [displayText, setDisplayText] = useState("");
  const [startCount, setStartCount] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleTyping = () => {
      const pauseIndex = "제조를 잇다,".length;
      if (displayText === fullText) {
        setStartCount(true);
        timeout = setTimeout(() => { setDisplayText(""); setStartCount(false); }, 3000);
        return;
      }
      const nextText = fullText.slice(0, displayText.length + 1);
      const isPausePoint = displayText.length === pauseIndex;
      const speed = isPausePoint ? 600 : 150;
      timeout = setTimeout(() => { setDisplayText(nextText); }, speed);
    };
    timeout = setTimeout(handleTyping, displayText === "" ? 500 : 0);
    return () => clearTimeout(timeout);
  }, [displayText]);

  const stats1 = useCountUp(50, 1500, startCount);
  const stats2 = useCountUp(200, 1800, startCount);
  const stats3 = useCountUp(50, 1500, startCount);
  const stats4 = useCountUp(3, 1000, startCount);

  return (
    <section id="hero-section" className="relative w-full h-[100dvh] min-h-[700px] overflow-hidden bg-[#191f28]">
      <video
        className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover"
        autoPlay muted loop playsInline suppressHydrationWarning
      >
        <source src={heroVideoSrc} type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-[10] flex items-center justify-center bg-[#191f28]/40 px-6 ">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-10 lg:flex-row lg:justify-between lg:gap-20">

          {/* --- 왼쪽: 텍스트 및 버튼 영역 --- */}
          <div className="flex flex-col gap-10 text-center lg:items-start lg:text-left lg:max-w-[500px] w-full">
            <div className="flex flex-col gap-4">
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2 bg-black/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-2">
                  <span className="text-sm">🌿</span>
                  <span className="text-white/90 text-[13px] font-bold tracking-tight">
                    해외 건강식품 소량 OEM 플랫폼
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center min-h-[120px] md:min-h-[180px] lg:justify-start">
                <h1 className="text-5xl font-bold tracking-[-0.04em] text-white md:text-7xl leading-[1.2]" style={{ whiteSpace: "pre-wrap" }}>
                  {displayText}
                </h1>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-lg text-white/90 md:text-1xl font-medium break-keep">
                  두고커넥트는 건강식품 OEM의 수요와 공급을 온라인으로 연결합니다.
                </p>
                <p className="text-lg text-white/90 md:text-1xl font-medium break-keep">
                  50개 소량부터, 실시간 견적으로 내 브랜드를 시작하세요.
                </p>
              </div>
            </div>

            <div className="flex flex-row items-center justify-center gap-3 md:gap-4 w-full lg:justify-start">
              <button
                onClick={() => {
                  if (!session) {
                    setIsAuthModalOpen(true);
                  } else {
                    window.location.href = "/estimate";
                  }
                }}
                className="relative flex items-center justify-center gap-[6px] z-20 w-full max-w-[220px] h-[50px] rounded-lg px-[20px] max-mobile:max-w-[150px] max-mobile:h-[52px] max-mobile:text-sm !text-white font-semibold text-base bg-[linear-gradient(90deg,#0064FF_48.96%,#004ECC)] transition-all duration-300 hover:gap-[10px] active:scale-[0.95] cursor-pointer"
              >
                <span className="truncate text-white">지금 바로 견적내기</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="relative flex items-center justify-center gap-[6px] z-20 w-full max-w-[220px] h-[50px] rounded-lg px-[20px] max-mobile:max-w-[150px] max-mobile:h-[52px] max-mobile:text-sm !text-white font-semibold text-base border border-white/40 bg-black/10 backdrop-blur-[6px] transition-all duration-300 hover:bg-white/20 hover:gap-[10px] active:scale-[0.95] cursor-pointer"
              >
                <span className="truncate text-white">제조사 입점 문의</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>


          <HeroGraphic />
        </div>
      </div>


      <PartnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
      />

      <div className="absolute bottom-0 left-0 z-[20] w-full border-t border-white/10 bg-black/20 backdrop-blur-[12px]">
        <div className="mx-auto max-w-[1200px] px-6 py-6 md:py-8 grid grid-cols-2 md:grid-cols-4 gap-y-6 text-center">
          <div className="flex flex-col md:border-r md:border-white/10 last:border-0">
            <span className="text-2xl md:text-3xl font-bold text-white">{stats1}+</span>
            <span className="text-xs md:text-sm text-white/60 font-medium">검증된 제조사</span>
          </div>
          <div className="flex flex-col md:border-r md:border-white/10 last:border-0">
            <span className="text-2xl md:text-3xl font-bold text-white">{stats2}+</span>
            <span className="text-xs md:text-sm text-white/60 font-medium">제조 가능 제품</span>
          </div>
          <div className="flex flex-col md:border-r md:border-white/10 last:border-0">
            <span className="text-2xl md:text-3xl font-bold text-white">{stats3}개~</span>
            <span className="text-xs md:text-sm text-white/60 font-medium">소량 OEM 시작</span>
          </div>
          <div className="flex flex-col last:border-0">
            <span className="text-2xl md:text-3xl font-bold text-white">{stats4}-4주</span>
            <span className="text-xs md:text-sm text-white/60 font-medium">평균 제조 기간</span>
          </div>
        </div>
      </div>
    </section>
  );
}