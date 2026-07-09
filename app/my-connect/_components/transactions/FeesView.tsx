"use client";

import { CheckCircle2, Info } from "lucide-react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { ClientQuotePreviewModal } from "../ClientQuotePreviewModal";
import { type InvoiceRecord, type SummaryMetricCard } from "./types";
import { MONTH_NAMES, PAGE_SIZE, formatCurrencyDisplay, formatShortDate, getMonthKey, getEffectiveFeeMonthKeyFromMap } from "./utils";

type FeesViewProps = {
  currentYear: number;
  selectedFeeMonth: number;
  setSelectedFeeMonth: (month: number) => void;
  transactionSummaryRecords: InvoiceRecord[];
  closedMonthMap: Record<string, string>;
  feeMetricCards: SummaryMetricCard[];
  feeMonthClosed: boolean;
  feeMonthRequestable: boolean;
  requestSubmitting: boolean;
  onConfirmFeeSettlement: () => Promise<void>;
  pagedFeeRecords: InvoiceRecord[];
  feeMonthRecordsLength: number;
  feeTotalPages: number;
  visibleFeePage: number;
  setFeePage: (page: number) => void;
  quotePreviewRequest: InvoiceRecord["request"] | null;
  onQuotePreviewRequestChange: (request: InvoiceRecord["request"] | null) => void;
};

