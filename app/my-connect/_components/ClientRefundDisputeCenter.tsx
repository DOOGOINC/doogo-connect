"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { formatRfqCurrency, getDisplayOrderNumber, type RfqRequestRow } from "@/lib/rfq";

interface ClientRefundDisputeCenterProps {
  refreshKey?: number;
  requests: RfqRequestRow[];
  onRefundConfirmed?: (request: RfqRequestRow) => void;
}

type ClientDispute = {
  id: string;
  dispute_number: string;
  counterparty_name: string;
  reason: string;
  amount: number;
  currency_code: string;
  status: "new" | "in_progress" | "resolved" | "disputing" | "refunded";
  created_at: string;
  detail: string | null;
  request_id: string | null;
};

const STATUS_LABELS: Record<ClientDispute["status"], string> = {
  new: "신규",
  in_progress: "해결중",
  resolved: "해결됨",
  disputing: "분쟁중",
  refunded: "환불완료",
};

const ELIGIBLE_STATUSES = [
  "payment_completed",
  "production_waiting",
  "production_started",
  "ordered",
  "production_in_progress",
  "manufacturing_completed",
  "completed",
  "delivery_completed",
] as const;

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRequestOption(request: RfqRequestRow) {
  return [
    formatDate(request.created_at),
    ` ${request.request_number}`,
    ` ${getDisplayOrderNumber(request)}`,
    request.product_name,
    `${request.quantity.toLocaleString()}개`,
    formatRfqCurrency(request.total_price, request.currency_code),
  ].join(" / ");
}

