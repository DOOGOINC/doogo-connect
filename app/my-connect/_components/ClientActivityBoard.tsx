"use client";

import { BellRing, Building2, CircleCheck, FileClock, MessageSquareMore } from "lucide-react";
import { formatRfqDateTime, RFQ_STATUS_LABELS, type RfqRequestRow } from "@/lib/rfq";

interface ClientActivityBoardProps {
  requests: RfqRequestRow[];
}

export function ClientActivityBoard({ requests }: ClientActivityBoardProps) {
  const recent = [...requests].slice(0, 10);
  const manufacturerSpread = Object.entries(
    requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.manufacturer_name] = (acc[request.manufacturer_name] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f5f7fb] p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-[1380px] gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-[#e7ecf3] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-[#2563eb]" />
            <h2 className="text-[20px] font-bold text-[#111827]">다음 액션</h2>
          </div>
          <div className="mt-5 space-y-3">
            {[
              {
                icon: FileClock,
                title: "견적 요청 검토",
                description: `${requests.filter((request) => request.status === "pending").length}건이 제조사 응답을 기다리고 있습니다.`,
              },
              {
                icon: MessageSquareMore,
                title: "제조 진행 확인",
                description: `${requests.filter((request) => request.status === "ordered").length}건이 현재 제조 진행 중입니다.`,
              },
              {
                icon: CircleCheck,
                title: "구매 확정 체크",
                description: `${requests.filter((request) => request.status === "completed").length}건이 구매 확정 직전입니다.`,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[20px] border border-[#edf2f7] bg-[#fbfdff] p-5">
                <item.icon className="h-5 w-5 text-[#2563eb]" />
                <h3 className="mt-3 text-[16px] font-bold text-[#0f172a]">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#667085]">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[22px] bg-[#0f172a] p-5 text-white">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-white/80" />
              <p className="text-[14px] font-semibold">제조사 분포</p>
            </div>
            <div className="mt-4 space-y-3">
              {manufacturerSpread.length ? (
                manufacturerSpread.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between text-[14px]">
                    <span className="truncate text-white/80">{name}</span>
                    <span className="font-bold">{count}건</span>
                  </div>
                ))
              ) : (
                <p className="text-[14px] text-white/70">아직 집계할 제조사 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e7ecf3] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <h2 className="text-[20px] font-bold text-[#111827]">최근 활동 로그</h2>

          <div className="mt-6 space-y-4">
            {recent.length ? (
              recent.map((request) => (
                <div key={request.id} className="flex gap-4 rounded-[22px] border border-[#edf2f7] bg-[#fcfdff] p-5">
                  <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-[#2563eb]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[16px] font-bold text-[#111827]">{request.product_name}</p>
                      <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[12px] font-semibold text-[#2563eb]">
                        {RFQ_STATUS_LABELS[request.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] text-[#667085]">
                      {request.manufacturer_name} · {request.brand_name}
                    </p>
                    <p className="mt-3 text-[12px] font-medium text-[#94a3b8]">{formatRfqDateTime(request.updated_at || request.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#d7dde7] px-6 py-20 text-center text-[14px] text-[#667085]">
                아직 확인할 활동 로그가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
