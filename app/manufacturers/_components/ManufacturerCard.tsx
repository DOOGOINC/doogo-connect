"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, ShieldCheck, Star } from "lucide-react";

interface Props {
  id: number;
  name: string;
  location: string;
  rating: number;
  description: string;
  tags: string[];
  products: string[];
  image: string;
  logo?: string;
}

export function ManufacturerCard({
  id,
  name,
  location,
  rating,
  description,
  tags = [],
  products = [],
  image,
  logo,
}: Props) {
  const router = useRouter();
  const safeTags = Array.isArray(tags) ? tags : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const visibleProducts = safeProducts.slice(0, 3);
  const hasMore = safeProducts.length > 3;

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-[20px] border border-gray-50 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-xl">
      <div className="relative h-[180px] w-full overflow-hidden">
        <Image
          src={image || "/image/placeholder.png"}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 z-10 h-[60px] bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3.5 left-4 right-4 z-20 flex items-center justify-between">
          <span className="text-[17px] font-extrabold tracking-tight text-white drop-shadow-md">{name}</span>
          <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-[#FFD700] text-[#FFD700]" />
            <span className="text-[11px] font-bold text-white">{rating}</span>
          </div>
        </div>

        {logo ? (
          <div className="absolute right-3.5 top-3.5 z-20 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/95 p-1 shadow-sm">
            <Image src={logo} alt="logo" width={36} height={36} className="h-full w-full object-contain p-0.5" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-1 text-[12px] font-semibold text-[#8b95a1]">
          <MapPin className="h-3 w-3" />
          {location}
        </div>

        <p className="mb-4 line-clamp-2 h-[40px] break-keep text-[14px] font-medium leading-[1.4] text-[#4e5968]">
          {description}
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

        <div className="mb-5 mt-auto">
          <p className="mb-1.5 text-[11px] font-bold text-[#8b95a1]">
            제조 가능 품목 <span className="text-[#0064FF]">{safeProducts.length}종</span>
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {visibleProducts.map((product) => (
              <span
                key={product}
                className="rounded-full bg-[#f2f4f7] px-2.5 py-0.5 text-[11px] font-bold text-[#4e5968]"
              >
                {product}
              </span>
            ))}
            {hasMore ? (
              <span className="ml-0.5 text-[10px] font-bold tracking-tighter text-[#adb5bd]">
                +{safeProducts.length - 3}개
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/estimate?manufacturer=${id}&step=2`)}
          className="group/btn flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#0064FF] py-2 text-[15px] font-bold text-white shadow-sm transition-all hover:bg-[#0052d4] active:scale-[0.98]"
        >
          이 제조사로 견적내기
          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
        </button>
      </div>
    </article>
  );
}