export function FeesView({
  currentYear,
  selectedFeeMonth,
  setSelectedFeeMonth,
  transactionSummaryRecords,
  closedMonthMap,
  feeMetricCards,
  feeMonthClosed,
  feeMonthRequestable,
  requestSubmitting,
  onConfirmFeeSettlement,
  pagedFeeRecords,
  feeMonthRecordsLength,
  feeTotalPages,
  visibleFeePage,
  setFeePage,
  quotePreviewRequest,
  onQuotePreviewRequestChange,
}: FeesViewProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[#f6f8fb] p-4 lg:p-5">
        <div className="flex w-full max-w-[1600px] flex-col gap-4">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-[#1f2937]">수수료 내역</h2>
            <p className="mt-1 text-[13px] text-[#667085]">거래별 확정 수수료 내역입니다.</p>
          </div>

          <section className="rounded-[20px] border border-[#d8e9ff] bg-[#eff5ff] px-5 py-4 text-[#2f6bff] shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-white/80 p-1.5">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-extrabold">수수료 정산 안내</p>
                <p className="mt-1.5 text-[13px] font-medium">
                  매월 1일 ~ 말일까지의 수수료를 다음 달 3일 이내에 두고커넥트 계좌로 입금해주세요. 구매 확정 완료 시 총 거래 금액의 수수료로 부과됩니다.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#667085]">월별 조회</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
              {MONTH_NAMES.map((month) => {
                const monthKey = getMonthKey(currentYear, month);
                const monthRecords = transactionSummaryRecords.filter(
                  (record) => getEffectiveFeeMonthKeyFromMap(record.completedAt, closedMonthMap) === monthKey
                );
                const isSelected = selectedFeeMonth === month;
                const isClosed = Boolean(closedMonthMap[monthKey]);

                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => setSelectedFeeMonth(month)}
                    className={`relative rounded-[16px] border px-4 py-3 text-center text-[15px] font-bold transition ${
                      isSelected
                        ? "border-[#2563eb] bg-[#2563eb] text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)]"
                        : isClosed
                          ? "border-[#b7f0ca] bg-[#effaf4] text-[#16a34a]"
                          : "border-[#f1f5f9] bg-[#f8fafc] text-[#98a2b3]"
                    }`}
                  >
                    {isClosed ? (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#03c75a] p-1 text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    <div>{month}월</div>
                    <div className={`mt-1 text-[11px] font-semibold ${isSelected ? "text-white/85" : isClosed ? "text-[#16a34a]" : "text-[#98a2b3]"}`}>
                      {monthRecords.length}건
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={`grid gap-3 ${feeMetricCards.length >= 4 ? "xl:grid-cols-4" : feeMetricCards.length === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
            {feeMetricCards.length ? (
              feeMetricCards.map((card) => (
                <article key={card.key} className="rounded-[20px] border border-[#e5e7eb] bg-white px-5 py-5 text-center shadow-sm">
                  <p className="text-[13px] font-semibold text-[#8b95a1]">{card.label}</p>
                  <p className={`mt-2.5 text-[24px] font-bold ${card.color}`}>{formatCurrencyDisplay(card.value, card.currencyCode)}</p>
                </article>
              ))
            ) : (
              <article className="rounded-[20px] border border-dashed border-[#dbe3ef] bg-white px-5 py-10 text-center text-[14px] font-medium text-[#98a2b3] xl:col-span-3">
                선택한 월의 수수료 요약이 없습니다.
              </article>
            )}

            <article className="rounded-[20px] border border-[#e5e7eb] bg-white px-5 py-5 text-center shadow-sm">
              <p className="text-[13px] font-semibold text-[#8b95a1]">정산 상태</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    void onConfirmFeeSettlement();
                  }}
                  disabled={!feeMonthRequestable || requestSubmitting}
                  className={`inline-flex rounded-full px-6 py-2.5 text-[13px] font-bold transition ${
                    feeMonthClosed
                      ? "bg-[#03c75a] text-white"
                      : feeMonthRequestable
                        ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                        : "bg-[#e5e7eb] text-[#98a2b3]"
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  {feeMonthClosed ? "정산완료" : "이번달 정산완료"}
                </button>
              </div>
            </article>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#f1f5f9] px-5 py-4">
              <h3 className="text-[17px] font-bold text-[#1f2937]">{selectedFeeMonth}월 거래별 수수료 내역</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full table-fixed">
                <thead className="bg-[#fbfcfd] text-[11px] font-semibold text-[#667085]">
                  <tr>
                    <th className="w-[130px] px-5 py-3 text-left">날짜</th>
                    <th className="px-4 py-3 text-left">거래 내역</th>
                    <th className="w-[160px] px-4 py-3 text-right">매출 금액</th>
                    <th className="w-[160px] px-4 py-3 text-right">수수료</th>
                    <th className="w-[140px] px-5 py-3 text-center">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] text-[12px] text-[#111827]">
                  {pagedFeeRecords.length ? (
                    pagedFeeRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-5 py-3.5 font-medium text-[#4b5563]">{formatShortDate(record.completedAt)}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#1f2937]">{record.request.product_name}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-[#1f2937]">{formatCurrencyDisplay(record.gross, record.request.currency_code)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-[#ff4d4f]">
                          <div className="flex flex-col items-end gap-0">
                            <span>{formatCurrencyDisplay(record.fee, record.request.currency_code)}</span>
                            <span className="text-[10px] font-medium text-[#98a2b3]">({record.commissionRatePercent}% 적용)</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                              record.request.is_settled
                                ? "bg-[#dcfce7] text-[#16a34a]"
                                : record.requestedAt
                                  ? "bg-[#ecfdf3] text-[#027a48]"
                                  : "bg-[#f3f4f6] text-[#6b7280]"
                            }`}
                          >
                            {record.request.is_settled ? "최종정산완료" : record.requestedAt ? "정산요청완료" : "정산대기"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center text-[13px] font-medium text-[#98a2b3]">
                        선택한 월의 수수료 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {feeMonthRecordsLength > PAGE_SIZE ? (
              <MasterTablePagination
                totalItems={feeMonthRecordsLength}
                currentPage={visibleFeePage}
                totalPages={feeTotalPages}
                onPageChange={setFeePage}
              />
            ) : null}
          </section>
        </div>
      </div>

      <ClientQuotePreviewModal
        request={quotePreviewRequest}
        open={Boolean(quotePreviewRequest)}
        onClose={() => onQuotePreviewRequestChange(null)}
      />
    </>
  );
}
