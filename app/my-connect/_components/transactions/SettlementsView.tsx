"use client";

import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { type InvoiceRecord } from "./types";
import { formatCurrencyDisplay, formatShortDate, PAGE_SIZE } from "./utils";
import { TransactionsToolbar } from "./Shared";

type SettlementsViewProps = {
  monthFilter: string;
  onMonthChange: (value: string) => void;
  selectedCurrency: string;
  currencyOptions: string[];
  onCurrencyChange: (value: string) => void;
  invoiceQuery: string;
  onInvoiceQueryChange: (value: string) => void;
  onDownload: () => void;
  pagedRecords: InvoiceRecord[];
  filteredRecordsLength: number;
  visiblePage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onQuotePreviewRequestChange: (request: InvoiceRecord["request"] | null) => void;
};

export function SettlementsView({
  monthFilter,
  onMonthChange,
  selectedCurrency,
  currencyOptions,
  onCurrencyChange,
  invoiceQuery,
  onInvoiceQueryChange,
  onDownload,
  pagedRecords,
  filteredRecordsLength,
  visiblePage,
  totalPages,
  setCurrentPage,
  onQuotePreviewRequestChange,
}: SettlementsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f6f8fb] p-4 lg:p-5">
      <div className="flex w-full max-w-[1600px] flex-col gap-4">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#1f2937]">정산 내역</h2>
          <p className="mt-1 text-[13px] text-[#667085]">정산 완료된 주문 내역입니다.</p>
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

        <div className="flex flex-col gap-3">
          {pagedRecords.length ? (
            pagedRecords.map((record) => (
              <article key={record.id} className="rounded-[14px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#16a34a]">정산 완료</span>
                      <span className="text-[11px] text-[#94a3b8]">{formatShortDate(record.settledAt || record.completedAt)}</span>
                    </div>
                    <h3 className="mt-2 text-[15px] font-bold tracking-[-0.02em] text-[#1f2937]">{record.request.product_name}</h3>
                    <p className="mt-1 text-[13px] font-medium text-[#667085]">
                      의뢰자 {record.request.contact_name} · {record.request.quantity.toLocaleString()}개
                    </p>
                    <button
                      type="button"
                      onClick={() => onQuotePreviewRequestChange(record.request)}
                      className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]"
                    >
                      {record.invoiceNumber}
                    </button>
                  </div>

                  <div className="min-w-[220px] text-right">
                    <p className="text-[11px] text-[#94a3b8]">총 매출</p>
                    <p className="mt-1.5 text-[15px] font-bold text-[#1f2937]">{formatCurrencyDisplay(record.gross, record.request.currency_code)}</p>
                    <p className="mt-2 text-[12px] font-semibold text-[#ff4d4f]">수수료 -{formatCurrencyDisplay(record.fee, record.request.currency_code)}</p>
                    <p className="mt-1 text-[11px] font-medium text-[#98a2b3]">{record.commissionRatePercent}% 적용</p>
                    <p className="mt-2 text-[17px] font-bold text-[#2563eb]">{formatCurrencyDisplay(record.net, record.request.currency_code)}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[14px] border border-dashed border-[#dbe3ef] bg-white px-6 py-16 text-center text-[14px] font-medium text-[#98a2b3]">
              표시할 정산 내역이 없습니다.
            </div>
          )}
        </div>

        {filteredRecordsLength > PAGE_SIZE ? (
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm">
            <MasterTablePagination
              totalItems={filteredRecordsLength}
              currentPage={visiblePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
