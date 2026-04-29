"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { formatRfqCurrency, type RfqRequestRow } from "@/lib/rfq";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";

type TradeSupportDispute = {
  id: string;
  dispute_number: string;
  applicant_name: string;
  counterparty_name: string;
  reason: string;
  amount: number;
  currency_code: string;
  status: "new" | "in_progress" | "resolved" | "disputing" | "refunded";
  created_at: string;
  request_id: string | null;
};

const PAGE_SIZE = 10;
const STATUS_LABELS: Record<TradeSupportDispute["status"], string> = {
  new: "신규",
  in_progress: "해결중",
  resolved: "해결됨",
  disputing: "분쟁중",
  refunded: "환불완료",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ManufacturerTradeSupport({ refreshKey = 0, requests }: { refreshKey?: number; requests: RfqRequestRow[] }) {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<TradeSupportDispute[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchDisputes = async () => {
      setLoading(true);
      try {
        const response = await authFetch("/api/disputes?scope=manufacturer");
        const payload = (await response.json()) as { disputes?: TradeSupportDispute[] };
        if (response.ok) {
          setDisputes(payload.disputes || []);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchDisputes();
  }, [refreshKey]);

  const requestMap = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);
  const totalPages = Math.max(1, Math.ceil(disputes.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedDisputes = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return disputes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [disputes, visiblePage]);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f7f8fa] px-6 py-5">
      <header>
        <h1 className="text-[20px] font-bold text-[#111827]">환불/취소 내역</h1>
        <p className="mt-2 text-[12px] font-medium text-[#6b7280]">분쟁 또는 특수 상황에서 발생한 환불/취소 건입니다.</p>
      </header>

      <section className="mt-6 overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[230px] items-center justify-center text-[13px] font-bold text-[#98a2b3]">불러오는 중입니다.</div>
        ) : disputes.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0fdf4]">
              <div className="text-[28px]">🛡️</div>
            </div>
            <p className="mt-5 text-[15px] font-bold text-[#111827]">환불/취소 내역이 없습니다</p>
            <p className="mt-3 text-[13px] font-semibold text-[#9ca3af]">이 메뉴는 분쟁 또는 특수 상황에서 발생한 건들이 표시됩니다.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full table-fixed text-left">
                <thead className="bg-[#fbfcfd]">
                  <tr className="text-[12px] font-bold text-[#6b7280]">
                    <th className="px-4 py-3">분쟁번호</th>
                    <th className="px-4 py-3">날짜</th>
                    <th className="px-4 py-3">의뢰자</th>
                    <th className="px-4 py-3">제품</th>
                    <th className="px-4 py-3">사유</th>
                    <th className="px-4 py-3">금액</th>
                    <th className="px-4 py-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDisputes.map((dispute) => {
                    const request = dispute.request_id ? requestMap.get(dispute.request_id) : null;
                    return (
                      <tr key={dispute.id} className="border-t border-[#f2f4f6] text-[12px] text-[#374151]">
                        <td className="px-4 py-3 font-semibold">{dispute.dispute_number}</td>
                        <td className="px-4 py-3 text-[#6b7280]">{formatDate(dispute.created_at)}</td>
                        <td className="px-4 py-3 font-bold">{dispute.applicant_name}</td>
                        <td className="px-4 py-3">{request?.product_name || "-"}</td>
                        <td className="truncate px-4 py-3" title={dispute.reason}>{dispute.reason}</td>
                        <td className="px-4 py-3 font-bold text-[#e11d48]">{formatRfqCurrency(dispute.amount, dispute.currency_code)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[12px] font-bold text-[#2563eb]">
                            {STATUS_LABELS[dispute.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <MasterTablePagination totalItems={disputes.length} currentPage={visiblePage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </section>
    </div>
  );
}
