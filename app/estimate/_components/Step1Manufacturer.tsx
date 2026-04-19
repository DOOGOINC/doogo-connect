"use client";

import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { ManufacturerCard } from "./ManufacturerCard";

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

type Step1Selection = {
  manufacturer: number | null;
  product: string | null;
  quantity: number;
  container: string | null;
  design: string | null;
  designServices: string[];
  designPackage: string | null;
  designExtras: string[];
};

interface Props {
  selection: Step1Selection;
  setSelection: (val: Step1Selection) => void;
  manufacturers: Manufacturer[];
  loading: boolean;
}

export function Step1Manufacturer({ selection, setSelection, manufacturers, loading }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredManufacturers = manufacturers.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      m.location.toLowerCase().includes(query) ||
      m.tags.some((tag) => tag.toLowerCase().includes(query)) ||
      m.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-[20px] font-bold tracking-tight text-[#191f28]">제조사 선택</h2>
        <p className="text-[14px] text-[#4e5968]">OEM 제조를 진행할 파트너 제조사를 선택하세요.</p>
      </div>

      <div className="relative mb-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="h-5 w-5 text-[#8b95a1]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제조사 이름, 국가, 인증으로 검색 (예: 뉴질랜드, GMP)"
          className="h-[52px] w-full rounded-[12px] border border-[#e5e8eb] bg-[#f9fafb] pl-11 pr-4 text-[15px] outline-none transition-all focus:border-[#3182f6] focus:bg-white focus:ring-1 focus:ring-[#3182f6]"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[140px] w-full animate-pulse rounded-[16px] border border-[#f2f4f6] bg-white" />
          ))
        ) : filteredManufacturers.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#e5e8eb] bg-[#f9fafb] px-6 py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-[#d1d6db]" />
            <p className="mt-4 text-[15px] font-bold text-[#8b95a1]">
              {searchQuery ? "검색 결과가 없습니다." : "등록된 제조 파트너가 없습니다."}
            </p>
          </div>
        ) : (
          filteredManufacturers.map((m, index) => (
            <ManufacturerCard
              key={m.id}
              {...m}
              desc={m.description}
              priority={index === 0}
              selected={selection.manufacturer === m.id}
              onClick={() => setSelection({ ...selection, manufacturer: m.id, product: null, container: null })}
            />
          ))
        )}
      </div>
    </div>
  );
}
