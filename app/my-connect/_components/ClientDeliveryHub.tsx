"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Package, ShoppingBag, Truck, X } from "lucide-react";
import { ClientQuotePreviewModal } from "./ClientQuotePreviewModal";
import { formatRfqCurrency, formatRfqDate, getDisplayOrderNumber, type RfqRequestRow, type RfqRequestStatus } from "@/lib/rfq";

interface ClientDeliveryHubProps {
  requests: RfqRequestRow[];
  onRequestSelect: (requestId: string) => void;
  onTabChange: (tabId: string) => void;
  onPaymentStatusChange: (requestId: string, status: RfqRequestStatus) => Promise<void>;
  onRequestCancel: (requestId: string) => Promise<void>;
  initialTab?: ClientProgressTab;
  onDeliveryTabChange?: (tabId: ClientProgressTab) => void;
}

type ClientProgressTab = "request-history" | "approved" | "manufacturing" | "rejected-projects" | "completed-projects";

const CLIENT_PROGRESS_TABS: Array<{ id: ClientProgressTab; label: string }> = [
  { id: "request-history", label: "요청 내역" },
  { id: "approved", label: "승인 완료" },
  { id: "manufacturing", label: "제조 진행" },
  { id: "completed-projects", label: "완료 프로젝트" },
  { id: "rejected-projects", label: "거절/요청 취소" },
];

const CLIENT_PROGRESS_STATUS_MAP: Record<ClientProgressTab, RfqRequestRow["status"][]> = {
  "request-history": ["pending"],
  approved: ["reviewing", "payment_in_progress", "payment_completed"],
  manufacturing: [
    "production_waiting",
    "quoted",
    "production_started",
    "ordered",
    "production_in_progress",
    "manufacturing_completed",
    "completed",
    "delivery_completed",
  ],
  "rejected-projects": ["rejected", "request_cancelled"],
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
    description: "제조사가 승인한 뒤 결제 대기 또는 결제 완료된 프로젝트입니다.",
    accentClass: "bg-[#eff6ff] text-[#1d4ed8]",
  },
  manufacturing: {
    title: "현재 제조가 진행 중인 프로젝트",
    description: "실제 생산 중이거나 제조 완료 후 확인이 필요한 주문입니다.",
    accentClass: "bg-[#ecfeff] text-[#0f766e]",
  },
  "rejected-projects": {
    title: "거절 / 요청취소 확인",
    description: "제조사가 거절한 요청과 의뢰자가 승인 전 취소한 요청을 따로 확인합니다.",
    accentClass: "bg-[#fef2f2] text-[#b91c1c]",
  },
  "completed-projects": {
    title: "납품 완료까지 끝난 완료 프로젝트",
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
    case "request_cancelled":
      return "bg-[#f3f4f6] text-[#4b5563]";
    case "reviewing":
      return "bg-[#e0f2fe] text-[#0369a1]";
    case "payment_in_progress":
      return "bg-[#e0f2fe] text-[#0369a1]";
    case "payment_completed":
      return "bg-[#ecfdf3] text-[#15803d]";
    case "production_waiting":
    case "quoted":
      return "bg-[#dbeafe] text-[#1d4ed8]";
    case "production_started":
    case "ordered":
      return "bg-[#e0f2fe] text-[#0f766e]";
    case "production_in_progress":
      return "bg-[#ccfbf1] text-[#0f766e]";
    case "manufacturing_completed":
    case "completed":
      return "bg-[#dcfce7] text-[#15803d]";
    case "delivery_completed":
      return "bg-[#e0e7ff] text-[#4338ca]";
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
    case "request_cancelled":
      return "요청취소";
    case "reviewing":
      return "결제 대기";
    case "payment_in_progress":
      return "결제 대기";
    case "payment_completed":
      return "결제 완료";
    case "production_waiting":
      return "생산 대기";
    case "quoted":
      return "제조 대기";
    case "production_started":
      return "제조 시작";
    case "ordered":
      return "제조 시작";
    case "production_in_progress":
      return "제조 진행중";
    case "manufacturing_completed":
      return "제조 완료";
    case "completed":
      return "제조 완료";
    case "delivery_completed":
      return "납품 완료";
    case "fulfilled":
      return "거래 완료";
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
    case "payment_in_progress":
      return 35;
    case "payment_completed":
      return 40;
    case "production_waiting":
    case "quoted":
      return 50;
    case "production_started":
      return 60;
    case "ordered":
      return 60;
    case "production_in_progress":
      return 75;
    case "manufacturing_completed":
    case "completed":
      return 90;
    case "delivery_completed":
      return 95;
    case "fulfilled":
      return 100;
    default:
      return 0;
  }
}

