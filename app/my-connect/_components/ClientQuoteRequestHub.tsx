"use client";

import { Zap, Building2, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClientQuoteRequestHubProps {
  onTabChange: (tabId: string) => void;
}

export function ClientQuoteRequestHub({ onTabChange }: ClientQuoteRequestHubProps) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-5 py-6 lg:px-6 lg:py-7">
      <div className="mx-auto flex w-full flex-col gap-7">
        <section className="px-1">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#1f2937]">제조사 견적의뢰</h1>
          <p className="mt-3 text-[15px] font-medium text-[#6b7280]">원하는 제품을 선택하고 제조사에 견적을 요청하세요.</p>
        </section>

        <section className="rounded-[14px] border border-[#cfe0ff] bg-[#eef5ff] px-7 py-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#dce9ff] text-[#2f6bff]">
              <Zap className="h-7 w-7 text-[#2f6bff]" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#1f2937]">1분 견적 의뢰</h2>
              <p className="mt-2 text-[15px] font-semibold text-[#6b7280]">의뢰 시 5,000P 차감 · 거절 시 즉시 환급</p>
              <p className="mt-5 text-[15px] font-medium leading-7 text-[#5f6f86]">
                제조사를 선택하고 원하는 제품, 수량, 옵션을 입력하면 즉시 견적 요청이 전달됩니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/estimate")}
            className="rounded-[14px] border-2 border-[#2f6bff] bg-white px-7 py-8 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(47,107,255,0.12)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3ea] text-[#f29b57]">
              <ClipboardList className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-[20px] font-extrabold text-[#111827]">견적 시작하기</h3>
            <p className="mt-3 text-[15px] font-medium text-[#6b7280]">제조사 선택 → 제품 선택 → 견적 확인</p>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("manufacturer-list")}
            className="rounded-[14px] border border-[#e5e7eb] bg-white px-7 py-8 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#d0dbeb] hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#8b95a7]">
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-[20px] font-extrabold text-[#111827]">제조사 목록</h3>
            <p className="mt-3 text-[15px] font-medium text-[#6b7280]">검증된 제조사 파트너 탐색</p>
          </button>
        </section>
      </div>
    </div>
  );
}
