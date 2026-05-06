"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { PartnerModal } from "@/components/PartnerModal";
import { supabase } from "@/lib/supabase";
import { ManufacturerCard } from "./_components/ManufacturerCard";

interface Manufacturer {
  id: number;
  name: string;
  location: string;
  rating: number;
  description: string;
  tags: string[];
  products: string[];
  image: string;
  logo: string;
}

const ALL_FILTER = "전체";
const PRIORITY_LOCATIONS = ["뉴질랜드", "한국", "독일", "미국"];
const PRIORITY_TAGS = ["GMP", "FDA", "KFDA", "CE", "ISO", "HACCP"];
const VERIFICATION_ITEMS = [
  { icon: "🏆", title: "GMP 인증", description: "우수 제조·관리 기준 충족" },
  { icon: "🌍", title: "글로벌 인증", description: "FDA, CE, KFDA 인증 보유" },
  { icon: "🧪", title: "성분 검증", description: "원료 출처 및 성분 투명 공개" },
  { icon: "📋", title: "납기 준수", description: "일정 준수율 95% 이상" },
];

function normalizeList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState(ALL_FILTER);
  const [tagFilter, setTagFilter] = useState(ALL_FILTER);
  const [headerOffset, setHeaderOffset] = useState(64);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);

  useEffect(() => {
    const fetchManufacturers = async () => {
      const { data } = await supabase
        .from("manufacturers")
        .select("id, name, location, rating, description, tags, products, image, logo")
        .order("id", { ascending: true });

      setManufacturers((data as Manufacturer[] | null) ?? []);
      setLoading(false);
    };

    void fetchManufacturers();
  }, []);

  useEffect(() => {
    const header = document.querySelector("header.fixed.top-0") as HTMLElement | null;
    if (!header) return;

    const updateHeaderOffset = () => {
      setHeaderOffset(Math.ceil(header.getBoundingClientRect().height || header.offsetHeight || 64));
    };

    updateHeaderOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateHeaderOffset();
    });

    resizeObserver.observe(header);
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, []);

  const locationOptions = useMemo(() => {
    const uniqueLocations = Array.from(new Set(manufacturers.map((item) => item.location).filter(Boolean)));
    const ordered = [
      ...PRIORITY_LOCATIONS.filter((item) => uniqueLocations.includes(item)),
      ...uniqueLocations.filter((item) => !PRIORITY_LOCATIONS.includes(item)),
    ];

    return [ALL_FILTER, ...ordered];
  }, [manufacturers]);

  const tagOptions = useMemo(() => {
    const uniqueTags = Array.from(new Set(manufacturers.flatMap((item) => normalizeList(item.tags))));
    const ordered = [
      ...PRIORITY_TAGS.filter((item) => uniqueTags.includes(item)),
      ...uniqueTags.filter((item) => !PRIORITY_TAGS.includes(item)),
    ];

    return [ALL_FILTER, ...ordered];
  }, [manufacturers]);

  const filteredManufacturers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return manufacturers.filter((item) => {
      const safeProducts = normalizeList(item.products);
      const safeTags = normalizeList(item.tags);

      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        safeProducts.some((product) => product.toLowerCase().includes(query));

      const matchesLocation = locationFilter === ALL_FILTER || item.location === locationFilter;
      const matchesTag = tagFilter === ALL_FILTER || safeTags.includes(tagFilter);

      return matchesSearch && matchesLocation && matchesTag;
    });
  }, [locationFilter, manufacturers, searchQuery, tagFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <Loader2 className="h-10 w-10 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f9fafb] pb-16 md:pb-24" style={{ paddingTop: `${headerOffset}px` }}>
        <div className="bg-[#fff]">
          <div className="mx-auto max-w-[1200px] px-6 pt-10">
            <header className="pb-10">
              <div className="inline-flex rounded-full bg-[#E8F1FF] px-3 py-1 text-[12px] font-bold tracking-tight text-[#2B73F6]">
                글로벌 파트너
              </div>
              <h1 className="mt-4 text-[26px] font-bold tracking-[-0.03em] text-[#111827] sm:text-[38px]">검증된 제조사</h1>
              <p className="mt-2 text-[15px] font-medium tracking-[-0.02em] text-[#5B6472] sm:text-[17px]">
                뉴질랜드, 한국, 독일 등 글로벌 인증 제조사와 직접 연결하세요.
              </p>
            </header>
          </div>
        </div>

        <section
          className="sticky z-40 border-y border-[#E5E8EB] bg-[#fff]"
          style={{ top: `${headerOffset}px` }}
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-6 py-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative w-full max-w-[360px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="제조사 / 제품 검색..."
                  className="h-10 w-full rounded-[12px] border border-[#D8DEE8] bg-white pl-11 pr-4 text-[13px] font-medium text-[#111827] outline-none transition focus:border-[#2B73F6] focus:ring-4 focus:ring-[#2B73F6]/10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {locationOptions.map((option) => {
                  const active = locationFilter === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLocationFilter(option)}
                      className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${
                        active ? "bg-[#1E63E9] text-white" : "bg-[#F1F4F8] text-[#495465] hover:bg-[#E7ECF3]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tagOptions.map((option) => {
                const active = tagFilter === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTagFilter(option)}
                    className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${
                      active ? "bg-[#1E63E9] text-white" : "bg-[#F1F4F8] text-[#495465] hover:bg-[#E7ECF3]"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1200px] px-6">
          <section className="pt-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredManufacturers.length > 0 ? (
                filteredManufacturers.map((item) => <ManufacturerCard key={item.id} {...item} />)
              ) : (
                <div className="col-span-full py-16 text-center text-[14px] font-medium text-slate-400">
                  조건에 맞는 제조사가 없습니다.
                </div>
              )}
            </div>
          </section>

          <section className="mt-14">
            <div className="rounded-[20px] bg-[#0E5BE1] px-6 py-10 text-center text-white sm:px-10 sm:py-12">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] sm:text-[30px]">원하시는 제조사가 없으신가요?</h2>
              <p className="mx-auto mt-3 max-w-3xl text-[13px] font-medium text-white/85 sm:text-[15px]">
                두고커넥트 파트너 제조사 네트워크를 통해 최적의 제조사를 매칭해 드립니다.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/support"
                  className="inline-flex min-w-[156px] items-center justify-center rounded-[14px] bg-white px-6 py-3 text-[14px] font-bold text-[#0E5BE1] transition hover:bg-[#F2F6FF]"
                >
                  전문가 상담 신청
                </Link>
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(true)}
                  className="inline-flex min-w-[156px] items-center justify-center rounded-[14px] border border-white/25 bg-white/10 px-6 py-3 text-[14px] font-bold text-white transition hover:bg-white/15"
                >
                  제조사 입점 문의
                </button>
              </div>
            </div>
          </section>

          <section className="py-14 sm:py-16">
            <div className="text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#111827] sm:text-[30px]">두고커넥트 제조사 검증 기준</h2>
              <p className="mt-3 text-[13px] font-medium text-[#5B6472] sm:text-[15px]">
                모든 파트너 제조사는 엄격한 기준을 통과한 검증된 제조사입니다
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {VERIFICATION_ITEMS.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[20px] border border-[#E5E8EB] bg-white px-6 py-8 text-center shadow-[0_4px_20px_rgba(15,23,42,0.04)]"
                >
                  <div className="text-[36px] leading-none">{item.icon}</div>
                  <h3 className="mt-4 text-[16px] font-bold tracking-[-0.02em] text-[#111827]">{item.title}</h3>
                  <p className="mt-2 text-[13px] font-medium text-[#5B6472]">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <PartnerModal isOpen={isPartnerModalOpen} onClose={() => setIsPartnerModalOpen(false)} />
    </>
  );
}