export function ClientRefundDisputeCenter({ refreshKey = 0, requests, onRefundConfirmed }: ClientRefundDisputeCenterProps) {
  const [disputes, setDisputes] = useState<ClientDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [promptedResolvedIds, setPromptedResolvedIds] = useState<Set<string>>(() => new Set());

  const shouldAutoPromptResolvedRefund = false;

  const eligibleRequests = useMemo(
    () => requests.filter((request) => (ELIGIBLE_STATUSES as readonly string[]).includes(request.status)),
    [requests]
  );
  const requestMap = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/disputes");
      const payload = (await response.json()) as { error?: string; disputes?: ClientDispute[] };

      if (!response.ok) {
        throw new Error(payload.error || "분쟁 내역을 불러오지 못했습니다.");
      }

      setDisputes(payload.disputes || []);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "분쟁 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes, refreshKey]);

  useEffect(() => {
    const target = disputes.find((dispute) => shouldAutoPromptResolvedRefund && dispute.status === "resolved" && dispute.request_id && !promptedResolvedIds.has(dispute.id));
    if (!target) return;

    setPromptedResolvedIds((prev) => new Set(prev).add(target.id));
    const confirmed = window.confirm("환불이 정상적으로 진행되었나요?");
    if (!confirmed) return;

    const confirmRefund = async () => {
      const response = await authFetch(`/api/disputes/${target.id}/confirm-refund`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; request?: RfqRequestRow };
      if (!response.ok || !payload.request) {
        window.alert(payload.error || "환불 상태 변경에 실패했습니다.");
        return;
      }

      onRefundConfirmed?.(payload.request);
      setDisputes((prev) => prev.map((dispute) => (dispute.id === target.id ? { ...dispute, status: "refunded" } : dispute)));
    };

    void confirmRefund();
  }, [disputes, onRefundConfirmed, promptedResolvedIds, shouldAutoPromptResolvedRefund]);

  const openModal = () => {
    if (!eligibleRequests.length) {
      window.alert("결제 완료된 거래만 분쟁 신청할 수 있습니다.");
      return;
    }
    setSelectedRequestId(eligibleRequests[0]?.id || "");
    setReason("");
    setDetail("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    const trimmedDetail = detail.trim();

    if (!trimmedReason) {
      window.alert("분쟁 사유를 입력해 주세요.");
      return;
    }

    if (!trimmedDetail) {
      window.alert("상세 내용을 입력해 주세요.");
      return;
    }

    if (!selectedRequestId) {
      window.alert("관련 거래를 선택해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await authFetch("/api/disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequestId,
          reason: trimmedReason,
          detail: trimmedDetail,
        }),
      });
      const payload = (await response.json()) as { error?: string; dispute?: ClientDispute };

      if (!response.ok) {
        throw new Error(payload.error || "분쟁 신청에 실패했습니다.");
      }

      if (payload.dispute) {
        setDisputes((prev) => [payload.dispute as ClientDispute, ...prev]);
      } else {
        await fetchDisputes();
      }

      setModalOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "분쟁 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f7f8fa] px-8 py-6">
      <section>
        <h1 className="text-[20px] font-bold text-[#111827]">환불 / 취소 / 분쟁</h1>
        <p className="mt-5 text-[14px] font-medium text-[#6b7280]">
          제조 중단 또는 제조사 귀책 사유 발생 시 두고커넥트가 분쟁 처리를 도와드립니다.
        </p>
      </section>

      <section className="mt-8 rounded-[16px] border border-[#fde68a] bg-[#fffdf2] px-5 py-4">
        <div className="flex items-center gap-4 text-[14px] font-bold text-[#9a5a1f]">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#f59e0b]" />
          <p>
            제조가 중단되었거나 제조를 완료하지 못한 경우, 두고커넥트 고객센터에 분쟁 신청을 할 수 있습니다. 결제 금액은 에스크로 보안을 통해 보호됩니다.
          </p>
        </div>
      </section>

      <section className="mt-7 rounded-[14px] border border-[#eef1f5] bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[230px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#d1d5db]" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
            <div className="flex h-13 w-13 items-center justify-center rounded-full border-4 border-[#d7dce4] text-[#d1d5db]">
              <AlertCircle className="h-7 w-7" />
            </div>
            <p className="mt-5 text-[15px] font-bold text-[#98a2b3]">진행 중인 환불/분쟁 건이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead>
                <tr className="border-b border-[#eef1f5] text-[12px] font-bold text-[#344054]">
                  <th className="px-5 py-3">분쟁번호</th>
                  <th className="px-5 py-3">신청일</th>
                  <th className="px-5 py-3">상대방</th>
                  <th className="px-5 py-3">사유</th>
                  <th className="px-5 py-3">금액</th>
                  <th className="px-5 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr key={dispute.id} className="border-b border-[#f5f7fa] last:border-b-0">
                    <td className="px-5 py-3 text-[12px] text-[#4b5563]">{dispute.dispute_number}</td>
                    <td className="px-5 py-3 text-[12px] font-medium text-[#6b7280]">{formatDate(dispute.created_at)}</td>
                    <td className="px-5 py-3 text-[12px] font-bold text-[#374151]">{dispute.counterparty_name}</td>
                    <td className="px-5 py-3 text-[12px] font-medium text-[#4b5563]">{dispute.reason}</td>
                    <td className="px-5 py-3 text-[12px] font-bold text-[#e11d48]">{formatRfqCurrency(dispute.amount, dispute.currency_code)}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-[12px] font-bold text-[#2563eb]">
                        {STATUS_LABELS[dispute.status]}
                      </span>
                      {dispute.status === "resolved" &&
                        dispute.request_id &&
                        requestMap.get(dispute.request_id)?.status !== "fulfilled" &&
                        requestMap.get(dispute.request_id)?.status !== "refunded" ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm("환불이 정상적으로 진행되었나요?")) return;
                            const response = await authFetch(`/api/disputes/${dispute.id}/confirm-refund`, { method: "POST" });
                            const payload = (await response.json()) as { error?: string; request?: RfqRequestRow };
                            if (!response.ok || !payload.request) {
                              window.alert(payload.error || "환불 상태 변경에 실패했습니다.");
                              return;
                            }
                            onRefundConfirmed?.(payload.request);
                            setDisputes((prev) => prev.map((item) => (item.id === dispute.id ? { ...item, status: "refunded" } : item)));
                          }}
                          className="ml-2 rounded-full bg-[#e11d48] px-3 py-1 text-[12px] font-bold text-white"
                        >
                          환불 확인
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={openModal}
          className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#fecaca] bg-white px-3 text-[14px] font-semibold text-[#ef4444] transition hover:bg-[#fff5f5]"
        >
          <AlertCircle className="h-4 w-4" />
          분쟁 신청하기
        </button>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-[720px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between border-b border-[#eef1f5] px-6 py-5">
              <h2 className="text-[20px] font-bold text-[#111827]">분쟁 신청하기</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-[#8b95a1] transition hover:bg-[#f2f4f7] hover:text-[#111827]"
                aria-label="분쟁 신청 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-[#4e5968]">관련 거래</label>
                  <select
                    value={selectedRequestId}
                    onChange={(event) => setSelectedRequestId(event.target.value)}
                    className="h-12 w-full rounded-[14px] border border-[#d8e0e8] bg-white px-4 text-[14px] font-medium text-[#111827] outline-none focus:border-[#ef4444] focus:ring-4 focus:ring-[#ef4444]/10"
                  >
                    <option value="">거래 선택 안 함</option>
                    {eligibleRequests.map((request) => (
                      <option key={request.id} value={request.id}>
                        {formatRequestOption(request)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-bold text-[#4e5968]">사유</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="예: 제조 중단, 납기 지연, 수량 부족 납품"
                    className="h-12 w-full rounded-[14px] border border-[#d8e0e8] bg-white px-4 text-[14px] font-medium text-[#111827] outline-none focus:border-[#ef4444] focus:ring-4 focus:ring-[#ef4444]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-bold text-[#4e5968]">상세 내용</label>
                  <textarea
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    placeholder="분쟁 신청 내용을 자세히 입력해 주세요."
                    className="h-32 w-full resize-none rounded-[14px] border border-[#d8e0e8] bg-white px-4 py-3 text-[14px] font-medium text-[#111827] outline-none focus:border-[#ef4444] focus:ring-4 focus:ring-[#ef4444]/10"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-[12px] border border-[#d8e0e8] bg-white px-5 text-[14px] font-bold text-[#4e5968] transition hover:bg-[#f8fafc]"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#ef4444] px-5 text-[14px] font-bold text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  신청하기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
