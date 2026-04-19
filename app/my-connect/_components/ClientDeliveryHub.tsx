"use client";

import { useMemo, useState } from "react";
import { Eye, FileText, Package, ShoppingBag, Truck, X } from "lucide-react";
import { ClientQuotePreviewModal } from "./ClientQuotePreviewModal";
import { formatRfqCurrency, formatRfqDate, getDisplayOrderNumber, type RfqRequestRow } from "@/lib/rfq";

interface ClientDeliveryHubProps {
  requests: RfqRequestRow[];
  onRequestSelect: (requestId: string) => void;
  onTabChange: (tabId: string) => void;
}

type ClientProgressTab = "request-history" | "approved" | "manufacturing" | "rejected-projects" | "completed-projects";

const CLIENT_PROGRESS_TABS: Array<{ id: ClientProgressTab; label: string }> = [
  { id: "request-history", label: "요청 내역" },
  { id: "approved", label: "승인 완료" },
  { id: "manufacturing", label: "제조 진행" },
  { id: "completed-projects", label: "완료 프로젝트" },
  { id: "rejected-projects", label: "거절된 프로젝트" },
];

const CLIENT_PROGRESS_STATUS_MAP: Record<ClientProgressTab, RfqRequestRow["status"][]> = {
  "request-history": ["pending", "reviewing", "quoted"],
  approved: ["reviewing", "quoted"],
  manufacturing: ["ordered", "completed"],
  "rejected-projects": ["rejected"],
  "completed-projects": ["fulfilled"],
};

const TAB_META: Record<
  ClientProgressTab,
  {
    title: string;
    description: string;
    accentClass: string;
  }
> = {
  "request-history": {
    title: "제조 요청과 응답 대기 현황",
    description: "제조사 확인 전 요청과 승인 대기 중인 건을 확인합니다.",
    accentClass: "bg-[#fff7ed] text-[#c2410c]",
  },
  approved: {
    title: "승인 후 결제 준비 단계",
    description: "승인 완료 후 결제 또는 제조 시작 전 프로젝트입니다.",
    accentClass: "bg-[#eff6ff] text-[#1d4ed8]",
  },
  manufacturing: {
    title: "현재 제조가 진행 중인 프로젝트",
    description: "실제 생산 중이거나 제조 완료 후 확인이 필요한 주문입니다.",
    accentClass: "bg-[#ecfeff] text-[#0f766e]",
  },
  "rejected-projects": {
    title: "거절된 프로젝트와 사유 확인",
    description: "제조사가 거절한 요청과 거절 사유를 따로 확인합니다.",
    accentClass: "bg-[#fef2f2] text-[#b91c1c]",
  },
  "completed-projects": {
    title: "구매 확정까지 끝난 완료 프로젝트",
    description: "거래와 정산 기준이 되는 최종 완료 주문입니다.",
    accentClass: "bg-[#ecfdf3] text-[#15803d]",
  },
};

function getStatusTone(status: RfqRequestRow["status"]) {
  switch (status) {
    case "pending":
      return "bg-[#fff3cd] text-[#b7791f]";
    case "rejected":
      return "bg-[#fee2e2] text-[#b91c1c]";
    case "reviewing":
      return "bg-[#e0f2fe] text-[#0369a1]";
    case "quoted":
      return "bg-[#dbeafe] text-[#1d4ed8]";
    case "ordered":
      return "bg-[#e0f2fe] text-[#0f766e]";
    case "completed":
      return "bg-[#dcfce7] text-[#15803d]";
    case "fulfilled":
      return "bg-[#dcfce7] text-[#166534]";
    default:
      return "bg-[#f3f4f6] text-[#4b5563]";
  }
}

function getStatusLabel(status: RfqRequestRow["status"]) {
  switch (status) {
    case "pending":
      return "승인 대기중";
    case "rejected":
      return "거절";
    case "reviewing":
      return "승인 완료";
    case "quoted":
      return "결제 준비";
    case "ordered":
      return "제조 진행중";
    case "completed":
      return "제조 완료";
    case "fulfilled":
      return "완료";
    default:
      return status;
  }
}

function getProgress(status: RfqRequestRow["status"]) {
  switch (status) {
    case "pending":
      return 10;
    case "reviewing":
      return 30;
    case "quoted":
      return 45;
    case "ordered":
      return 70;
    case "completed":
      return 90;
    case "fulfilled":
      return 100;
    default:
      return 0;
  }
}

