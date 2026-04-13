"use client";

import Image from "next/image";
import { Star, MapPin, ShieldCheck, ChevronRight } from "lucide-react";
import { MANUFACTURERS } from "../../app/estimate/_data/constants";
import Link from "next/link";

export function Section08() {
  return (
    <section id="section08" className="bg-[#f2f4f7] py-20 px-6">
      <div className="mx-auto max-w-6xl">
        {/* --- 상단 헤더 --- */}
        <div className="mb-6 flex items-end justify-between pb-4">
          <div className="space-y-0.5">
            <div className="inline-flex rounded-full bg-[#e1eaf8] px-3 py-1 text-[12px] font-bold tracking-tight text-[#0064FF]">
              파트너
            </div>
            <h2 className="text-[30px] font-bold tracking-tight text-[#191f28]">
              인기 제조사
            </h2>
            <p className="text-[14px] font-medium text-[#6b7684]">
              검증된 GMP 인증 파트너 제조사
            </p>
          </div>
          <Link
            href="/manufacturers"
            className="group/link flex items-center gap-0.5 text-[14px] font-bold text-[#0064FF] hover:underline transition-all"
          >
            전체 보기
            <ChevronRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
          </Link>
        </div>

        {/* --- 제조사 카드 그리드 --- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MANUFACTURERS.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-xl"
            >

              <div className="relative h-[180px] w-full overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />

                <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-black/60 to-transparent z-10" />

                <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between z-20">
                  <span className="text-[17px] font-extrabold text-white tracking-tight drop-shadow-md">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-[#FFD700] text-[#FFD700]" />
                    <span className="text-[11px] font-bold text-white">
                      {item.rating}
                    </span>
                  </div>
                </div>


                <div className="absolute top-3.5 right-3.5 h-11 w-11 overflow-hidden rounded-full bg-white/95 p-1 shadow-sm flex items-center justify-center z-20 border border-white/50">
                  <Image
                    src={item.logo}
                    alt="logo"
                    width={36}
                    height={36}
                    className="object-contain w-full h-full p-0.5"
                  />
                </div>
              </div>

              <div className="p-5">
                <div className="mb-2 flex items-center gap-1 text-[12px] font-semibold text-[#8b95a1]">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </div>


                <p className="mb-4 h-[40px] text-[14px] font-medium leading-[1.4] text-[#4e5968] line-clamp-2 break-keep">
                  {item.description}
                </p>

                <div className="mb-4 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 rounded bg-[#ebf2ff] px-1.5 py-0.5 text-[10px] font-bold text-[#0064FF]"
                    >
                      <ShieldCheck className="h-2.5 w-2.5" />
                      {tag}
                    </div>
                  ))}
                </div>

                <div className="mb-5">
                  <p className="mb-1.5 text-[11px] font-bold text-[#8b95a1]">제조 가능 제품</p>
                  <div className="flex flex-wrap gap-1">
                    {item.products.map((product) => (
                      <span
                        key={product}
                        className="rounded-full bg-[#f2f4f7] px-2.5 py-0.5 text-[11px] font-bold text-[#4e5968]"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>

                <Link href="/estimate" className="w-full">
                  <button className="group/btn w-full rounded-[10px] bg-[#0064FF] py-2 text-[15px] font-bold text-white transition-all hover:bg-[#0052d4] flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]">
                    이 제조사로 견적내기
                    <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}