"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { MANUFACTURERS as FALLBACK_MANUFACTURERS } from "@/app/estimate/_data/constants";
import { supabase } from "@/lib/supabase";

interface Manufacturer {
  id: number;
  name: string;
  location: string;
  description: string;
  tags: string[];
  image: string;
  logo?: string;
  catalog_currency?: string | null;
}

function getCurrencyLabel(value?: string | null) {
  const code = (value || "USD").toUpperCase();
  return `${code} 결제`;
}

export function ClientManufacturerDirectory() {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchManufacturers = async () => {
      const { data, error } = await supabase.from("manufacturers").select("*").order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        setManufacturers(data as Manufacturer[]);
        return;
      }

      setManufacturers(FALLBACK_MANUFACTURERS as Manufacturer[]);
    };

    void fetchManufacturers();
  }, []);

  const visibleManufacturers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return manufacturers;

    return manufacturers.filter((item) =>
      [item.name, item.location, item.description, ...(item.tags || [])].some((value) => value?.toLowerCase().includes(normalized))
    );
  }, [manufacturers, query]);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-5 py-6 lg:px-6 lg:py-7">
      <div className="mx-auto flex w-full flex-col gap-6">
        <section>
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#1f2937]">제조사 목록</h1>
          <p className="mt-3 text-[15px] font-medium text-[#6b7280]">검증된 글로벌 파트너 제조사를 탐색하세요.</p>
        </section>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a94a6]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제조사 이름, 국가, 인증으로 검색..."
            className="h-12 w-full rounded-[18px] border border-[#e5e7eb] bg-white pl-12 pr-4 text-[15px] font-medium text-[#1f2937] outline-none transition placeholder:text-[#9ca3af] focus:border-[#c6d8ff] focus:ring-4 focus:ring-[#eef4ff]"
          />
        </div>

        <section className="space-y-5">
          {visibleManufacturers.length ? (
            visibleManufacturers.map((item, index) => {
              const fallback = (FALLBACK_MANUFACTURERS as Manufacturer[]).find((manufacturer) => manufacturer.id === item.id);
              const logoSrc = item.logo || fallback?.logo || item.image || fallback?.image || "/image/logo-header.png";
              const currencyLabel = getCurrencyLabel(item.catalog_currency || fallback?.catalog_currency || (index === 0 ? "NZD" : index === 1 ? "KRW" : "USD"));

              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-5 rounded-[24px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white">
                      <Image src={logoSrc} alt={`${item.name} 로고`} fill sizes="60px" className="object-contain p-2" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[20px] font-bold text-[#111827]">{item.name}</h2>
                      <p className="mt-1 text-[14px] font-semibold text-[#8a94a6]">{item.location}</p>
                      <p className="mt-3 break-keep text-[15px] font-medium leading-7 text-[#5f6b7f]">{item.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(item.tags || []).map((tag) => (
                          <span key={tag} className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[12px] font-medium text-[#8a94a6]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-4 self-end lg:self-start">
                    <span className="rounded-full bg-[#eaf1ff] px-3 py-1.5 text-[13px] font-bold text-[#2f6bff]">{currencyLabel}</span>
                    <button
                      type="button"
                      onClick={() => router.push(`/estimate?manufacturer=${item.id}&step=2`)}
                      className="rounded-full bg-[#2f6bff] px-5 py-2 text-[14px] font-bold text-white transition hover:bg-[#1f5af0]"
                    >
                      견적의뢰
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#d7dde7] bg-white px-6 py-16 text-center text-[15px] font-medium text-[#8a94a6]">
              검색 결과가 없습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
