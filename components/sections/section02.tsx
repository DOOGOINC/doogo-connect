"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { serviceCards } from "./section02.data";
import { PartnerModal } from "@/components/PartnerModal";
import { AuthModal } from "@/components/AuthModal";

export function Section02() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <section id="section02" className="bg-white px-6 py-16 md:py-24">
      <div id="factory-connection" className="mx-auto max-w-5xl text-center">
        <div className="inline-flex rounded-full bg-[#EBF2FF] px-3 py-1 text-[11px] md:text-[12px] font-bold tracking-tight text-[#0064FF]">
          DOOGO CONNECT
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl md:text-[30px] font-bold text-[#191f28] tracking-tighter leading-[1.2]">
          제조 수요와 공급을<br className="sm:hidden" /> 온라인으로 연결합니다
        </h2>
      </div>

      {/* --- 서비스 카드 그리드 --- */}
      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2">
        {serviceCards.map((card, index) => (
          <article key={card.eyebrow} className={`group relative h-[340px] sm:h-[380px] overflow-hidden rounded-[14px] ${card.className} text-white shadow-md`}>
            <div className="relative z-20 flex h-full flex-col justify-end p-6 sm:p-8">
              <div className="max-w-[300px] sm:max-w-none">
                <p className={`text-white/80 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ${card.eyebrowClassName}`}>
                  {card.eyebrow}
                </p>

                <h3 className="mt-2 whitespace-pre-line text-xl sm:text-[22px] md:text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-white">
                  {card.title}
                </h3>

                <p className={`mt-3 text-[13px] sm:text-[14px] font-medium leading-relaxed opacity-80 break-keep ${card.descriptionClassName}`}>
                  {card.description}
                </p>

                <div className="mt-6 sm:mt-8">
                  <Link
                    href={card.href}
                    onClick={(e) => {
                      if (index === 0) {
                        e.preventDefault();
                        setIsAuthModalOpen(true);
                      } else if (card.href === "#open-modal") {
                        e.preventDefault();
                        setIsModalOpen(true);
                      }
                    }}
                    className={`
                group inline-flex h-10 sm:h-11 items-center justify-center gap-[6px] 
                rounded-[10px] px-5 sm:px-6 text-[13px] sm:text-[14px] font-bold 
                transition-all  
                cursor-pointer shadow-sm
                ${card.primaryActionClassName}
              `}
                  >
                    <span>{card.actionPrimary}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform group-hover:translate-x-1"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* 배경 이미지 영역 */}
            <div className="absolute inset-0 z-0">
              <Image
                src={card.image}
                alt={card.eyebrow}
                fill
                sizes={card.imageSizes}
                className={`pointer-events-none object-cover transition-transform duration-1000 group-hover:scale-110 ${card.imageClassName}`}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-blue-900/70 to-blue-950/90 opacity-90 transition-opacity" />
            </div>
          </article>
        ))}
      </div>

      {/* 입점 신청 모달 */}
      <PartnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      {/* 4. 인증 모달 추가 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
      />
    </section>
  );
}
