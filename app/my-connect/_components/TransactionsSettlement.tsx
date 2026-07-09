"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { type RfqRequestRow } from "@/lib/rfq";
import { supabase } from "@/lib/supabase";
import { ClientQuotePreviewModal } from "./ClientQuotePreviewModal";
import { FeesView } from "./transactions/FeesView";
import { MemoModal } from "./transactions/Shared";
import { SettlementsView } from "./transactions/SettlementsView";
import { TransactionsView } from "./transactions/TransactionsView";
import {
  type ContainerPricingRow,
  type ExtraPricingRow,
  type FeeMetaPayload,
  type PackagePricingRow,
  type ProductPricingRow,
  type ServicePricingRow,
} from "./transactions/types";
import {
  csvEscape,
  formatCurrencyDisplay,
  formatPreciseCurrencyDisplay,
  getMonthKey,
} from "./transactions/utils";
import { useTransactionsDerivedData } from "./transactions/useTransactionsDerivedData";

interface TransactionsSettlementProps {
  requests: RfqRequestRow[];
  view: "transactions" | "settlements" | "fees";
  onRequestsRefresh?: () => Promise<void>;
}

export function TransactionsSettlement({ requests, view, onRequestsRefresh }: TransactionsSettlementProps) {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const [commissionRatePercent, setCommissionRatePercent] = useState(3);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("ALL");
  const [quotePreviewRequest, setQuotePreviewRequest] = useState<RfqRequestRow | null>(null);
  const [memoRequest, setMemoRequest] = useState<RfqRequestRow | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFeeMonth, setSelectedFeeMonth] = useState(currentMonth);
  const [feePage, setFeePage] = useState(1);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestedAtMap, setRequestedAtMap] = useState<Record<string, string>>({});
  const [closedMonthMap, setClosedMonthMap] = useState<Record<string, string>>({});
  const [partnerFeeMap, setPartnerFeeMap] = useState<Record<string, { amount: number; commissionRate: number }>>({});
  const [partnerNameMap, setPartnerNameMap] = useState<Record<string, string>>({});
  const [productMap, setProductMap] = useState<Record<string, ProductPricingRow>>({});
  const [containerMap, setContainerMap] = useState<Record<string, ContainerPricingRow>>({});
  const [packagePriceMap, setPackagePriceMap] = useState<Record<string, number>>({});
  const [servicePriceMap, setServicePriceMap] = useState<Record<string, number>>({});
  const [extraPriceMap, setExtraPriceMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setMemoDraft(memoRequest?.admin_memo || "");
  }, [memoRequest]);

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

  useEffect(() => {
    if (view !== "fees" && view !== "transactions") return;

    const fetchFeeMeta = async () => {
      try {
        const response = await authFetch("/api/manufacturer/fee-settlements");
        const payload = (await response.json()) as FeeMetaPayload;
        if (!response.ok) {
          return;
        }

        setRequestedAtMap(Object.fromEntries((payload.rows || []).map((row) => [row.rfq_request_id, row.requested_at])));
        setClosedMonthMap(
          Object.fromEntries((payload.closures || []).map((row) => [getMonthKey(row.settlement_year, row.settlement_month), row.closed_at]))
        );
        setPartnerFeeMap(payload.partnerFees || {});
        setPartnerNameMap(payload.partnerNames || {});
      } catch (error) {
        console.error("Failed to load fee settlement metadata:", error);
      }
    };

    void fetchFeeMeta();
  }, [view]);

  useEffect(() => {
    const productIds = Array.from(new Set(requests.map((request) => request.product_id).filter(Boolean)));
    const containerIds = Array.from(new Set(requests.map((request) => request.container_id).filter(Boolean)));
    const packageIds = Array.from(new Set(requests.map((request) => request.design_package_id).filter(Boolean)));
    const serviceIds = Array.from(new Set(requests.flatMap((request) => request.design_service_ids || []).filter(Boolean)));
    const extraIds = Array.from(new Set(requests.flatMap((request) => request.design_extra_ids || []).filter(Boolean)));

    if (productIds.length === 0) {
      setProductMap({});
      setContainerMap({});
      setPackagePriceMap({});
      setServicePriceMap({});
      setExtraPriceMap({});
      return;
    }

    let ignore = false;

    const loadPricingResources = async () => {
      const [productsResult, containersResult, packagesResult, servicesResult, extrasResult] = await Promise.all([
        supabase.from("manufacturer_products").select("id, manufacturer_id, base_price, cost_price, discount_config").in("id", productIds),
        containerIds.length
          ? supabase.from("manufacturer_container_options").select("id, manufacturer_id, name, add_price").in("id", containerIds)
          : Promise.resolve({ data: [], error: null }),
        packageIds.length
          ? supabase.from("manufacturer_design_packages").select("id, price").in("id", packageIds)
          : Promise.resolve({ data: [], error: null }),
        serviceIds.length
          ? supabase.from("manufacturer_design_services").select("id, price").in("id", serviceIds)
          : Promise.resolve({ data: [], error: null }),
        extraIds.length
          ? supabase.from("manufacturer_design_extras").select("id, price").in("id", extraIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (productsResult.error || containersResult.error || packagesResult.error || servicesResult.error || extrasResult.error) {
        console.error(
          "Failed to load transaction resources:",
          productsResult.error?.message || containersResult.error?.message || packagesResult.error?.message || servicesResult.error?.message || extrasResult.error?.message
        );
        return;
      }

      if (!ignore) {
        setProductMap(Object.fromEntries(((productsResult.data as ProductPricingRow[] | null) || []).map((item) => [item.id, item])));
        setContainerMap(Object.fromEntries(((containersResult.data as ContainerPricingRow[] | null) || []).map((item) => [item.id, item])));
        setPackagePriceMap(Object.fromEntries((((packagesResult.data as PackagePricingRow[] | null) || []) as PackagePricingRow[]).map((item) => [item.id, Number(item.price || 0)])));
        setServicePriceMap(Object.fromEntries((((servicesResult.data as ServicePricingRow[] | null) || []) as ServicePricingRow[]).map((item) => [item.id, Number(item.price || 0)])));
        setExtraPriceMap(Object.fromEntries((((extrasResult.data as ExtraPricingRow[] | null) || []) as ExtraPricingRow[]).map((item) => [item.id, Number(item.price || 0)])));
      }
    };

    void loadPricingResources();

    return () => {
      ignore = true;
    };
  }, [requests]);

  const {
    filteredRecords,
    currencyOptions,
    summaryMetricCards,
    transactionSummaryRecords,
    feeMetricCards,
    feeMonthClosed,
    feeMonthRequestable,
    feeMonthRequestableRecords,
    feeRequestAmountLabel,
    pagedRecords,
    totalPages,
    visiblePage,
    feeMonthRecords,
    feeTotalPages,
    visibleFeePage,
    pagedFeeRecords,
  } = useTransactionsDerivedData({
    requests,
    view,
    commissionRatePercent,
    requestedAtMap,
    partnerFeeMap,
    partnerNameMap,
    productMap,
    containerMap,
    packagePriceMap,
    servicePriceMap,
    extraPriceMap,
    invoiceQuery,
    monthFilter,
    selectedCurrency,
    currentYear,
    selectedFeeMonth,
    closedMonthMap,
    currentPage,
    feePage,
  });
  const selectedFeeMonthKey = getMonthKey(currentYear, selectedFeeMonth);

  useEffect(() => {
    setFeePage(1);
  }, [selectedFeeMonth]);

  const handleMemoSave = async () => {
    if (!memoRequest || memoSaving) return;

    setMemoSaving(true);
    try {
      const response = await authFetch(`/api/rfqs/${memoRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminMemo: memoDraft.trim() || null }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "메모 저장에 실패했습니다.");
      }
      if (onRequestsRefresh) {
        await onRequestsRefresh();
      }
      setMemoRequest(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "메모 저장에 실패했습니다.");
    } finally {
      setMemoSaving(false);
    }
  };

  const handleDownloadCsv = () => {
    const headers =
      view === "settlements"
        ? ["정산일", "의뢰자", "상품", "총 매출", "수수료", "정산 금액", "통화", "인보이스"]
        : ["거래일", "의뢰자", "상품", "수량", "캡슐 원가", "캡슐 판매가", "박스비", "디자인비", "금액", "수수료", "정산", "통화", "인보이스"];

    if (view !== "settlements") {
      headers.splice(10, 0, "파트너 수수료");
    }

    const rows = filteredRecords.map((record) =>
      (
        view === "settlements"
          ? [
            record.settledAt || record.completedAt,
            record.request.contact_name,
            record.request.product_name,
            formatCurrencyDisplay(record.gross, record.request.currency_code),
              formatPreciseCurrencyDisplay(record.fee, record.request.currency_code),
              formatPreciseCurrencyDisplay(record.net, record.request.currency_code),
            (record.request.currency_code || "USD").toUpperCase(),
            record.invoiceNumber,
          ]
          : [
            record.completedAt,
            record.request.contact_name,
            record.request.product_name,
            `${record.request.quantity.toLocaleString()}개`,
            formatCurrencyDisplay(record.capsuleCost, record.request.currency_code),
            formatCurrencyDisplay(record.capsuleSalePrice, record.request.currency_code),
            formatCurrencyDisplay(record.boxPrice, record.request.currency_code),
            formatCurrencyDisplay(record.designPrice, record.request.currency_code),
            formatCurrencyDisplay(record.gross, record.request.currency_code),
            formatCurrencyDisplay(record.fee, record.request.currency_code),
            record.partnerFee > 0 ? formatCurrencyDisplay(record.partnerFee, record.request.currency_code) : "-",
            record.partnerName || "-",
            formatCurrencyDisplay(record.net, record.request.currency_code),
            (record.request.currency_code || "USD").toUpperCase(),
            record.invoiceNumber,
          ]
      ).map(csvEscape)
    );

    const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${view === "settlements" ? "manufacturer_settlements" : "manufacturer_transactions"}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmFeeSettlement = async () => {
    const shouldProceed = window.confirm(`${feeRequestAmountLabel}를 정산완료 처리하시겠습니까?`);
    if (!shouldProceed) return;

    setRequestSubmitting(true);
    try {
      const fallbackRequestedAt = new Date().toISOString();
      const response = await authFetch("/api/manufacturer/fee-settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear, month: selectedFeeMonth }),
      });
      const payload = (await response.json()) as { error?: string; requestedAt?: string };
      if (!response.ok) {
        throw new Error(payload.error || "수수료 정산 요청에 실패했습니다.");
      }
      if (onRequestsRefresh) {
        await onRequestsRefresh();
      }

      const requestedAt = payload.requestedAt || fallbackRequestedAt;
      setRequestedAtMap((prev) => {
        const next = { ...prev };
        for (const record of feeMonthRequestableRecords) {
          next[record.id] = requestedAt;
        }
        return next;
      });
      setClosedMonthMap((prev) => ({ ...prev, [selectedFeeMonthKey]: requestedAt }));
      window.alert("정산완료");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "수수료 정산 요청에 실패했습니다.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  return (
    <>
      {view === "fees" ? (
        <FeesView
          currentYear={currentYear}
          selectedFeeMonth={selectedFeeMonth}
          setSelectedFeeMonth={setSelectedFeeMonth}
          transactionSummaryRecords={transactionSummaryRecords}
          closedMonthMap={closedMonthMap}
          feeMetricCards={feeMetricCards}
          feeMonthClosed={feeMonthClosed}
          feeMonthRequestable={feeMonthRequestable}
          requestSubmitting={requestSubmitting}
          onConfirmFeeSettlement={handleConfirmFeeSettlement}
          pagedFeeRecords={pagedFeeRecords}
          feeMonthRecordsLength={feeMonthRecords.length}
          feeTotalPages={feeTotalPages}
          visibleFeePage={visibleFeePage}
          setFeePage={setFeePage}
          quotePreviewRequest={quotePreviewRequest}
          onQuotePreviewRequestChange={setQuotePreviewRequest}
        />
      ) : view === "settlements" ? (
        <SettlementsView
          monthFilter={monthFilter}
          onMonthChange={(value) => {
            setMonthFilter(value);
            setCurrentPage(1);
          }}
          selectedCurrency={selectedCurrency}
          currencyOptions={currencyOptions}
          onCurrencyChange={(value) => {
            setSelectedCurrency(value);
            setCurrentPage(1);
          }}
          invoiceQuery={invoiceQuery}
          onInvoiceQueryChange={(value) => {
            setInvoiceQuery(value);
            setCurrentPage(1);
          }}
          onDownload={handleDownloadCsv}
          pagedRecords={pagedRecords}
          filteredRecordsLength={filteredRecords.length}
          visiblePage={visiblePage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          onQuotePreviewRequestChange={setQuotePreviewRequest}
        />
      ) : (
        <TransactionsView
          monthFilter={monthFilter}
          onMonthChange={(value) => {
            setMonthFilter(value);
            setCurrentPage(1);
          }}
          selectedCurrency={selectedCurrency}
          currencyOptions={currencyOptions}
          onCurrencyChange={(value) => {
            setSelectedCurrency(value);
            setCurrentPage(1);
          }}
          invoiceQuery={invoiceQuery}
          onInvoiceQueryChange={(value) => {
            setInvoiceQuery(value);
            setCurrentPage(1);
          }}
          onDownload={handleDownloadCsv}
          summaryMetricCards={summaryMetricCards}
          pagedRecords={pagedRecords}
          filteredRecordsLength={filteredRecords.length}
          visiblePage={visiblePage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          onQuotePreviewRequestChange={setQuotePreviewRequest}
          onMemoRequestChange={setMemoRequest}
        />
      )}

      <ClientQuotePreviewModal
        request={quotePreviewRequest}
        open={Boolean(quotePreviewRequest)}
        onClose={() => setQuotePreviewRequest(null)}
      />

      <MemoModal
        memoRequest={memoRequest}
        memoDraft={memoDraft}
        memoSaving={memoSaving}
        onMemoDraftChange={setMemoDraft}
        onClose={() => {
          if (memoSaving) return;
          setMemoRequest(null);
        }}
        onSave={() => {
          void handleMemoSave();
        }}
      />
    </>
  );
}
