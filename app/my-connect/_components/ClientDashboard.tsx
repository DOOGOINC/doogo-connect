"use client";

import { ArrowRight, Box, CircleAlert, Clock3, PackageCheck, Wallet } from "lucide-react";
import { formatRfqCurrency, RFQ_STATUS_LABELS, type RfqRequestRow } from "@/lib/rfq";

interface ClientDashboardProps {
  requests: RfqRequestRow[];
  onRequestSelect: (requestId: string) => void;
  onTabChange: (tabId: string) => void;
}

const ACTIVE_STATUSES = ["reviewing", "quoted", "ordered", "completed"] as const;

export function ClientDashboard({ requests, onRequestSelect, onTabChange }: ClientDashboardProps) {
  const activeRequests = requests.filter((request) =>
    (ACTIVE_STATUSES as readonly string[]).includes(request.status)
  );
  const completedRequests = requests.filter((request) => request.status === "fulfilled");
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const totalSpend = completedRequests.reduce((sum, request) => sum + Number(request.total_price || 0), 0);
  const newestRequests = [...requests].slice(0, 4);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f5f7fb] p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="overflow-hidden rounded-[14px] bg-[radial-gradient(circle_at_top_left,_#0f172a,_#1d4ed8_58%,_#60a5fa)] p-7 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">Client Control</p>
                <h2 className="mt-3 text-[28px] font-bold tracking-tight">대시보드</h2>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("project")}
                className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur"
              >
                프로젝트 보기
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "진행 중 주문", value: activeRequests.length, icon: Clock3 },
                { label: "신규 검토 필요", value: pendingRequests.length, icon: CircleAlert },
                { label: "구매 확정 누적", value: completedRequests.length, icon: PackageCheck },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <item.icon className="h-5 w-5 text-white/78" />
                  <p className="mt-4 text-[12px] font-semibold text-white/65">{item.label}</p>
                  <p className="mt-1 text-[26px] font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e7ecf3] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 text-[#1f2937]">
              <Wallet className="h-5 w-5 text-[#2563eb]" />
              <h3 className="text-[18px] font-bold">구매 확정 요약</h3>
            </div>
            <div className="mt-6 rounded-[22px] bg-[#f8fbff] p-5">
              <p className="text-[12px] font-semibold text-[#6b7280]">총 확정 금액</p>
              <p className="mt-2 text-[26px] font-bold text-[#0f172a]">{formatRfqCurrency(totalSpend, completedRequests[0]?.currency_code)}</p>
              <p className="mt-2 text-[13px] text-[#667085]">구매 확정된 주문 기준으로만 합산합니다.</p>
            </div>

            <div className="mt-5 space-y-3">
              {[
                { label: "전체 프로젝트", value: requests.length },
                { label: "제조 진행 중", value: requests.filter((request) => request.status === "ordered").length },
                { label: "제조 완료 대기", value: requests.filter((request) => request.status === "completed").length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[16px] border border-[#edf2f7] px-4 py-3">
                  <span className="text-[14px] font-medium text-[#667085]">{item.label}</span>
                  <span className="text-[18px] font-bold text-[#111827]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[14px] border border-[#e7ecf3] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[20px] font-bold text-[#111827]">최근 주문</h3>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("activity")}
              className="rounded-full border border-[#dbe4f0] px-4 py-2 text-[13px] font-semibold text-[#2563eb]"
            >
              활동 로그 보기
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {newestRequests.length ? (
              newestRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => {
                    onRequestSelect(request.id);
                    onTabChange("project");
                  }}
                  className="flex items-start justify-between rounded-[22px] border border-[#e7ecf3] bg-[#fcfdff] p-5 text-left transition hover:border-[#bfdbfe] hover:bg-[#f8fbff]"
                >
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-3 py-1 text-[12px] font-semibold text-[#2563eb]">
                      <Box className="h-3.5 w-3.5" />
                      {RFQ_STATUS_LABELS[request.status]}
                    </div>
                    <h4 className="mt-3 truncate text-[18px] font-bold text-[#111827]">{request.product_name}</h4>
                    <p className="mt-2 text-[14px] text-[#667085]">{request.brand_name}</p>
                    <p className="mt-3 text-[14px] font-semibold text-[#0f172a]">
                      {request.quantity.toLocaleString()}개 · {formatRfqCurrency(request.total_price, request.currency_code)}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[#94a3b8]" />
                </button>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#d7dde7] px-6 py-16 text-center text-[14px] text-[#667085]">
                아직 등록된 주문이 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
