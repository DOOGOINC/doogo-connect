"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { MANUFACTURERS as FALLBACK_MANUFACTURERS } from "@/app/estimate/_data/constants";
import { authFetch } from "@/lib/client/auth-fetch";
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

type ProductCurrencyRow = {
  manufacturer_id: number;
  payment_currency: string | null;
};

const CURRENCY_ORDER = ["USD", "KRW", "NZD"];

function sortCurrencyCodes(codes: string[]) {
  return [...codes].sort((a, b) => {
    const aIndex = CURRENCY_ORDER.indexOf(a);
    const bIndex = CURRENCY_ORDER.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? CURRENCY_ORDER.length : aIndex) - (bIndex === -1 ? CURRENCY_ORDER.length : bIndex);
    }
    return a.localeCompare(b);
  });
}

function getProductCurrencyLabel(values: Array<string | null | undefined>) {
  const codes = sortCurrencyCodes(Array.from(new Set(values.map((value) => (value || "USD").toUpperCase()).filter(Boolean))));
  return `${(codes.length ? codes : ["USD"]).join(", ")} 결제`;
}

function getCurrencyLabel(value?: string | null) {
  const code = (value || "USD").toUpperCase();
  return `${code} 결제`;
}

export function ClientManufacturerDirectory({
  refreshKey = 0,
  onChatStart,
}: {
  refreshKey?: number;
  onChatStart?: (roomId: string) => void;
}) {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [currencyMap, setCurrencyMap] = useState<Record<number, string[]>>({});
  const [query, setQuery] = useState("");
  const [startingChatId, setStartingChatId] = useState<number | null>(null);

  useEffect(() => {
    const fetchManufacturers = async () => {
      const [manufacturerResult, productCurrencyResult] = await Promise.all([
        supabase.from("manufacturers").select("*").order("id", { ascending: true }),
        supabase.from("manufacturer_products").select("manufacturer_id, payment_currency").eq("is_active", true),
      ]);

      if (!productCurrencyResult.error) {
        const nextCurrencyMap = ((productCurrencyResult.data as ProductCurrencyRow[] | null) || []).reduce<Record<number, string[]>>(
          (acc, row) => {
            const code = (row.payment_currency || "USD").toUpperCase();
            acc[row.manufacturer_id] = Array.from(new Set([...(acc[row.manufacturer_id] || []), code]));
            return acc;
          },
          {}
        );
        setCurrencyMap(nextCurrencyMap);
      }

      if (!manufacturerResult.error && manufacturerResult.data && manufacturerResult.data.length > 0) {
        setManufacturers(manufacturerResult.data as Manufacturer[]);
        return;
      }

      setManufacturers(FALLBACK_MANUFACTURERS as Manufacturer[]);
      setCurrencyMap({});
    };

    void fetchManufacturers();
  }, [refreshKey]);

  const visibleManufacturers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return manufacturers;

    return manufacturers.filter((item) =>
      [item.name, item.location, item.description, ...(item.tags || [])].some((value) => value?.toLowerCase().includes(normalized))
    );
  }, [manufacturers, query]);

  const handleChatStart = async (manufacturer: Manufacturer) => {
    if (!window.confirm(`${manufacturer.name} 제조사와 채팅하시겠습니까?`)) {
      return;
    }

    try {
      setStartingChatId(manufacturer.id);
      const response = await authFetch("/api/chat/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ manufacturerId: manufacturer.id }),
      });
      const payload = (await response.json()) as { roomId?: string; error?: string };

      if (!response.ok || !payload.roomId) {
        window.alert(`채팅방 생성에 실패했습니다: ${payload.error || "알 수 없는 오류"}`);
        return;
      }

      onChatStart?.(payload.roomId);
    } finally {
      setStartingChatId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-5 py-6 lg:px-6 lg:py-7">
      <div className="mx-auto flex w-full flex-col gap-6">
        <section>
          <h1 className="text-[24px] font-bold tracking-tight text-[#1f2937]">제조사 목록</h1>
          <p className="mt-3 text-[14px] font-medium text-[#6b7280]">검증된 글로벌 파트너 제조사를 탐색하세요.</p>
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
              const fallbackCurrency = item.catalog_currency || fallback?.catalog_currency || (index === 0 ? "NZD" : index === 1 ? "KRW" : "USD");
              const currencyLabel = currencyMap[item.id]?.length
                ? getProductCurrencyLabel(currencyMap[item.id])
                : getCurrencyLabel(fallbackCurrency);

              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-5 rounded-[14px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white">
                      <Image src={logoSrc} alt={`${item.name} 로고`} fill sizes="60px" className="object-contain p-2" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-bold text-[#111827]">{item.name}</h2>
                      <p className="mt-1 text-[12px] font-semibold text-[#303443]">{item.location}</p>
                      <p className="mt-3 break-keep text-[14px]  leading-7 text-[#303443]">{item.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(item.tags || []).map((tag) => (
                          <span key={tag} className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[12px] font-medium text-[#303443]">
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
                      disabled={startingChatId === item.id}
                      onClick={() => void handleChatStart(item)}
                      className="rounded-full border border-[#d7e2f3] bg-white px-5 py-1.5 text-[14px] font-bold text-[#2f6bff] transition hover:bg-[#f5f8ff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {startingChatId === item.id ? "생성중" : "채팅하기"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/estimate?manufacturer=${item.id}&step=2`)}
                      className="rounded-full bg-[#005adb] px-5 py-1.5 text-[14px] font-bold text-white transition hover:bg-[#1f5af0]"
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
