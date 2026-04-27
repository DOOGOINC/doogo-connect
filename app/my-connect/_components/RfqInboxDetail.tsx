"use client";

import { useState } from "react";
import { Box, ClipboardList, Info, Link2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { formatRfqCurrency, formatRfqDate, RFQ_STATUS_LABELS, type RfqRequestRow, type RfqRequestStatus } from "@/lib/rfq";

interface RfqInboxDetailProps {
  request: RfqRequestRow | null;
  onStatusChange?: (requestId: string, status: RfqRequestStatus) => Promise<void>;
  onReject?: (requestId: string, reason: string) => Promise<void>;
  statusLabelOverrides?: Partial<Record<string, string>>;
}

export function RfqInboxDetail({ request, onStatusChange, onReject, statusLabelOverrides }: RfqInboxDetailProps) {
  const [updatingStatus, setUpdatingStatus] = useState<RfqRequestStatus | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!request) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#f9fafb] p-12">
        <div className="flex h-[400px] w-full max-w-[420px] flex-col items-center justify-center rounded-[32px] border border-[#e5e9ef] bg-white p-10 shadow-sm">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[14px] bg-[#f2f4f6] shadow-inner">
            <Box className="h-12 w-12 text-[#adb5bd]" />
          </div>
          <h4 className="mb-3 text-center text-[20px] font-bold text-[#191f28]">견적 요청을 선택해 주세요</h4>
          <p className="mb-10 text-center text-[15px] font-medium leading-relaxed text-[#8b95a1]">
            좌측 목록에서 요청 건을 클릭하시면
            <br />
            상세한 견적 내역과 요청사항을 볼 수 있습니다.
          </p>
          <Link
            href="/estimate"
            className="flex h-13 items-center gap-2 rounded-2xl bg-[#0064ff] px-10 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(49,130,246,0.2)] transition-all hover:bg-[#1b64da] hover:shadow-[0_8px_25px_rgba(49,130,246,0.3)] active:scale-[0.98]"
          >
            새 견적 요청하기
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel = statusLabelOverrides?.[request.status] ?? RFQ_STATUS_LABELS[request.status];
  const canRespond = request.status === "pending";

  const handleDecision = async (status: RfqRequestStatus) => {
    if (!onStatusChange) return;
    setUpdatingStatus(status);
    try {
      await onStatusChange(request.id, status);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const closeRejectModal = () => {
    setIsRejectModalOpen(false);
    setRejectReason("");
  };

  const handleRejectSubmit = async () => {
    if (!onReject) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      alert("거절 사유를 입력해 주세요.");
      return;
    }

    setUpdatingStatus("rejected");
    try {
      await onReject(request.id, trimmedReason);
      closeRejectModal();
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto bg-[#f9fafb] p-6 lg:p-10">
        <div className="mx-auto w-full max-w-[960px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[12px] border border-[#e5e8eb] bg-white p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col gap-6 border-b border-[#f2f4f6] pb-8 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold uppercase tracking-widest text-[#8b95a1]">{request.request_number}</span>
                  <span className="h-3 w-[1px] bg-[#e5e8eb]" />
                  <span className="text-[13px] font-bold text-[#0064ff]">{formatRfqDate(request.created_at)}</span>
                </div>
                <h2 className="text-[24px] font-bold tracking-tight text-[#191f28]">{request.brand_name}</h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-[10px] bg-[#f2f8ff] px-2.5 py-1 text-[12px] font-bold text-[#0064ff]">{statusLabel}</span>
                  <p className="text-[15px] font-bold text-[#4e5968]">{request.product_name}</p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-4 md:items-end">
                <div className="text-left md:text-right">
                  <p className="mb-1 text-[12px] font-bold text-[#8b95a1]">최종 견적 금액 (VAT 별도)</p>
                  <p className="text-[24px] font-bold tracking-tight tabular-nums text-[#0064ff]">
                    {formatRfqCurrency(request.total_price, request.currency_code)}
                  </p>
                </div>
                {canRespond ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={updatingStatus !== null}
                      onClick={() => {
                        setRejectReason("");
                        setIsRejectModalOpen(true);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-[#fecaca] bg-white px-5 text-[14px] font-bold text-[#dc2626] transition hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingStatus === "rejected" ? "처리 중..." : "거절"}
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatus !== null}
                      onClick={() => void handleDecision("reviewing")}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0064ff] px-5 text-[14px] font-bold text-white transition hover:bg-[#0054d6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingStatus === "reviewing" ? "처리 중..." : "승인"}
                    </button>
                  </div>
                ) : null}
                {(request.status === "rejected" || request.status === "refunded" || request.status === "request_cancelled") && (request.admin_memo?.trim() || request.status === "request_cancelled") ? (
                  <div className="max-w-[320px] rounded-[12px] border border-[#fee4e2] bg-[#fff7f6] px-4 py-3 text-[13px] text-[#912018]">
                    <p className="font-bold">{request.status === "request_cancelled" ? "요청취소" : request.status === "refunded" ? "환불 사유" : "거절 사유"}</p>
                    <p className="mt-1 whitespace-pre-wrap font-medium">
                      {request.status === "request_cancelled" ? "의뢰자가 승인 전 요청을 취소했습니다." : request.admin_memo}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "제조사", value: request.manufacturer_name },
                { label: "주문 수량", value: `${request.quantity.toLocaleString()}개` },
                { label: "단가", value: formatRfqCurrency(request.unit_price, request.currency_code) },
                { label: "견적 상태", value: statusLabel, highlight: true },
              ].map((item, i) => (
                <div key={i} className="rounded-[12px] border border-[#f2f4f6] bg-[#f9fafb] p-5">
                  <p className="mb-2 text-[12px] font-bold text-[#8b95a1]">{item.label}</p>
                  <p className={`text-[17px] font-bold ${item.highlight ? "text-[#0064ff]" : "text-[#191f28]"}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <section className="overflow-hidden rounded-[12px] border border-[#e5e8eb] bg-white p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                <div className="mb-6 flex items-center gap-2.5">
                  <ClipboardList className="h-5.5 w-5.5 text-[#0064ff]" />
                  <h3 className="text-[18px] font-bold text-[#191f28]">상세 견적 구성</h3>
                </div>

                <div className="overflow-hidden rounded-[12px] border border-[#f2f4f6]">
                  <table className="w-full text-left text-[14px]">
                    <tbody>
                      {[
                        { label: "제품명", value: request.product_name },
                        { label: "제조사", value: request.manufacturer_name },
                        { label: "용기/포장", value: request.container_name || "선택 안 함" },
                        { label: "디자인 구성", value: request.design_summary || "기본 선택" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-[#f2f4f6] last:border-none">
                          <td className="w-1/3 bg-[#f9fafb] px-6 py-4 font-bold text-[#4e5968]">{row.label}</td>
                          <td className="px-6 py-4 font-medium text-[#191f28]">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[12px] border border-[#e5e8eb] bg-white p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                <div className="mb-6 flex items-center gap-2.5">
                  <Info className="h-5.5 w-5.5 text-[#0064ff]" />
                  <h3 className="text-[18px] font-bold text-[#191f28]">요청사항</h3>
                </div>
                <div className="min-h-[160px] whitespace-pre-wrap rounded-[12px] border border-[#f2f4f6] bg-[#f9fafb] p-6 text-[15px] font-medium leading-relaxed text-[#4e5968]">
                  {request.request_note?.trim() || "별도 요청사항이 기록되지 않았습니다."}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="overflow-hidden rounded-[12px] border border-[#e5e8eb] bg-white p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                <div className="mb-6 flex items-center gap-2.5">
                  <UserRound className="h-5.5 w-5.5 text-[#0064ff]" />
                  <h3 className="text-[18px] font-bold text-[#191f28]">담당자 연락처</h3>
                </div>

                <div className="overflow-hidden rounded-[12px] border border-[#f2f4f6]">
                  <table className="w-full text-left text-[14px]">
                    <tbody>
                      {[
                        { label: "담당자명", value: request.contact_name },
                        { label: "이메일", value: request.contact_email },
                        { label: "연락처", value: request.contact_phone },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-[#f2f4f6] last:border-none">
                          <td className="w-[100px] bg-[#f9fafb] px-5 py-4 font-bold text-[#4e5968]">{row.label}</td>
                          <td className="break-all px-5 py-4 font-bold text-[#191f28]">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[12px] border border-[#e5e8eb] bg-white p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                <div className="mb-6 flex items-center gap-2.5">
                  <Link2 className="h-5.5 w-5.5 text-[#0064ff]" />
                  <h3 className="text-[18px] font-bold text-[#191f28]">공유 파일 링크</h3>
                </div>
                {request.has_files && request.file_link ? (
                  <div className="group">
                    <a
                      href={request.file_link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-[12px] border border-[#e1ecff] bg-[#f2f8ff] p-5 text-[14px] font-bold text-[#0064ff] transition-all hover:bg-[#0064ff] hover:text-white"
                    >
                      <Link2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{request.file_link}</span>
                    </a>
                  </div>
                ) : (
                  <div className="rounded-[12px] border border-[#f2f4f6] bg-[#f9fafb] p-6 text-center text-[14px] font-medium italic text-[#8b95a1]">
                    공유된 파일이 없습니다.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>

      {isRejectModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[520px] rounded-[20px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between border-b border-[#eaecf0] px-6 py-5">
              <h3 className="text-[18px] font-bold text-[#191f28]">거절 하시겠습니까?</h3>
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-full p-1.5 text-[#667085] transition hover:bg-[#f2f4f7]"
                aria-label="거절 사유 입력 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[14px] text-[#667085]">거절 사유를 입력하면 거절 내역에 함께 저장됩니다.</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거절 사유를 작성해 주세요."
                rows={5}
                className="mt-4 w-full resize-none rounded-[14px] border border-[#d0d5dd] px-4 py-3 text-[14px] outline-none transition focus:border-[#0064ff]"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] px-5 text-[14px] font-semibold text-[#344054] transition hover:bg-[#f8fafc]"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={updatingStatus === "rejected"}
                  onClick={() => void handleRejectSubmit()}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#dc2626] px-5 text-[14px] font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingStatus === "rejected" ? "처리 중..." : "거절 확정"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