export function ClientDeliveryHub({
  requests,
  onRequestSelect,
  onTabChange,
  onPaymentStatusChange,
  onRequestCancel,
  initialTab = "request-history",
  onDeliveryTabChange,
}: ClientDeliveryHubProps) {
  const [activeTab, setActiveTab] = useState<ClientProgressTab>(initialTab);
  const [selectedRequest, setSelectedRequest] = useState<RfqRequestRow | null>(null);
  const [quotePreviewRequest, setQuotePreviewRequest] = useState<RfqRequestRow | null>(null);
  const [paymentConfirmRequest, setPaymentConfirmRequest] = useState<RfqRequestRow | null>(null);
  const [paymentUpdatingId, setPaymentUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    onDeliveryTabChange?.(activeTab);
  }, [activeTab, onDeliveryTabChange]);

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

  const handlePaymentStatusChange = async (requestId: string, status: RfqRequestStatus) => {
    setPaymentUpdatingId(requestId);
    try {
      await onPaymentStatusChange(requestId, status);
      onRequestSelect(requestId);
    } finally {
      setPaymentUpdatingId(null);
    }
  };

  const handlePaymentConfirmOpen = (request: RfqRequestRow) => {
    setPaymentConfirmRequest(request);
  };

  const handlePaymentConfirmClose = () => {
    if (paymentUpdatingId) return;
    setPaymentConfirmRequest(null);
  };

  const handlePaymentConfirmSubmit = async () => {
    if (!paymentConfirmRequest) return;
    await handlePaymentStatusChange(paymentConfirmRequest.id, "payment_completed");
    setPaymentConfirmRequest(null);
  };

  const handleRequestCancel = async (request: RfqRequestRow) => {
    if (request.status !== "pending") return;
    if (!window.confirm("요청 취소하시겠습니까? 포인트는 환불되지 않습니다.")) return;
    await onRequestCancel(request.id);
    onRequestSelect(request.id);
    setActiveTab("rejected-projects");
  };

  const canViewQuote = (request: RfqRequestRow) => request.status !== "rejected" && request.status !== "request_cancelled";

  return (
    <>
      <div className="flex flex-1 flex-col overflow-auto bg-[#f6f8fb] p-5 lg:p-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
          <div>
            <h2 className="text-[24px] font-bold tracking-tight text-[#1f2937] lg:text-[26px]">생산 진행</h2>
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
                          <span className="rounded-[10px] bg-[#f8fafc] px-3 py-1.5 text-[12px] font-semibold text-[#64748b]">{request.request_number}
                          </span>
                          <span className="rounded-[10px] bg-[#eef4ff] px-3 py-1.5 text-[12px] font-semibold text-[#2563eb]">{getDisplayOrderNumber(request)}
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
                        {(request.status === "rejected" || request.status === "request_cancelled") && (request.admin_memo?.trim() || request.status === "request_cancelled") ? (
                          <div className="mt-3 rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
                            <p className="text-[12px] font-bold text-[#b91c1c]">{request.status === "request_cancelled" ? "요청취소" : "거절 사유"}</p>
                            <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#7f1d1d]">
                              {request.status === "request_cancelled" ? "의뢰자가 승인 전 요청을 취소했습니다." : request.admin_memo}
                            </p>
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
                            className={`inline-flex h-11 items-center justify-center rounded-[14px] border px-4 text-[14px] font-semibold shadow-sm transition ${request.status === "pending"
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
                        {activeTab === "approved" && (request.status === "reviewing" || request.status === "payment_in_progress" || request.status === "quoted") ? (
                          <button
                            type="button"
                            disabled={paymentUpdatingId === request.id}
                            onClick={() => handlePaymentConfirmOpen(request)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#0f766e] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#99f6e4]"
                          >
                            {paymentUpdatingId === request.id ? "처리 중..." : "결제 완료하기"}
                          </button>
                        ) : null}
                        {activeTab === "approved" && request.status === "payment_completed" ? (
                          <span className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#ecfdf3] px-4 text-[14px] font-semibold text-[#15803d]">
                            결제 완료
                          </span>
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

                    {request.status !== "rejected" && request.status !== "request_cancelled" ? (
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
                      ...(selectedRequest.status === "rejected" || selectedRequest.status === "request_cancelled"
                        ? [{ label: selectedRequest.status === "request_cancelled" ? "요청취소" : "거절 사유", value: selectedRequest.status === "request_cancelled" ? "의뢰자가 승인 전 요청을 취소했습니다." : selectedRequest.admin_memo?.trim() || "거절 사유가 입력되지 않았습니다." }]
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

      {paymentConfirmRequest ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f172a]/55 px-4 py-8">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[24px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
            <div className="border-b border-[#eaecf0] bg-[#f8fafc] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#2453d8]">결제 가이드</p>
                  <h3 className="mt-2 text-[22px] font-bold text-[#111827]">단계별로 진행해주세요</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#667085]">
                    유트랜스퍼로 이동하셔서 결제 후 결제 완료하기 버튼을 눌러주세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePaymentConfirmClose}
                  className="rounded-full p-2 text-[#667085] transition hover:bg-white"
                  aria-label="결제 안내 팝업 닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8efff] text-[15px] font-bold text-[#2453d8]">
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold text-[#111827]">유트랜스퍼 결제 진행</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[#667085]">
                      유트랜스퍼 로그인 후 안내된 결제를 먼저 진행해 주세요.
                    </p>
                    <a
                      href="https://biz.utransfer.com/login"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex h-11 items-center justify-center rounded-[14px] bg-[#2453d8] px-4 text-[14px] font-semibold text-white transition hover:bg-[#1d44b2]"
                    >
                      유트랜스퍼로 이동하기
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-[#e5e7eb] bg-[#fcfcfd] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8efff] text-[15px] font-bold text-[#2453d8]">
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold text-[#111827]">계정이 없다면 먼저 가입</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[#667085]">
                      유트랜스퍼 계정이 없으신가요? 아래 버튼에서 바로 가입하실 수 있습니다.
                    </p>
                    <a
                      href="https://biz.utransfer.com/signup?code=doogo"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex h-11 items-center justify-center rounded-[14px] border border-[#cfd9ff] bg-white px-4 text-[14px] font-semibold text-[#2453d8] transition hover:bg-[#f5f8ff]"
                    >
                      유트랜스퍼 가입하기
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[20px] border border-[#cfd9ff] bg-[#f5f8ff] p-5">
                <p className="text-[14px] font-semibold text-[#2453d8]">
                  결제를 마치셨다면 아래 버튼을 눌러 현재 주문을 결제 완료 상태로 변경해 주세요.
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handlePaymentConfirmClose}
                  disabled={paymentUpdatingId === paymentConfirmRequest.id}
                  className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#d0d5dd] bg-white px-5 text-[14px] font-semibold text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handlePaymentConfirmSubmit()}
                  disabled={paymentUpdatingId === paymentConfirmRequest.id}
                  className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#2453d8] px-5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#1d44b2] disabled:cursor-not-allowed disabled:bg-[#9bb2f3]"
                >
                  {paymentUpdatingId === paymentConfirmRequest.id ? "처리 중..." : "결제 완료"}
                </button>
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
