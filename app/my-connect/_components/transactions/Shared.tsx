"use client";

import { Calendar, Download, Search, X } from "lucide-react";
import { type RfqRequestRow } from "@/lib/rfq";
import { formatCurrencyDisplay, formatPreciseCurrencyDisplay } from "./utils";
import { type SummaryMetricCard } from "./types";

type TransactionsToolbarProps = {
  monthFilter: string;
  onMonthChange: (value: string) => void;
  selectedCurrency: string;
  currencyOptions: string[];
  onCurrencyChange: (value: string) => void;
  invoiceQuery: string;
  onInvoiceQueryChange: (value: string) => void;
  onDownload: () => void;
};

export function TransactionsToolbar({
  monthFilter,
  onMonthChange,
  selectedCurrency,
  currencyOptions,
  onCurrencyChange,
  invoiceQuery,
  onInvoiceQueryChange,
  onDownload,
}: TransactionsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-[#667085]">기간</span>
          <div className="flex h-10 min-w-[200px] items-center gap-3 rounded-[12px] border border-[#dbe3ef] bg-white px-3.5">
            <input
              type="month"
              value={monthFilter}
              onChange={(event) => onMonthChange(event.target.value)}
              className="w-full bg-transparent text-[13px] font-semibold text-[#111827] outline-none"
            />
            <Calendar className="h-4 w-4 text-[#111827]" />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-[#667085]">통화</span>
          <select
            value={selectedCurrency}
            onChange={(event) => onCurrencyChange(event.target.value)}
            className="h-10 min-w-[130px] rounded-[12px] border border-[#dbe3ef] bg-white px-3.5 text-[13px] font-semibold text-[#111827] outline-none"
          >
            {currencyOptions.map((currencyCode) => (
              <option key={currencyCode} value={currencyCode}>
                {currencyCode === "ALL" ? "전체 통화" : currencyCode}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-[#667085]">검색</span>
          <div className="flex h-10 min-w-[250px] items-center gap-3 rounded-[12px] border border-[#dbe3ef] bg-white px-3.5">
            <Search className="h-4 w-4 text-[#98a2b3]" />
            <input
              type="text"
              value={invoiceQuery}
              onChange={(event) => onInvoiceQueryChange(event.target.value)}
              placeholder="인보이스 번호"
              className="w-full bg-transparent text-[13px] text-[#111827] outline-none"
            />
          </div>
        </label>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-[12px] border border-[#dbe3ef] bg-white px-4 text-[13px] font-semibold text-[#111827] transition hover:bg-[#f8fafc] lg:self-auto"
      >
        <Download className="h-4 w-4" />
        엑셀 다운로드
      </button>
    </div>
  );
}

type SummaryMetricGridProps = {
  cards: SummaryMetricCard[];
  emptyText: string;
};

export function SummaryMetricGrid({ cards, emptyText }: SummaryMetricGridProps) {
  return (
    <div className={`grid gap-3 ${cards.length >= 4 ? "xl:grid-cols-4" : cards.length === 2 ? "xl:grid-cols-2" : "lg:grid-cols-3"}`}>
      {cards.length ? (
        cards.map((card) => (
          <div key={card.key} className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 text-center shadow-sm">
            <p className="text-[13px] font-semibold text-[#8b95a1]">{card.label}</p>
            <p className={`mt-2.5 text-[22px] font-bold ${card.color}`}>
              {card.precise ? formatPreciseCurrencyDisplay(card.value, card.currencyCode) : formatCurrencyDisplay(card.value, card.currencyCode)}
            </p>
          </div>
        ))
      ) : (
        <div className="rounded-[14px] border border-dashed border-[#dbe3ef] bg-white px-6 py-12 text-center text-[14px] font-medium text-[#98a2b3] lg:col-span-3">
          {emptyText}
        </div>
      )}
    </div>
  );
}

type MemoModalProps = {
  memoRequest: RfqRequestRow | null;
  memoDraft: string;
  memoSaving: boolean;
  onMemoDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function MemoModal({ memoRequest, memoDraft, memoSaving, onMemoDraftChange, onClose, onSave }: MemoModalProps) {
  if (!memoRequest) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-end bg-black/50 px-6 py-6">
      <div className="w-full max-w-[420px] rounded-[14px] border border-[#F4D470] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between rounded-t-[14px] bg-[#fff2c3] px-5 py-4">
          <h3 className="text-[18px] font-bold text-[#3B2F1D]">메모</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#3B2F1D] transition hover:bg-white/40"
            aria-label="메모 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={memoDraft}
            onChange={(event) => onMemoDraftChange(event.target.value)}
            placeholder="메모를 입력해주세요."
            className="h-[160px] min-h-[120px] w-full resize-y rounded-[14px] border border-[#F4D470] bg-[#fff2c3] px-4 py-3 text-[15px] leading-7 text-[#3B2F1D] outline-none placeholder:text-[#A88A44] focus:border-[#E0B435]"
          />

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={memoSaving}
              className="inline-flex h-11 min-w-[100px] items-center justify-center rounded-[14px] bg-[#F3F4F6] px-5 text-[15px] font-semibold text-[#344054] transition hover:bg-[#E5E7EB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={memoSaving}
              className="inline-flex h-11 min-w-[100px] items-center justify-center rounded-[14px] bg-[#F4C84A] px-5 text-[15px] font-bold text-white transition hover:bg-[#E0B435] disabled:cursor-not-allowed disabled:opacity-60"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
