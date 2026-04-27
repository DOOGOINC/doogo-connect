"use client";

import { useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import { formatRfqCurrency, getDisplayOrderNumber, getExpectedDeliveryDate, type RfqRequestRow, type RfqRequestStatus } from "@/lib/rfq";

interface ProductionManagementProps {
  requests: RfqRequestRow[];
  onStatusChange: (requestId: string, status: RfqRequestStatus) => Promise<void>;
}

type ProductionTab = "payment-confirm" | "waiting" | "started" | "in-progress" | "completed" | "delivery-completed";

const PRODUCTION_TABS: Array<{ id: ProductionTab; label: string }> = [
  { id: "payment-confirm", label: "결제 확인" },
  { id: "waiting", label: "생산 대기" },
  { id: "started", label: "제조 시작" },
  { id: "in-progress", label: "제조 진행중" },
  { id: "completed", label: "제조 완료" },
  { id: "delivery-completed", label: "납품 완료" },
];

const PRODUCTION_STATUS_MAP: Record<ProductionTab, RfqRequestStatus[]> = {
  "payment-confirm": ["payment_completed"],
  waiting: ["production_waiting", "quoted"],
  started: ["production_started", "ordered"],
  "in-progress": ["production_in_progress"],
  completed: ["manufacturing_completed", "completed"],
  "delivery-completed": ["delivery_completed"],
};

const formatIsoDate = (value: string) => {
  const [date] = value.split("T");
  return date;
};

const getOrderNumberLabel = (request: RfqRequestRow) => getDisplayOrderNumber(request);

const getProgress = (status: RfqRequestStatus) => {
  switch (status) {
    case "fulfilled":
      return 100;
    case "delivery_completed":
      return 95;
    case "manufacturing_completed":
    case "completed":
      return 85;
    case "production_in_progress":
      return 70;
    case "production_started":
    case "ordered":
      return 55;
    case "production_waiting":
    case "quoted":
      return 40;
    case "payment_completed":
      return 25;
    case "reviewing":
      return 15;
    default:
      return 0;
  }
};

export function ProductionManagement({ requests, onStatusChange }: ProductionManagementProps) {
  const [activeTab, setActiveTab] = useState<ProductionTab>("payment-confirm");
  const [selectedRequest, setSelectedRequest] = useState<RfqRequestRow | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const productionRequests = useMemo(
    () => requests.filter((request) => Object.values(PRODUCTION_STATUS_MAP).flat().includes(request.status)),
    [requests]
  );

  const counts = useMemo(
    () =>
      PRODUCTION_TABS.reduce<Record<ProductionTab, number>>(
        (acc, tab) => {
          acc[tab.id] = productionRequests.filter((request) => PRODUCTION_STATUS_MAP[tab.id].includes(request.status)).length;
          return acc;
        },
        { "payment-confirm": 0, waiting: 0, started: 0, "in-progress": 0, completed: 0, "delivery-completed": 0 }
      ),
    [productionRequests]
  );

  const visibleRequests = useMemo(
    () => productionRequests.filter((request) => PRODUCTION_STATUS_MAP[activeTab].includes(request.status)),
    [activeTab, productionRequests]
  );

  const updateStatus = async (requestId: string, status: RfqRequestStatus) => {
    setUpdatingId(requestId);
    try {
      await onStatusChange(requestId, status);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMoveToWaiting = async (requestId: string) => {
    await updateStatus(requestId, "production_waiting");
  };

  const handleStartProduction = async (requestId: string) => {
    await updateStatus(requestId, "production_started");
  };

  const handleMoveToInProgress = async (requestId: string) => {
    await updateStatus(requestId, "production_in_progress");
  };

  const handleCompleteProduction = async (requestId: string) => {
    await updateStatus(requestId, "manufacturing_completed");
  };

  const handleCompleteDelivery = async (requestId: string) => {
    await updateStatus(requestId, "delivery_completed");
  };

  const handleMoveToWarehouse = async (requestId: string) => {
    const shouldConfirm = window.confirm("거래 완료 처리하시겠습니까?");
    if (!shouldConfirm) return;

    await updateStatus(requestId, "fulfilled");
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-auto bg-[#f6f8fb] p-5 lg:p-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
          <div>
            <h2 className="text-[24px] font-bold tracking-tight text-[#1f2937] lg:text-[26px]">제조 관리</h2>
            <p className="mt-1.5 text-[14px] text-[#667085] lg:text-[15px]">
              {activeTab === "payment-confirm" && "의뢰자가 결제를 완료한 주문을 제조사가 수기로 확인합니다."}
              {activeTab === "waiting" && "생산 대기 상태의 주문입니다."}
              {activeTab === "started" && "제조 시작 처리된 주문입니다."}
              {activeTab === "in-progress" && "현재 제조가 진행 중인 주문입니다."}
              {activeTab === "completed" && "제조가 완료된 주문입니다."}
              {activeTab === "delivery-completed" && "납품 완료 후 거래 완료 대기 중인 주문입니다."}
            </p>
          </div>

          <div className="inline-flex w-fit rounded-[16px] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            {PRODUCTION_TABS.map((tab) => {
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
                  <span className={`ml-2 ${isActive ? "text-white/80" : "text-[#98a2b3]"}`}>{counts[tab.id]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-5">
            {visibleRequests.length ? (
              visibleRequests.map((request) => {
                const progress = getProgress(request.status);
                const currentTabLabel = PRODUCTION_TABS.find((tab) => PRODUCTION_STATUS_MAP[tab.id].includes(request.status))?.label;

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
                          <span className="rounded-[10px] bg-[#eef4ff] px-3 py-1.5 text-[12px] font-semibold text-[#2563eb]">{getOrderNumberLabel(request)}
                          </span>
                          <span className="rounded-full bg-[#fff1b8] px-3 py-1 text-[12px] font-semibold text-[#b7791f]">
                            {currentTabLabel}
                          </span>
                        </div>

                        <h3 className="mt-3 text-[18px] font-bold text-[#1f2937] lg:text-[20px]">{request.product_name}</h3>
                        <p className="mt-2 text-[14px] text-[#667085] lg:text-[15px]">
                          담당자 {request.contact_name}
                          <span className="mx-2 text-[#d0d5dd]">|</span>
                          수량: {request.quantity.toLocaleString()}개
                          <span className="mx-2 text-[#d0d5dd]">|</span>
                          금액: <span className="font-semibold text-[#d97706]">{formatRfqCurrency(request.total_price, request.currency_code)}</span>
                        </p>
                        <p className="mt-1.5 text-[14px] text-[#667085] lg:text-[15px]">
                          주문일 {formatIsoDate(request.created_at)}
                          <span className="mx-2 text-[#d0d5dd]">|</span>
                          납기일 {formatIsoDate(getExpectedDeliveryDate(request.created_at))}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 xl:flex-col xl:items-end">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-[#d7dde7] bg-white px-4 text-[14px] font-semibold text-[#1f2937] shadow-sm transition hover:bg-[#f8fafc]"
                        >
                          <Eye className="h-4 w-4" />
                          상세
                        </button>
                        {activeTab === "payment-confirm" && (
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => void handleMoveToWaiting(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#475467] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#344054] disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
                          >
                            {updatingId === request.id ? "처리 중..." : "생산 대기로 이동"}
                          </button>
                        )}
                        {activeTab === "waiting" && (
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => void handleStartProduction(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#2563eb] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#93c5fd]"
                          >
                            {updatingId === request.id ? "처리 중..." : "제조 시작"}
                          </button>
                        )}
                        {activeTab === "started" && (
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => void handleMoveToInProgress(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#0891b2] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:bg-[#67e8f9]"
                          >
                            {updatingId === request.id ? "처리 중..." : "제조 진행중으로 이동"}
                          </button>
                        )}
                        {activeTab === "in-progress" && (
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => void handleCompleteProduction(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#16a34a] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-[#86efac]"
                          >
                            {updatingId === request.id ? "처리 중..." : "완료 처리"}
                          </button>
                        )}
                        {activeTab === "completed" && (
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => void handleCompleteDelivery(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#0f766e] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#99f6e4]"
                          >
                            {updatingId === request.id ? "처리 중..." : "납품 완료"}
                          </button>
                        )}
                        {activeTab === "delivery-completed" && (
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => void handleMoveToWarehouse(request.id)}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#0f766e] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#99f6e4]"
                          >
                            {updatingId === request.id ? "처리 중..." : "거래 완료"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-[#667085]">
                        <span>진행률</span>
                        <span className="text-[#2563eb]">{progress}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[#eef2f6]">
                        <div className="h-full rounded-full bg-[#2563eb] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#d7dde7] bg-white px-6 py-16 text-center shadow-sm">
                <h3 className="text-[18px] font-bold text-[#1f2937]">표시할 주문이 없습니다.</h3>
                <p className="mt-2 text-[14px] text-[#667085]">선택한 제조 단계에 해당하는 주문이 들어오면 여기에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f172a]/45 px-4 py-8">
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[680px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#eaecf0] px-6 py-5">
              <h3 className="text-[18px] font-bold text-[#1f2937]">제조 상세</h3>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-full p-1.5 text-[#667085] transition hover:bg-[#f2f4f7]"
                aria-label="제조 상세 닫기"
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
                  주문번호: {getOrderNumberLabel(selectedRequest)}
                </div>
              </div>

              <div className="mt-5 divide-y divide-[#eaecf0] rounded-[16px] border border-[#eaecf0] bg-white">
                {[
                  ["RFQ 번호", selectedRequest.request_number],
                  ["주문번호", getOrderNumberLabel(selectedRequest)],
                  ["상품", selectedRequest.product_name],
                  ["담당자", selectedRequest.contact_name],
                  ["수량", `${selectedRequest.quantity.toLocaleString()}개`],
                  ["금액", formatRfqCurrency(selectedRequest.total_price, selectedRequest.currency_code)],
                  ["주문일", formatIsoDate(selectedRequest.created_at)],
                  ["납기일", formatIsoDate(getExpectedDeliveryDate(selectedRequest.created_at))],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 px-4 py-4">
                    <span className="text-[13px] font-medium text-[#667085]">{label}</span>
                    <span className="text-right text-[14px] font-bold text-[#1f2937]">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-[#667085]">
                  <span>진행률</span>
                  <span className="text-[#2563eb]">{getProgress(selectedRequest.status)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#eef2f6]">
                  <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${getProgress(selectedRequest.status)}%` }} />
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[16px] border border-[#eaecf0] bg-white">
                <table className="w-full text-left text-[13px]">
                  <tbody>
                    {[
                      { label: "회사명", value: selectedRequest.brand_name },
                      { label: "상품명", value: selectedRequest.product_name },
                      { label: "제조사", value: selectedRequest.manufacturer_name },
                      { label: "담당자", value: selectedRequest.contact_name },
                      { label: "이메일", value: selectedRequest.contact_email },
                      { label: "연락처", value: selectedRequest.contact_phone },
                      { label: "수량", value: `${selectedRequest.quantity.toLocaleString()}개` },
                      { label: "금액", value: formatRfqCurrency(selectedRequest.total_price, selectedRequest.currency_code) },
                      { label: "용기/포장", value: selectedRequest.container_name || "선택 없음" },
                      { label: "디자인", value: selectedRequest.design_summary || "기본 선택" },
                      {
                        label: "공유 파일 링크",
                        value:
                          selectedRequest.has_files && selectedRequest.file_link
                            ? selectedRequest.file_link
                            : "공유된 파일이 없습니다.",
                      },
                      { label: "요청사항", value: selectedRequest.request_note?.trim() || "별도 요청사항이 기록되지 않았습니다." },
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
      )}
    </>
  );
}
