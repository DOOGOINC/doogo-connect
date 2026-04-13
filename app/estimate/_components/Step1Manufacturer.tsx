"use client";

import { Building2, Sparkles, Info } from "lucide-react";

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

interface Props {
  selection: any;
  setSelection: (val: any) => void;
  manufacturers: Manufacturer[];
  loading: boolean;
}

export function Step1Manufacturer({ selection, setSelection, manufacturers, loading }: Props) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#f2f4f6] pb-6">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[#191f28]">제조사 선택</h2>
          <p className="mt-1 text-[14px] text-[#4e5968]">검증된 전문 제조 파트너를 직접 확인하고 선택하세요.</p>
        </div>
      </div>



      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[120px] w-full animate-pulse rounded-[12px] border border-[#f2f4f6] bg-white" />
          ))
        ) : manufacturers.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#e5e8eb] bg-[#f9fafb] px-6 py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-[#d1d6db]" />
            <p className="mt-4 text-[15px] font-bold text-[#8b95a1]">등록된 제조 파트너가 없습니다.</p>
          </div>
        ) : (
          manufacturers.map((m) => (
            <ManufacturerCard
              key={m.id}
              {...m}
              desc={m.description}
              selected={selection.manufacturer === m.id}
              onClick={() => setSelection({ ...selection, manufacturer: m.id, product: null, container: null })}
            />
          ))
        )}
      </div>
    </div>
  );
}
