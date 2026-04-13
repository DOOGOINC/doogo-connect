"use client";

import { CheckCircle2, CircleDollarSign, Clock3, Factory, PackageCheck, Truck } from "lucide-react";
import Image from "next/image";
import {
  CLIENT_PROJECT_STEPS,
  formatRfqCurrency,
  formatRfqDate,
  getClientProjectStepIndex,
  getExpectedDeliveryDate,
  RFQ_STATUS_LABELS,
  type RfqRequestRow,
} from "@/lib/rfq";
import { EmptyState } from "./EmptyState";

interface ClientProjectDetailProps {
  request: RfqRequestRow | null;
}

const STEP_ICONS = [CircleDollarSign, CheckCircle2, Factory, PackageCheck, Truck];

export function ClientProjectDetail({ request }: ClientProjectDetailProps) {
  if (!request) return <EmptyState />;

  const stepIndex = getClientProjectStepIndex(request.status);
  const isRejected = request.status === "rejected";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#f8f9fb] p-6">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5">
        <section className="rounded-[12px] border border-[#e8edf5] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-[12px] border border-[#edf1f6] bg-[#f4f6f8]">
                <Image src="/image/image01.jpg" alt={request.product_name} fill className="object-cover" />
              </div>
              <div>
                <p className="text-[12px] font-bold tracking-wide text-[#a0aec0]">{request.request_number}</p>
                <h2 className="mt-1 text-[18px] font-bold text-[#111827]">{request.product_name}</h2>
                <p className="mt-1 text-[13px] font-bold text-[#6b7280]">
                  {request.manufacturer_name} · {request.quantity.toLocaleString()}개
                </p>
                {isRejected ? (
                  <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
                    <p className="text-[12px] font-bold text-[#b91c1c]">거절 사유</p>
                    <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#7f1d1d]">
                      {request.admin_memo?.trim() || "거절 사유가 입력되지 않았습니다."}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-[12px] font-bold text-[#9ca3af]">총 금액</p>
              <p className="mt-1 text-[18px] font-bold text-[#0064FF]">{formatRfqCurrency(request.total_price, request.currency_code)}</p>
            </div>
          </div>

          {!isRejected ? (
            <div className="mt-7 grid grid-cols-5 items-start gap-2">
              {CLIENT_PROJECT_STEPS.map((step, index) => {
                const isDone = index + 1 <= stepIndex;
                const Icon = STEP_ICONS[index];

                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div className="flex w-full items-center">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                          isDone ? "border-[#0064FF] bg-[#0064FF] text-white" : "border-[#dbe3ef] bg-white text-[#c0c8d4]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {index < CLIENT_PROJECT_STEPS.length - 1 ? (
                        <div className="h-[2px] flex-1 bg-[#e5ebf3]">
                          <div className={`h-full bg-[#0064FF] ${index + 1 < stepIndex ? "w-full" : "w-0"}`} />
                        </div>
                      ) : null}
                    </div>
                    <p className={`mt-3 text-[11px] font-bold ${isDone ? "text-[#0064FF]" : "text-[#b0b8c4]"}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[12px] border border-[#e8edf5] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[#0064FF]">
              <Clock3 className="h-4 w-4" />
              <span className="text-[13px] font-bold">주문일</span>
            </div>
            <p className="text-[16px] font-bold text-[#111827]">{formatRfqDate(request.created_at)}</p>
          </div>

          <div className="rounded-[12px] border border-[#e8edf5] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[#0064FF]">
              <Truck className="h-4 w-4" />
              <span className="text-[13px] font-bold">예상 납품일</span>
            </div>
            <p className="text-[16px] font-bold text-[#111827]">{isRejected ? "-" : getExpectedDeliveryDate(request.created_at)}</p>
          </div>

          <div className="rounded-[12px] border border-[#e8edf5] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[#0064FF]">
              <PackageCheck className="h-4 w-4" />
              <span className="text-[13px] font-bold">진행 단계</span>
            </div>
            <p className="text-[16px] font-bold text-[#111827]">{isRejected ? "거절됨" : `${stepIndex} / 5 단계`}</p>
          </div>
        </section>

        {!isRejected ? (
          <section className="rounded-[12px] border border-[#e8edf5] bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-[18px] font-bold text-[#111827]">프로젝트 진행 현황</h3>
            <div className="space-y-4">
              {CLIENT_PROJECT_STEPS.map((step, index) => {
                const isDone = index + 1 <= stepIndex;
                const isCurrent = index + 1 === stepIndex;
                const Icon = STEP_ICONS[index];

                return (
                  <div
                    key={step.key}
                    className={`flex items-center justify-between rounded-[12px] border px-5 py-4 ${
                      isCurrent ? "border-[#cfe0ff] bg-[#edf4ff]" : "border-transparent bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isDone ? "bg-[#0064FF] text-white" : "bg-[#f3f5f8] text-[#c0c8d4]"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`text-[15px] font-bold ${isDone ? "text-[#111827]" : "text-[#c0c8d4]"}`}>{step.label}</p>
                        {isCurrent ? <p className="mt-1 text-[12px] font-black text-[#0064FF]">현재 진행 중</p> : null}
                      </div>
                    </div>
                    <p className="text-[13px] font-bold text-[#a0aec0]">{index + 1 <= stepIndex ? formatRfqDate(request.created_at) : ""}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[12px] border border-[#e8edf5] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-[16px] font-bold text-[#111827]">요청 정보</h3>
            <div className="space-y-3 text-[14px] text-[#4b5563]">
              <div className="flex justify-between gap-4">
                <span className="font-bold text-[#111827]">브랜드명</span>
                <span className="font-bold">{request.brand_name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-bold text-[#111827]">용기</span>
                <span className="font-bold">{request.container_name || "선택 없음"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-bold text-[#111827]">디자인</span>
                <span className="text-right font-bold">{request.design_summary || "기본 선택"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-bold text-[#111827]">현재 상태</span>
                <span className={`font-black ${isRejected ? "text-[#b91c1c]" : "text-[#0064FF]"}`}>{RFQ_STATUS_LABELS[request.status]}</span>
              </div>
              {isRejected ? (
                <div className="flex justify-between gap-4">
                  <span className="font-bold text-[#111827]">거절 사유</span>
                  <span className="text-right font-bold text-[#b91c1c]">{request.admin_memo?.trim() || "거절 사유 없음"}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e8edf5] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-[16px] font-bold text-[#111827]">요청사항</h3>
            <p className="whitespace-pre-wrap rounded-[12px] bg-[#f8fafc] p-4 text-[14px] font-bold leading-relaxed text-[#4b5563]">
              {request.request_note?.trim() || "별도 요청사항이 없습니다."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
