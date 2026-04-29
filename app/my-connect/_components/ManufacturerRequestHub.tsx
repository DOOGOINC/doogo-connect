"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import type { RfqRequestRow } from "@/lib/rfq";

type RequestTab = "pending" | "history";

type ManufacturerRequestHubProps = {
  requests: RfqRequestRow[];
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string, reason: string) => Promise<void>;
  initialTab?: RequestTab;
};

const PAGE_SIZE = 5;

function formatCompactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getProfileInitial(name: string) {
  return name.trim().charAt(0) || "?";
}

function formatAmountByCurrency(value: number, currencyCode?: string | null) {
  const amount = Number(value || 0);
  const safeCurrency = (currencyCode || "USD").toUpperCase();
  return `${safeCurrency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStateBadgeText(request: RfqRequestRow) {
  if (request.status === "pending") return "신규 요청";
  if (request.status === "rejected" || request.status === "request_cancelled" || request.status === "refunded") return "거절됨";
  return "승인됨";
}

function getStateBadgeTone(request: RfqRequestRow) {
  if (request.status === "pending") return "bg-[#fff3e6] text-[#ff7a1a]";
  if (request.status === "rejected" || request.status === "request_cancelled" || request.status === "refunded") {
    return "bg-[#fff1f2] text-[#ff5a66]";
  }
  return "bg-[#eefbf3] text-[#169c53]";
}

function getPaymentMethodLabel(request: RfqRequestRow) {
  return request.currency_code === "KRW" ? "포트원 안전결제" : "유트랜스퍼 해외송금";
}

function getSharedFileLink(request: RfqRequestRow) {
  return request.has_files && request.file_link?.trim() ? request.file_link.trim() : "";
}

function getHistoryMessage(request: RfqRequestRow) {
  if (request.status === "rejected") {
    return `거절 사유: ${request.admin_memo?.trim() || "거절 사유가 등록되지 않았습니다."}`;
  }
  if (request.status === "request_cancelled") {
    return "거절 사유: 의뢰자가 승인 전 요청을 취소했습니다.";
  }
  if (request.status === "refunded") {
    return `거절 사유: ${request.admin_memo?.trim() || "환불 처리된 요청입니다."}`;
  }
  return request.request_note?.trim() || "별도 요청 메모가 없습니다.";
}

function SharedFileLinkCard({ request }: { request: RfqRequestRow }) {
  const href = getSharedFileLink(request);

  return (
    <div className="mt-3 rounded-[16px] bg-[#f6f7f9] px-4 py-3">
      <p className="text-[11px] font-bold text-[#7a8797]">공유 파일 링크</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-[12px] font-medium text-[#2563eb] underline underline-offset-2"
        >
          {href}
        </a>
      ) : (
        <p className="mt-2 text-[12px] font-medium text-[#98a2b3]">공유 파일이 없습니다.</p>
      )}
    </div>
  );
}

export function ManufacturerRequestHub({
  requests,
  onApprove,
  onReject,
  initialTab = "pending",
}: ManufacturerRequestHubProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>(initialTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<RfqRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const pendingRequests = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const historyRequests = useMemo(
    () =>
      requests.filter((request) =>
        [
          "reviewing",
          "payment_in_progress",
          "payment_completed",
          "production_waiting",
          "production_started",
          "production_in_progress",
          "manufacturing_completed",
          "delivery_completed",
          "fulfilled",
          "rejected",
          "refunded",
          "request_cancelled",
          "quoted",
          "ordered",
          "completed",
        ].includes(request.status)
      ),
    [requests]
  );

  const visibleRequests = activeTab === "pending" ? pendingRequests : historyRequests;
  const totalPages = Math.max(1, Math.ceil(visibleRequests.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedRequests = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return visibleRequests.slice(startIndex, startIndex + PAGE_SIZE);
  }, [visiblePage, visibleRequests]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectReason("");
  };

  const handleApprove = async (requestId: string) => {
    setUpdatingId(requestId);
    try {
      await onApprove(requestId);
      setActiveTab("history");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      alert("거절 사유를 입력해주세요.");
      return;
    }

    setUpdatingId(rejectTarget.id);
    try {
      await onReject(rejectTarget.id, trimmedReason);
      closeRejectModal();
      setActiveTab("history");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-auto bg-[#f7f8fb] px-5 py-5 lg:px-7">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
          <header className="space-y-1">
            <h1 className="text-[20px] font-bold text-[#1f2937]">
              {activeTab === "pending" ? "신규 요청" : "요청 승인/거절 내역"}
            </h1>
            <p className="text-[14px] font-medium text-[#7c8798]">
              {activeTab === "pending"
                ? "의뢰자가 5,000포인트를 사용하여 신청한 제조 요청입니다. 승인 시 생산 대기로 자동 이동됩니다."
                : "거절된 요청 내역입니다. 재고 부족 등의 이유로 거절된 건들이 표시됩니다."}
            </p>
          </header>

          <div className="rounded-[14px] border border-[#f4d38b] bg-[#fffbeb] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full text-[#f07c17]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#cb6d18]">승인 전 반드시 확인하세요</p>
                <p className="mt-1 text-[14px] font-medium leading-5 text-[#d47a1f]">
                  승인하면 결제 및 생산 단계로 이어집니다. 재고 부족이나 원료 수급 이슈가 있으면 거절 사유를 남겨 처리하세요.
                </p>
              </div>
            </div>
          </div>

          <section className="overflow-hidden">
            <div className="px-1 space-y-4">
              {paginatedRequests.length ? (
                paginatedRequests.map((request) => {
                  const isPending = request.status === "pending";
                  const isRejectedHistory =
                    request.status === "rejected" || request.status === "request_cancelled" || request.status === "refunded";

                  return (
                    <article key={request.id} className="rounded-[14px] border border-[#e8edf3] bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[20px] font-bold ${isPending ? "bg-[#fff0d8] text-[#ff6a00]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>
                              {getProfileInitial(request.contact_name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getStateBadgeTone(request)}`}>
                                  {getStateBadgeText(request)}
                                </span>
                                <span className="text-[11px] font-semibold text-[#a0a8b5]">{formatCompactDate(request.created_at)}</span>
                              </div>

                              <h3 className="mt-2 text-[16px] font-bold text-[#1f2937]">{request.product_name}</h3>
                              <p className="mt-1 text-[13px] font-medium text-[#6b7280]">
                                의뢰자: {request.contact_name} · 수량: {request.quantity.toLocaleString()}개 · 금액:{" "}
                                <span className="font-bold text-[#2563eb]">{formatAmountByCurrency(request.total_price, request.currency_code)}</span>
                              </p>

                              <div
                                className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${request.currency_code === "KRW" ? "bg-[#eaf8ef] text-[#169c53]" : "bg-[#eef4ff] text-[#2563eb]"
                                  }`}
                              >
                                {getPaymentMethodLabel(request)}
                              </div>

                              {isPending ? (
                                <>
                                  <div className="mt-4 max-w-[420px] rounded-[18px] bg-[#f6f7f9] px-4 py-3">
                                    <p className="text-[11px] font-bold text-[#7a8797]">의뢰자 메모</p>
                                    <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium leading-6 text-[#334155]">
                                      {request.request_note?.trim() || "별도 요청 메모가 없습니다."}
                                    </p>
                                  </div>
                                  <SharedFileLinkCard request={request} />
                                </>
                              ) : isRejectedHistory ? (
                                <>
                                  <div className="mt-4 rounded-[16px] bg-[#fff5f5] px-4 py-3">
                                    <p className="whitespace-pre-wrap text-[12px] font-medium leading-6 text-[#eb323b]">
                                      {getHistoryMessage(request)}
                                    </p>
                                  </div>
                                  <SharedFileLinkCard request={request} />
                                </>
                              ) : (
                                <>
                                  <div className="mt-4 rounded-[16px] bg-[#f6f7f9] px-4 py-3">
                                    <p className="text-[11px] font-bold text-[#7a8797]">의뢰자 메모</p>
                                    <p className="mt-1 whitespace-pre-wrap text-[12px] font-medium leading-6 text-[#475467]">
                                      {getHistoryMessage(request)}
                                    </p>
                                  </div>
                                  <SharedFileLinkCard request={request} />
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {isPending ? (
                          <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
                            <button
                              type="button"
                              disabled={updatingId === request.id}
                              onClick={() => void handleApprove(request.id)}
                              className="inline-flex h-11 min-w-[108px] items-center justify-center gap-2 rounded-[16px] bg-[#2563eb] px-4 text-[13px] font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Check className="h-4 w-4" />
                              {updatingId === request.id ? "처리 중" : "승인"}
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === request.id}
                              onClick={() => {
                                setRejectTarget(request);
                                setRejectReason(request.admin_memo?.trim() || "");
                              }}
                              className="inline-flex h-11 min-w-[108px] items-center justify-center gap-2 rounded-[16px] border border-[#fecaca] bg-white px-4 text-[13px] font-bold text-[#ff4d5a] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X className="h-4 w-4" />
                              거절
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-dashed border-[#d9e1ea] bg-[#fbfcfd] text-center">
                  <div>
                    <p className="text-[15px] font-bold text-[#334155]">
                      {activeTab === "pending" ? "신규 요청이 없습니다." : "승인/거절 내역이 없습니다."}
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-[#94a3b8]">요청이 접수되면 이 영역에 카드 형태로 표시됩니다.</p>
                  </div>
                </div>
              )}
            </div>

            <MasterTablePagination
              totalItems={visibleRequests.length}
              currentPage={visiblePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </section>
        </div>
      </div>

      {rejectTarget ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[520px] rounded-[20px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
            <div className="border-b border-[#eaecf0] px-6 py-5">
              <h3 className="text-[17px] font-bold text-[#1f2937]">요청 거절</h3>
              <p className="mt-1 text-[12px] font-medium text-[#7c8798]">거절 사유를 남기면 승인/거절 탭에 함께 표시됩니다.</p>
            </div>
            <div className="px-6 py-5">
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="거절 사유를 입력해주세요."
                rows={5}
                className="w-full resize-none rounded-[16px] border border-[#d7dee8] px-4 py-3 text-[13px] outline-none transition focus:border-[#2563eb]"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[#d0d5dd] px-4 text-[13px] font-semibold text-[#475467] transition hover:bg-[#f8fafc]"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={updatingId === rejectTarget.id}
                  onClick={() => void handleReject()}
                  className="inline-flex h-10 items-center justify-center rounded-[14px] bg-[#ef4444] px-4 text-[13px] font-semibold text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingId === rejectTarget.id ? "처리 중" : "거절 확정"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
