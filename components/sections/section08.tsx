"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin, ShieldCheck, Star } from "lucide-react";
import { MANUFACTURERS as FALLBACK_MANUFACTURERS } from "@/app/estimate/_data/constants";
import { supabase } from "@/lib/supabase";

type Manufacturer = {
  id: number;
  name: string;
  location: string;
  rating: number;
  description: string;
  tags: string[];
  products: string[];
  image: string;
  logo?: string | null;
};

export function Section08() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(FALLBACK_MANUFACTURERS as Manufacturer[]);

  useEffect(() => {
    const fetchManufacturers = async () => {
      const { data, error } = await supabase
        .from("manufacturers")
        .select("id, name, location, rating, description, tags, products, image, logo")
        .order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        setManufacturers(data as Manufacturer[]);
        return;
      }

      setManufacturers(FALLBACK_MANUFACTURERS as Manufacturer[]);
    };

    void fetchManufacturers();
  }, []);

  return (
    <section id="section08" className="bg-[#f2f4f7] px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#e5e8eb] pb-6 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <div className="inline-flex rounded-full bg-[#e1eaf8] px-3 py-1 text-[11px] font-bold tracking-tight text-[#0064FF] md:text-[12px]">
              파트너
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#191f28] sm:text-3xl md:text-[30px]">인기 제조사</h2>
            <p className="text-sm font-medium text-[#6b7684] md:text-[14px]">검증된 GMP 인증 파트너 제조사</p>
          </div>
          <Link
            href="/manufacturers"
            className="group/link flex items-center gap-0.5 text-sm font-bold text-[#0064FF] transition-all hover:underline md:text-[14px]"
          >
            전체 보기
            <ChevronRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {manufacturers.map((item) => {
            const safeTags = Array.isArray(item.tags) ? item.tags : [];
            const safeProducts = Array.isArray(item.products) ? item.products : [];

            return (
              <article
                key={item.id}
                className="group overflow-hidden rounded-[16px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-xl md:rounded-[20px]"
              >
                <div className="relative h-[160px] w-full overflow-hidden md:h-[180px]">
                  <Image
                    src={item.image || "/image/placeholder.png"}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />

                  <div className="absolute inset-x-0 bottom-0 z-10 h-[60px] bg-gradient-to-t from-black/60 to-transparent" />

                  <div className="absolute bottom-3.5 left-4 right-4 z-20 flex items-center justify-between">
                    <span className="text-base font-extrabold tracking-tight text-white drop-shadow-md md:text-[17px]">{item.name}</span>
                    <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-sm">
                      <Star className="h-3 w-3 fill-[#FFD700] text-[#FFD700]" />
                      <span className="text-[11px] font-bold text-white">{item.rating}</span>
                    </div>
                  </div>

                  {item.logo ? (
                    <div className="absolute right-3.5 top-3.5 z-20 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/95 p-1 shadow-sm md:h-11 md:w-11">
                      <Image src={item.logo} alt="logo" width={36} height={36} className="h-full w-full object-contain p-0.5" />
                    </div>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-[#8b95a1] md:text-[12px]">
                    <MapPin className="h-3 w-3" />
                    {item.location}
                  </div>

                  <p className="mb-4 line-clamp-2 h-[40px] break-keep text-[13px] font-medium leading-[1.4] text-[#4e5968] md:text-[14px]">
                    {item.description}
                  </p>

                  <div className="mb-4 flex flex-wrap gap-1">
                    {safeTags.map((tag) => (
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
                    <p className="mb-1.5 text-[10px] font-bold text-[#8b95a1] md:text-[11px]">제조 가능 제품</p>
                    <div className="flex flex-wrap gap-1">
                      {safeProducts.map((product) => (
                        <span
                          key={product}
                          className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-bold text-[#4e5968] md:px-2.5 md:text-[11px]"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link href={`/estimate?manufacturer=${item.id}&step=2`} className="w-full">
                    <button className="group/btn flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#0064FF] py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0052d4] active:scale-[0.98] md:py-2.5 md:text-[15px]">
                      이 제조사로 견적내기
                      <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