export function ClientDeliveryHub({ requests, onRequestSelect, onTabChange }: ClientDeliveryHubProps) {
  const [activeTab, setActiveTab] = useState<ClientProgressTab>("request-history");
  const [selectedRequest, setSelectedRequest] = useState<RfqRequestRow | null>(null);
  const [quotePreviewRequest, setQuotePreviewRequest] = useState<RfqRequestRow | null>(null);

  const groupedRequests = useMemo(
    () =>
      CLIENT_PROGRESS_TABS.reduce<Record<ClientProgressTab, RfqRequestRow[]>>(
        (acc, tab) => {
          acc[tab.id] = requests.filter((request) => CLIENT_PROGRESS_STATUS_MAP[tab.id].includes(request.status));
          return acc;
        },
        {
          "request-history": [],
          approved: [],
          manufacturing: [],
          "rejected-projects": [],
          "completed-projects": [],
        }
      ),
    [requests]
  );

  const visibleRequests = groupedRequests[activeTab];
  const tabMeta = TAB_META[activeTab];

  const handleOpenProject = (requestId: string) => {
    onRequestSelect(requestId);
    onTabChange("project");
  };

  const handleQuoteView = (requestId: string) => {
    const target = requests.find((request) => request.id === requestId) || null;
    setQuotePreviewRequest(target);
  };

  const handlePaymentProceed = (requestId: string) => {
    onRequestSelect(requestId);
    onTabChange("payment");
  };

  const handleRequestCancel = (request: RfqRequestRow) => {
    if (request.status !== "pending") return;
    window.alert("요청 취소 기능은 다음 단계에서 실제 취소 처리와 함께 연결될 예정입니다.");
  };

  const canViewQuote = (request: RfqRequestRow) => request.status !== "rejected";

  return (
    <>
      <div className="flex flex-1 flex-col overflow-auto bg-[#f6f8fb] p-5 lg:p-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
          <div>
            <h2 className="text-[24px] font-bold tracking-tight text-[#1f2937] lg:text-[26px]">제조 진행</h2>
            <p className="mt-1.5 text-[14px] text-[#667085] lg:text-[15px]">{tabMeta.description}</p>
          </div>

          <div className="inline-flex w-fit rounded-[16px] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            {CLIENT_PROGRESS_TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition lg:px-5 lg:text-[14px] ${isActive ? "bg-[#0f172a] text-white" : "text-[#475467] hover:bg-[#f2f4f7]"
                    }`}
                >
                  {tab.label}
                  <span className={`ml-2 ${isActive ? "text-white/80" : "text-[#98a2b3]"}`}>{groupedRequests[tab.id].length}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[20px] border border-[#e7ecf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${tabMeta.accentClass}`}>{tabMeta.title}</div>
                <p className="mt-3 text-[14px] text-[#667085]">총 {visibleRequests.length}건이 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("project")}
                className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#d7dde7] bg-white px-4 text-[14px] font-semibold text-[#1f2937] shadow-sm transition hover:bg-[#f8fafc]"
              >
                전체 프로젝트 보기
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {visibleRequests.length ? (
              visibleRequests.map((request) => {
                const progress = getProgress(request.status);
                return (
                  <article
                    key={request.id}
                    className="rounded-[20px] border border-[#e7ecf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:p-6"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-[10px] bg-[#f8fafc] px-3 py-1.5 text-[12px] font-semibold text-[#64748b]">
                            RFQ {request.request_number}
                          </span>
                          <span className="rounded-[10px] bg-[#eef4ff] px-3 py-1.5 text-[12px] font-semibold text-[#2563eb]">
                            주문 {getDisplayOrderNumber(request)}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${getStatusTone(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </div>

                        <h3 className="mt-3 text-[18px] font-bold text-[#1f2937] lg:text-[20px]">{request.product_name}</h3>
                        <p className="mt-2 text-[14px] text-[#667085] lg:text-[15px]">
                          {request.brand_name}
                          <span className="mx-2 text-[#d0d5dd]">|</span>
                          수량: {request.quantity.toLocaleString()}개
                          <span className="mx-2 text-[#d0d5dd]">|</span>
                          요청일: {formatRfqDate(request.created_at)}
                        </p>
                        <p className="mt-1.5 text-[14px] font-semibold text-[#344054] lg:text-[15px]">
                          예상 금액: {formatRfqCurrency(request.total_price, request.currency_code)}
                        </p>
                        {request.status === "rejected" && request.admin_memo?.trim() ? (
                          <div className="mt-3 rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
                            <p className="text-[12px] font-bold text-[#b91c1c]">거절 사유</p>
                            <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#7f1d1d]">{request.admin_memo}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-[#eef2f6] pt-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {activeTab === "request-history" ? (
                          <button
                            type="button"
                            onClick={() => handleRequestCancel(request)}
                            disabled={request.status !== "pending"}
                            className={`inline-flex h-11 items-center justify-center rounded-[14px] border px-4 text-[14px] font-semibold shadow-sm transition ${
                              request.status === "pending"
                                ? "border-[#fecaca] bg-white text-[#dc2626] hover:bg-[#fff5f5]"
                                : "cursor-not-allowed border-[#e5e7eb] bg-[#f8fafc] text-[#98a2b3]"
                            }`}
                          >
                            요청 취소
                          </button>
                        ) : null}
                        {canViewQuote(request) ? (
                          <button
                            type="button"
                            onClick={() => handleQuoteView(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#2563eb] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8]"
                          >
                            견적서 보기
                          </button>
                        ) : null}
                        {activeTab === "approved" ? (
                          <button
                            type="button"
                            onClick={() => handlePaymentProceed(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#0f766e] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#115e59]"
                          >
                            결제 진행하기
                          </button>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-[#d7dde7] bg-white px-4 text-[14px] font-semibold text-[#1f2937] shadow-sm transition hover:bg-[#f8fafc]"
                        >
                          <Eye className="h-4 w-4" />
                          상세 보기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenProject(request.id)}
                          className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#d7dde7] bg-white px-4 text-[14px] font-semibold text-[#1f2937] shadow-sm transition hover:bg-[#f8fafc]"
                        >
                          프로젝트 보기
                        </button>
                      </div>
                    </div>

                    {request.status !== "rejected" ? (
                      <div className="mt-6">
                        <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-[#667085]">
                          <span>진행률</span>
                          <span className="text-[#2563eb]">{progress}%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-[#eef2f6]">
                          <div className="h-full rounded-full bg-[#2563eb] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#d7dde7] bg-white px-6 py-16 text-center shadow-sm">
                <h3 className="text-[18px] font-bold text-[#1f2937]">표시할 프로젝트가 없습니다.</h3>
                <p className="mt-2 text-[14px] text-[#667085]">선택한 탭에 해당하는 요청이 들어오면 여기에서 확인할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f172a]/45 px-4 py-8">
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#eaecf0] px-6 py-5">
              <h3 className="text-[18px] font-bold text-[#1f2937]">프로젝트 상세</h3>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-full p-1.5 text-[#667085] transition hover:bg-[#f2f4f7]"
                aria-label="프로젝트 상세 닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex rounded-[10px] bg-[#f8fafc] px-3 py-1.5 text-[13px] font-medium text-[#667085]">
                  RFQ 번호: {selectedRequest.request_number}
                </div>
                <div className="inline-flex rounded-[10px] bg-[#eef4ff] px-3 py-1.5 text-[13px] font-medium text-[#2563eb]">
                  주문번호: {getDisplayOrderNumber(selectedRequest)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  { label: "제품명", value: selectedRequest.product_name, icon: Package },
                  { label: "브랜드명", value: selectedRequest.brand_name, icon: ShoppingBag },
                  { label: "금액", value: formatRfqCurrency(selectedRequest.total_price, selectedRequest.currency_code), icon: FileText },
                  { label: "상태", value: getStatusLabel(selectedRequest.status), icon: Truck },
                ].map((item) => (
                  <div key={item.label} className="rounded-[16px] border border-[#eaecf0] bg-[#fcfdff] p-4">
                    <item.icon className="h-4.5 w-4.5 text-[#2563eb]" />
                    <p className="mt-3 text-[12px] font-semibold text-[#94a3b8]">{item.label}</p>
                    <p className="mt-1 text-[16px] font-bold text-[#111827]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 overflow-hidden rounded-[16px] border border-[#eaecf0] bg-white">
                <table className="w-full text-left text-[13px]">
                  <tbody>
                    {[
                      { label: "제조사", value: selectedRequest.manufacturer_name },
                      { label: "담당자", value: selectedRequest.contact_name },
                      { label: "이메일", value: selectedRequest.contact_email },
                      { label: "연락처", value: selectedRequest.contact_phone },
                      { label: "수량", value: `${selectedRequest.quantity.toLocaleString()}개` },
                      { label: "요청일", value: formatRfqDate(selectedRequest.created_at) },
                      { label: "요청사항", value: selectedRequest.request_note?.trim() || "별도 요청사항이 없습니다." },
                      ...(selectedRequest.status === "rejected"
                        ? [{ label: "거절 사유", value: selectedRequest.admin_memo?.trim() || "거절 사유가 입력되지 않았습니다." }]
                        : []),
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-[#f2f4f6] last:border-none">
                        <td className="w-[132px] bg-[#f9fafb] px-4 py-3.5 font-bold text-[#4e5968]">{row.label}</td>
                        <td className="break-all px-4 py-3.5 font-medium leading-relaxed text-[#191f28]">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ClientQuotePreviewModal
        request={quotePreviewRequest}
        open={Boolean(quotePreviewRequest)}
        onClose={() => setQuotePreviewRequest(null)}
      />
    </>
  );
}
