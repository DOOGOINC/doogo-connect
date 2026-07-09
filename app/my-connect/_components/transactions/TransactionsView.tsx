"use client";

import { FileText, StickyNote } from "lucide-react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { type InvoiceRecord, type SummaryMetricCard } from "./types";
import { PAGE_SIZE, formatCurrencyDisplay, formatPreciseCurrencyDisplay, formatShortDate, getTransactionStatusLabel, getTransactionStatusTone } from "./utils";
import { SummaryMetricGrid, TransactionsToolbar } from "./Shared";

type TransactionsViewProps = {
  monthFilter: string;
  onMonthChange: (value: string) => void;
  selectedCurrency: string;
  currencyOptions: string[];
  onCurrencyChange: (value: string) => void;
  invoiceQuery: string;
  onInvoiceQueryChange: (value: string) => void;
  onDownload: () => void;
  summaryMetricCards: SummaryMetricCard[];
  pagedRecords: InvoiceRecord[];
  filteredRecordsLength: number;
  visiblePage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onQuotePreviewRequestChange: (request: InvoiceRecord["request"] | null) => void;
  onMemoRequestChange: (request: InvoiceRecord["request"] | null) => void;
};

export function TransactionsView({
  monthFilter,
  onMonthChange,
  selectedCurrency,
  currencyOptions,
  onCurrencyChange,
  invoiceQuery,
  onInvoiceQueryChange,
  onDownload,
  summaryMetricCards,
  pagedRecords,
  filteredRecordsLength,
  visiblePage,
  totalPages,
  setCurrentPage,
  onQuotePreviewRequestChange,
  onMemoRequestChange,
}: TransactionsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f6f8fb] p-4 lg:p-5">
      <div className="flex w-full max-w-[1600px] flex-col gap-4">
        <div>
          <h2 className="text-[19px] font-bold tracking-tight text-[#1f2937]">거래 내역</h2>
          <p className="mt-1 text-[13px] text-[#667085]">완료된 거래 기준 매출 및 정산 정보입니다.</p>
        </div>

        <TransactionsToolbar
          monthFilter={monthFilter}
          onMonthChange={onMonthChange}
          selectedCurrency={selectedCurrency}
          currencyOptions={currencyOptions}
          onCurrencyChange={onCurrencyChange}
          invoiceQuery={invoiceQuery}
          onInvoiceQueryChange={onInvoiceQueryChange}
          onDownload={onDownload}
        />

        <SummaryMetricGrid cards={summaryMetricCards} emptyText="표시할 거래 요약이 없습니다." />

        <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1910px] table-fixed border-collapse text-left">
              <thead className="bg-[#fbfcfd] text-[11px] font-semibold text-[#667085]">
                <tr>
                  <th className="w-[110px] px-4 py-2.5 text-left">거래일</th>
                  <th className="w-[120px] px-4 py-2.5 text-left">의뢰자</th>
                  <th className="w-[230px] px-4 py-2.5 text-left">상품</th>
                  <th className="w-[80px] px-4 py-2.5 text-center">수량</th>
                  <th className="w-[140px] px-4 py-2.5 text-right">캡슐 원가</th>
                  <th className="w-[140px] px-4 py-2.5 text-right">캡슐 판매가</th>
                  <th className="w-[130px] px-4 py-2.5 text-right">박스비</th>
                  <th className="w-[140px] px-4 py-2.5 text-right">디자인비</th>
                  <th className="w-[145px] px-4 py-2.5 text-right">금액</th>
                  <th className="w-[150px] px-4 py-2.5 text-right">두고 수수료</th>
                  <th className="w-[160px] px-4 py-2.5 text-center">
                    <div className="flex items-start justify-end gap-1.5">

                      <span className="text-right leading-[1.25]">
                        파트너 수수료
                      </span>
                      <div className="group relative">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#d1d6db] text-[10px] font-bold text-[#8b95a1]">
                          ?
                        </span>
                        <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-[8px] bg-[#191f28] px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          파트너수수료 2% = 캡슐판매가 X 0.02 (only)
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="w-[140px] px-4 py-2.5 text-right">파트너사</th>
                  <th className="w-[150px] px-4 py-2.5 text-right">정산 (순수익)</th>
                  <th className="w-[100px] px-4 py-2.5 text-center">상태</th>
                  <th className="w-[150px] px-4 py-2.5 text-left">인보이스</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6] text-[12px] text-[#111827]">
                {pagedRecords.length ? (
                  pagedRecords.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-[#fcfdff]">
                      <td className="px-4 py-3 text-left font-medium text-[#4b5563]">{formatShortDate(record.completedAt)}</td>
                      <td className="px-4 py-3 text-left font-bold text-[#111827]">{record.request.contact_name}</td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="block whitespace-normal break-words font-medium leading-5 text-[#4b5563]" title={record.request.product_name}>
                            {record.request.product_name}
                          </span>
                          {record.hasStudentDiscount ? (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-[#fff4cc] px-2 py-0.5 text-[10px] font-semibold text-[#b7791f]">
                              수강생 10%
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-[#4b5563]">{record.request.quantity.toLocaleString()}개</td>
                      <td className="px-4 py-3 text-right font-medium text-[#4b5563]">{formatCurrencyDisplay(record.capsuleCost, record.request.currency_code)}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#4b5563]">{formatCurrencyDisplay(record.capsuleSalePrice, record.request.currency_code)}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#4b5563]">{formatCurrencyDisplay(record.boxPrice, record.request.currency_code)}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#4b5563]">{formatCurrencyDisplay(record.designPrice, record.request.currency_code)}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#111827]">{formatCurrencyDisplay(record.gross, record.request.currency_code)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#ff4d4f]">
                        <div className="flex flex-col items-end gap-0">
                          <span>{formatCurrencyDisplay(record.fee, record.request.currency_code)}</span>
                          <span className="text-[10px] font-medium text-[#98a2b3]">({record.commissionRatePercent}% 적용)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#111827]">
                        {record.partnerFee > 0 ? (
                          <div className="flex flex-col items-end gap-0">
                            <span>{formatPreciseCurrencyDisplay(record.partnerFee, record.request.currency_code)}</span>
                            <span className="text-[10px] font-medium text-[#98a2b3]">({record.partnerCommissionRatePercent}% 적용)</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#4b5563]">{record.partnerName || "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#2563eb]">{formatPreciseCurrencyDisplay(record.net, record.request.currency_code)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getTransactionStatusTone(record.request.status)}`}>
                          {getTransactionStatusLabel(record.request.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onQuotePreviewRequestChange(record.request)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]"
                          >
                            <FileText className="h-3 w-3" />
                            {record.invoiceNumber}
                          </button>
                          <button
                            type="button"
                            onClick={() => onMemoRequestChange(record.request)}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-[6px] border transition ${record.request.admin_memo?.trim()
                              ? "border-[#F4C84A] bg-[#F4C84A] text-white hover:bg-[#E0B435]"
                              : "border-[#E5E7EB] bg-[#F3F4F6] text-[#9CA3AF] hover:bg-[#E5E7EB]"
                              }`}
                            aria-label="메모 열기"
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} className="px-4 py-16 text-center text-[13px] font-medium text-[#98a2b3]">
                      표시할 거래 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRecordsLength > PAGE_SIZE ? (
            <MasterTablePagination
              totalItems={filteredRecordsLength}
              currentPage={visiblePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
