"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Download, FileText, Search, X, ArrowUpDown } from "lucide-react";
import { formatRfqCurrency, formatRfqDateTime, getDisplayOrderNumber, type RfqRequestRow } from "@/lib/rfq";
import { authFetch } from "@/lib/client/auth-fetch";

interface TransactionsSettlementProps {
  requests: RfqRequestRow[];
}

type SettlementTab = "transactions" | "settlements";
type SortKey = keyof InvoiceRecord | "created_at" | "gross" | "net";
type SortDirection = "asc" | "desc";

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  request: RfqRequestRow;
  gross: number;
  commissionRatePercent: number;
  fee: number;
  net: number;
};

const createInvoiceNumber = (request: RfqRequestRow) => {
  const date = new Date(request.created_at);
  const year = date.getFullYear();
  const serial = getDisplayOrderNumber(request).replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `INV-${year}-${serial}`;
};

export function TransactionsSettlement({ requests }: TransactionsSettlementProps) {
  const [activeTab, setActiveTab] = useState<SettlementTab>("transactions");
  const [commissionRatePercent, setCommissionRatePercent] = useState(3);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({
    key: "created_at",
    direction: "desc",
  });
  const feeRate = commissionRatePercent / 100;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await authFetch("/api/points/summary");
        const payload = (await response.json()) as { commissionRatePercent?: number };
        if (response.ok) {
          setCommissionRatePercent(Number(payload.commissionRatePercent || 3));
        }
      } catch (error) {
        console.error("Failed to load commission settings:", error);
      }
    };

    void fetchSettings();
  }, []);

  const invoiceRecords = useMemo<InvoiceRecord[]>(
    () =>
      requests
        .filter((request) => request.status === "fulfilled")
        .map((request) => {
          const gross = Number(request.total_price);
          const storedFee = Number(request.commission_amount);
          const storedNet = Number(request.settlement_amount);
          const rate = Number(request.commission_rate_percent || commissionRatePercent);
          const fee = Number.isFinite(storedFee) && storedFee > 0 ? storedFee : gross * (rate / 100 || feeRate);
          const net = Number.isFinite(storedNet) && storedNet > 0 ? storedNet : gross - fee;

          return {
            id: request.id,
            invoiceNumber: createInvoiceNumber(request),
            request,
            gross,
            commissionRatePercent: rate,
            fee,
            net,
          };
        }),
    [commissionRatePercent, feeRate, requests]
  );

  const processedInvoices = useMemo(() => {
    const filtered = invoiceRecords.filter((record) => {
      const matchesMonth = !monthFilter || record.request.created_at.startsWith(monthFilter);
      const query = invoiceQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        record.invoiceNumber.toLowerCase().includes(query) ||
        record.request.contact_name.toLowerCase().includes(query) ||
        record.request.product_name.toLowerCase().includes(query);
      return matchesMonth && matchesQuery;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortConfig.key === "created_at") {
        aValue = new Date(a.request.created_at).getTime();
        bValue = new Date(b.request.created_at).getTime();
      } else if (sortConfig.key === "gross") {
        aValue = a.gross;
        bValue = b.gross;
      } else if (sortConfig.key === "net") {
        aValue = a.net;
        bValue = b.net;
      } else if (sortConfig.key === "fee") {
        aValue = a.fee;
        bValue = b.fee;
      } else if (sortConfig.key === "invoiceNumber") {
        aValue = a.invoiceNumber;
        bValue = b.invoiceNumber;
      } else {
        aValue = String(a[sortConfig.key as keyof InvoiceRecord] || "");
        bValue = String(b[sortConfig.key as keyof InvoiceRecord] || "");
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [invoiceRecords, invoiceQuery, monthFilter, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey: SortKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 text-[#0064ff]" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-[#0064ff]" />
    );
  };

  const totalsByCurrency = useMemo(() => {
    const groups: Record<string, { gross: number; fee: number; net: number }> = {};

    processedInvoices.forEach((record) => {
      const cc = record.request.currency_code || "USD";
      if (!groups[cc]) {
        groups[cc] = { gross: 0, fee: 0, net: 0 };
      }
      groups[cc].gross += record.gross;
      groups[cc].fee += record.fee;
      groups[cc].net += record.net;
    });

    return groups;
  }, [processedInvoices]);

  const activeCurrencies = Object.keys(totalsByCurrency);

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[#f6f8fb] p-5 lg:p-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
          <div className="shrink-0">
            <h2 className="text-[24px] font-bold tracking-tight text-[#1f2937]">거래/정산</h2>
            <p className="mt-1.5 text-[14px] text-[#667085]">거래 완료된 주문을 기준으로 통화별 거래와 정산 내역을 확인합니다.</p>
          </div>

          <div className="inline-flex w-fit shrink-0 rounded-[16px] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            {[
              { id: "transactions", label: "거래 내역" },
              { id: "settlements", label: "정산 내역" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as SettlementTab)}
                  className={`rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition lg:px-5 lg:text-[14px] ${
                    isActive ? "bg-[#0f172a] text-white" : "text-[#475467] hover:bg-[#f2f4f7]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-5 rounded-[20px] border border-[#e7ecf3] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-[22px] font-bold text-[#1f2937]">{activeTab === "transactions" ? "거래 내역" : "정산 내역"}</h3>
                <p className="mt-1 text-[14px] text-[#667085]">
                  {activeTab === "transactions" ? "월별 거래 내역을 화폐 단위별로 확인하세요." : "거래 완료된 건에 대한 통화별 정산 내역입니다."}
                </p>
              </div>
              {activeTab === "transactions" ? (
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-[#d7dde7] bg-white px-4 text-[14px] font-semibold text-[#1f2937] shadow-sm transition hover:bg-[#f8fafc]"
                >
                  <Download className="h-4 w-4" />
                  엑셀 다운로드
                </button>
              ) : null}
            </div>

            {activeTab === "transactions" ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 rounded-[18px] border border-[#eaecf0] bg-[#fbfcfd] p-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold text-[#667085]">기간</span>
                      <div className="flex h-11 items-center gap-2 rounded-[14px] border border-[#d7dde7] bg-white px-4">
                        <Calendar className="h-4 w-4 text-[#98a2b3]" />
                        <input
                          type="month"
                          value={monthFilter}
                          onChange={(e) => setMonthFilter(e.target.value)}
                          className="bg-transparent text-[14px] font-semibold text-[#1f2937] outline-none"
                        />
                      </div>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold text-[#667085]">내역 검색</span>
                      <div className="flex h-11 items-center gap-2 rounded-[14px] border border-[#d7dde7] bg-white px-4">
                        <Search className="h-4 w-4 text-[#98a2b3]" />
                        <input
                          type="text"
                          value={invoiceQuery}
                          onChange={(e) => setInvoiceQuery(e.target.value)}
                          placeholder="인보이스 번호, 의뢰자, 상품명"
                          className="w-[280px] bg-transparent text-[14px] text-[#1f2937] outline-none"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeCurrencies.length > 0 ? (
                    activeCurrencies.map((cc) => (
                      <div key={cc} className="overflow-hidden rounded-[22px] border border-[#e7ecf3] bg-white shadow-sm">
                        <div className="bg-[#f8fafc] px-6 py-3 border-b border-[#e7ecf3]">
                          <span className="text-[13px] font-black text-[#0064FF] uppercase">{cc} 매출 요약</span>
                        </div>
                        <div className="grid gap-0 lg:grid-cols-3 divide-x divide-[#f2f4f6]">
                          {[
                            { label: "총 매출", value: formatRfqCurrency(totalsByCurrency[cc].gross, cc), color: "text-[#1f2937]" },
                            { label: "수수료 합계", value: formatRfqCurrency(totalsByCurrency[cc].fee, cc), color: "text-[#ff4d4f]" },
                            { label: "순 정산 금액", value: formatRfqCurrency(totalsByCurrency[cc].net, cc), color: "text-[#2563eb]" },
                          ].map((stat) => (
                            <div key={stat.label} className="px-6 py-5 text-center">
                              <p className="text-[13px] font-bold text-[#98a2b3]">{stat.label}</p>
                              <p className={`mt-2 text-[20px] font-black ${stat.color}`}>{stat.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : null}
                </div>

                <div className="overflow-x-auto rounded-[20px] border border-[#e7ecf3] bg-white shadow-sm">
                  <table className="w-full min-w-[1200px] table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-[#fbfcfd] text-[11px] font-bold uppercase tracking-wider text-[#667085] shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                      <tr>
                        <th className="w-[180px] cursor-pointer px-6 py-4 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("created_at")}>
                          <div className="flex items-center">접수 일시 {renderSortIcon("created_at")}</div>
                        </th>
                        <th className="w-[150px] px-6 py-4 transition-colors hover:bg-[#f9fafb]">의뢰자</th>
                        <th className="w-[240px] px-6 py-4 transition-colors hover:bg-[#f9fafb]">상품</th>
                        <th className="w-[120px] px-6 py-4 transition-colors hover:bg-[#f9fafb]">수량</th>
                        <th className="w-[150px] cursor-pointer px-6 py-4 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("gross")}>
                          <div className="flex items-center">총액 {renderSortIcon("gross")}</div>
                        </th>
                        <th className="w-[150px] px-6 py-4 transition-colors hover:bg-[#f9fafb]">수수료</th>
                        <th className="w-[150px] cursor-pointer px-6 py-4 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("net")}>
                          <div className="flex items-center">순 정산 {renderSortIcon("net")}</div>
                        </th>
                        <th className="w-[130px] px-6 py-4 transition-colors hover:bg-[#f9fafb]">상태</th>
                        <th className="w-[200px] cursor-pointer px-6 py-4 transition-colors hover:bg-[#f9fafb]" onClick={() => requestSort("invoiceNumber")}>
                          <div className="flex items-center">인보이스 {renderSortIcon("invoiceNumber")}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f4f6]">
                      {processedInvoices.length ? (
                        processedInvoices.map((record) => (
                          <tr key={record.id} className="align-middle text-[14px] text-[#1f2937] transition-colors hover:bg-[#fcfdff]">
                            <td className="px-6 py-5 font-mono text-[12px] font-medium text-[#8b95a1]">{formatRfqDateTime(record.request.created_at)}</td>
                            <td className="px-6 py-5 font-bold text-[#191f28]">{record.request.contact_name}</td>
                            <td className="px-6 py-5">
                              <span className="block truncate font-bold text-[#4e5968]" title={record.request.product_name}>{record.request.product_name}</span>
                            </td>
                            <td className="px-6 py-5 font-bold text-[#191f28]">{record.request.quantity.toLocaleString()}개</td>
                            <td className="px-6 py-5 font-bold text-[#191f28]">{formatRfqCurrency(record.gross, record.request.currency_code)}</td>
                            <td className="px-6 py-5 font-bold text-[#ff4d4f]">
                              {formatRfqCurrency(record.fee, record.request.currency_code)}
                              <span className="ml-1 text-[11px] text-[#98a2b3]">({record.commissionRatePercent}%)</span>
                            </td>
                            <td className="px-6 py-5 font-black text-[#2563eb]">{formatRfqCurrency(record.net, record.request.currency_code)}</td>
                            <td className="px-6 py-5">
                              <span className="inline-flex rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#16a34a]">정산 완료</span>
                            </td>
                            <td className="px-6 py-5">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(record)}
                                className="inline-flex items-center gap-2 text-[13px] font-bold text-[#2563eb] transition hover:text-[#1d4ed8]"
                              >
                                <FileText className="h-4 w-4" />
                                {record.invoiceNumber}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center">
                              <Search className="mb-4 h-10 w-10 text-[#e5e8eb]" />
                              <p className="text-[15px] font-bold text-[#8b95a1]">표시할 거래 내역이 없습니다.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {processedInvoices.length ? (
                  processedInvoices.map((record) => (
                    <article key={record.id} className="rounded-[18px] border border-[#e7ecf3] bg-white px-6 py-5 shadow-sm">
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[12px] font-semibold text-[#16a34a]">정산 완료</span>
                            <span className="text-[13px] font-semibold text-[#98a2b3]">{formatRfqDateTime(record.request.created_at)}</span>
                          </div>
                          <h4 className="mt-4 text-[18px] font-bold text-[#1f2937]">{record.request.product_name}</h4>
                          <p className="mt-2 text-[15px] text-[#667085]">의뢰자: {record.request.contact_name} · {record.request.quantity.toLocaleString()}개</p>
                        </div>
                        <div className="min-w-[150px] text-right">
                          <p className="text-[13px] font-semibold text-[#98a2b3]">총 매출</p>
                          <p className="mt-1 text-[18px] font-bold text-[#1f2937]">{formatRfqCurrency(record.gross, record.request.currency_code)}</p>
                          <p className="mt-2 text-[14px] font-semibold text-[#ff4d4f]">수수료({record.commissionRatePercent}%) -{formatRfqCurrency(record.fee, record.request.currency_code)}</p>
                          <p className="mt-2 text-[18px] font-bold text-[#2563eb]">{formatRfqCurrency(record.net, record.request.currency_code)}</p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#d7dde7] bg-white px-6 py-16 text-center text-[14px] text-[#98a2b3]">
                    표시할 정산 내역이 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedInvoice ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[760px] rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#eaecf0] px-6 py-5">
              <div>
                <h3 className="text-[18px] font-bold text-[#1f2937]">인보이스</h3>
                <p className="mt-1 text-[13px] text-[#667085]">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-full p-1.5 text-[#667085] transition hover:bg-[#f2f4f7]"
                aria-label="인보이스 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              <div className="rounded-[18px] border border-[#e7ecf3] bg-[#fbfcfd] p-5">
                <div className="flex items-start justify-between gap-6 border-b border-[#e7ecf3] pb-5">
                  <div>
                    <p className="text-[13px] font-semibold text-[#98a2b3]">발행일</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#1f2937]">{formatRfqDateTime(selectedInvoice.request.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#98a2b3]">제조사</p>
                    <p className="mt-1 text-[18px] font-bold text-[#1f2937]">{selectedInvoice.request.manufacturer_name}</p>
                  </div>
                </div>
                <div className="grid gap-4 py-5 sm:grid-cols-2">
                  {[
                    ["인보이스 번호", selectedInvoice.invoiceNumber],
                    ["RFQ 번호", selectedInvoice.request.request_number],
                    ["수주번호", getDisplayOrderNumber(selectedInvoice.request)],
                    ["회사명", selectedInvoice.request.brand_name],
                    ["의뢰자", selectedInvoice.request.contact_name],
                    ["상품", selectedInvoice.request.product_name],
                    ["수량", `${selectedInvoice.request.quantity.toLocaleString()}개`],
                    ["디자인", selectedInvoice.request.design_summary || "기본 선택"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[12px] font-semibold text-[#98a2b3]">{label}</p>
                      <p className="mt-1 text-[14px] font-semibold text-[#1f2937]">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-[16px] border border-[#e7ecf3] bg-white">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#fbfcfd] text-[#667085]">
                      <tr>
                        <th className="px-4 py-3">항목</th>
                        <th className="px-4 py-3 text-right">금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f4f6]">
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#1f2937]">총 매출</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1f2937]">{formatRfqCurrency(selectedInvoice.gross, selectedInvoice.request.currency_code)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#1f2937]">플랫폼 수수료 ({selectedInvoice.commissionRatePercent}%)</td>
                        <td className="px-4 py-3 text-right font-bold text-[#ff4d4f]">-{formatRfqCurrency(selectedInvoice.fee, selectedInvoice.request.currency_code)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-[#1f2937]">최종 정산 금액</td>
                        <td className="px-4 py-3 text-right text-[15px] font-bold text-[#2563eb]">{formatRfqCurrency(selectedInvoice.net, selectedInvoice.request.currency_code)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
