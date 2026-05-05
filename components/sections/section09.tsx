"use client";

import { Star, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SUCCESS_STORIES } from "./section09.data";

export function Section09() {
  return (
    <section id="section09" className="bg-[#fff] py-26 px-6">
      <div className="mx-auto max-w-6xl">
        {/* --- 상단 헤더 --- */}
        <div className="mb-10 flex items-end justify-between">
          <div className="space-y-2">
            <div className="inline-flex rounded-full bg-[#e6effc] px-3 py-1 text-[12px] font-bold tracking-tight text-[#0064FF]">
              성공사례
            </div>
            <h2 className="text-[30px] font-bold tracking-tight text-[#191f28]">
              성공사례
            </h2>
            <p className="text-[14px] font-medium text-[#6b7684]">
              두고커넥트와 함께 브랜드를 만든 고객들
            </p>
          </div>
          <Link
            href="/success-stories"
            className="flex items-center gap-0.5 text-[15px] font-bold text-[#0064FF] hover:underline transition-all"
          >
            전체 보기
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* --- 성공사례 카드 그리드 --- */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SUCCESS_STORIES.map((story, index) => {
            const avatarColors = ["bg-[#0064FF]", "bg-[#374151]", "bg-[#047857]"];
            const avatarColor = avatarColors[index % avatarColors.length];

            const manufacturerClean = story.manufacturer.split(' · ')[0];
            const regionMap: Record<string, string> = {
              NZ: "뉴질랜드 출시",
              JP: "한국 출시",
              DE: "독일 출시"
            };
            const regionText = regionMap[story.countryCode] || "해외 출시";

            return (
              <article
                key={story.id}
                className="rounded-[14px] border border-slate-200 bg-white p-6  transition-all duration-300 hover:shadow-lg"
              >
                {/* 상단: 아바타 및 브랜드 정보 */}
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] text-[18px] font-bold text-white ${avatarColor}`}>
                    {manufacturerClean.replace(/^\(주\)\s*/, "").charAt(0)}
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-slate-400">
                      {manufacturerClean}
                    </div>
                    <div className="text-[16px] font-bold text-[#191f28]">
                      {story.brandName}
                    </div>
                  </div>
                </div>

                {/* 중간: 태그 및 별점 */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-600">
                    {story.tags[0]} {story.tags[1] ? " " + story.tags[1] : ""}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-600">
                    <span className="text-blue-500">🌏</span> {regionText}
                  </span>
                </div>

                {/* 별점 */}
                <div className="mt-5 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-[#FFD400] text-[#FFD400]"
                    />
                  ))}
                </div>

                {/* 하단: 인용구 설명 */}
                <p className="mt-6 text-[14px] font-medium leading-[1.6] text-slate-600 break-keep">
                  &quot;{story.description}&quot;
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
