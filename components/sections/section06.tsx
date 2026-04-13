// src/sections/section06.tsx
"use client";

import Image from "next/image";
import { processCards } from "./section06.data";

export function Section06() {
  return (
    <section id="section06" className="bg-[#F9FAFB] px-6 py-18">
      <div className="mx-auto max-w-7xl">

        {/* --- 상단 헤더 영역 --- */}
        <div className="text-center">
          <h2 className="text-[30px] font-bold leading-tight tracking-tight text-[#191f28]">
            이미 검증된 제조 방식으로 시작하세요
          </h2>
          <p className="mt-3 text-[16px] font-medium leading-relaxed text-[#595e63]">
            처음이어도 괜찮습니다, 이미 만들어진 방식이 있습니다
          </p>
        </div>


        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-10 md:grid-cols-3 lg:grid-cols-5">
          {processCards.map((card) => (
            <article
              key={card.id}
              className="flex flex-col rounded-[24px] bg-white p-6 hover:shadow-[0_6px_10px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${card.bulletColor}`} />
                <h3 className="text-[17px] font-bold tracking-tight text-[#141F28]">
                  {card.title}
                </h3>
              </div>

              <div className="relative mt-5 aspect-[1/1.1] w-full overflow-hidden rounded-[16px]">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <p className="mt-5 text-[14px] font-medium leading-[1.6] text-[#6B7684]">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}