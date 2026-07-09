"use client";

import { useMemo } from "react";
import { getPricingBySelection, type ContainerOption, type Product } from "@/app/estimate/_data/catalog";
import { type RfqRequestRow } from "@/lib/rfq";
import {
  type ContainerPricingRow,
  type CurrencySummary,
  type InvoiceRecord,
  type ProductPricingRow,
  type SummaryMetricCard,
} from "./types";
import { PAGE_SIZE, TRANSACTION_VISIBLE_STATUSES, createInvoiceNumber, formatCurrencyDisplay, getEffectiveFeeMonthKeyFromMap, getMonthKey, getSnapshotPricing, toCurrencyCode } from "./utils";

type UseTransactionsDerivedDataParams = {
  requests: RfqRequestRow[];
  view: "transactions" | "settlements" | "fees";
  commissionRatePercent: number;
  requestedAtMap: Record<string, string>;
  partnerFeeMap: Record<string, { amount: number; commissionRate: number }>;
  partnerNameMap: Record<string, string>;
  productMap: Record<string, ProductPricingRow>;
  containerMap: Record<string, ContainerPricingRow>;
  packagePriceMap: Record<string, number>;
  servicePriceMap: Record<string, number>;
  extraPriceMap: Record<string, number>;
  invoiceQuery: string;
  monthFilter: string;
  selectedCurrency: string;
  currentYear: number;
  selectedFeeMonth: number;
  closedMonthMap: Record<string, string>;
  currentPage: number;
  feePage: number;
};

export function useTransactionsDerivedData({
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
}: UseTransactionsDerivedDataParams) {
  const invoiceRecords = useMemo<InvoiceRecord[]>(
    () =>
      requests
        .filter((request) => (view === "transactions" ? TRANSACTION_VISIBLE_STATUSES.has(request.status) : request.status === "fulfilled"))
        .map((request) => {
          const snapshotPricing = getSnapshotPricing(request);
          const productRow = productMap[request.product_id];
          const containerRow = request.container_id ? containerMap[request.container_id] : undefined;
          const product: Product | null = productRow
            ? {
                id: productRow.id,
                manufacturerId: productRow.manufacturer_id,
                category: "",
                name: request.product_name,
                description: "",
                paymentCurrency: toCurrencyCode(request.currency_code),
                basePrice: Number(productRow.base_price || 0),
                discountConfig: Object.fromEntries(Object.entries(productRow.discount_config || {}).map(([qty, discount]) => [Number(qty), Number(discount)])),
                image: "",
                keyFeatures: [],
                ingredients: [],
                directions: [],
                cautions: [],
                containerIds: request.container_id ? [request.container_id] : [],
              }
            : null;
          const container: ContainerOption | null = containerRow
            ? {
                id: containerRow.id,
                manufacturerId: containerRow.manufacturer_id,
                name: containerRow.name,
                description: "",
                addPrice: Number(containerRow.add_price || 0),
                image: "",
              }
            : null;
          const pricing = getPricingBySelection({ product, container, quantity: request.quantity, designPrice: 0 });
          const capsuleCost = Number(productRow?.cost_price || 0) * Number(request.quantity || 0);
          const capsuleSalePrice = Number(snapshotPricing.product_amount ?? pricing.discountedProductUnitPrice * request.quantity);
          const boxPrice = Number(snapshotPricing.container_amount ?? pricing.containerUnitPrice * request.quantity);
          const designPrice =
            Number(snapshotPricing.package_price ?? (request.design_package_id ? packagePriceMap[request.design_package_id] || 0 : 0)) +
            (request.design_service_ids || []).reduce(
              (sum, serviceId) => sum + Number(snapshotPricing.services?.find((service) => service.id === serviceId)?.price ?? servicePriceMap[serviceId] ?? 0),
              0
            ) +
            (request.design_extra_ids || []).reduce(
              (sum, extraId) => sum + Number(snapshotPricing.extras?.find((extra) => extra.id === extraId)?.price ?? extraPriceMap[extraId] ?? 0),
              0
            );
          const subtotalBeforeDiscount = capsuleSalePrice + boxPrice + designPrice;
          const additionalDiscountAmount = Math.max(
            0,
            Number(snapshotPricing.additional_discount_amount ?? subtotalBeforeDiscount - Number(request.total_price || 0))
          );
          const hasStudentDiscount =
            Number(snapshotPricing.additional_discount_percent || 0) > 0 ||
            additionalDiscountAmount > 0;
          const gross = Number(request.total_price || 0);
          const storedFee = Number(request.commission_amount);
          const rate = Number(request.commission_rate_percent || commissionRatePercent);
          const fee = Number.isFinite(storedFee) && storedFee > 0 ? storedFee : gross * (rate / 100);
          const partnerFeeEntry = partnerFeeMap[request.id];
          const partnerFee = Number(partnerFeeEntry?.amount || 0);
          const net = gross - fee - partnerFee;

          return {
            id: request.id,
            invoiceNumber: createInvoiceNumber(request),
            request,
            completedAt: request.commission_locked_at?.trim() || request.updated_at || request.created_at,
            settledAt: request.is_settled ? request.settled_at?.trim() || request.commission_locked_at?.trim() || request.updated_at || request.created_at : null,
            requestedAt: requestedAtMap[request.id] || request.manufacturer_settlement_requested_at?.trim() || null,
            capsuleCost,
            capsuleSalePrice,
            boxPrice,
            designPrice,
            gross,
            commissionRatePercent: rate,
            fee,
            partnerFee,
            partnerCommissionRatePercent: partnerFeeEntry ? Number(partnerFeeEntry.commissionRate) : null,
            partnerName: partnerNameMap[request.id] || null,
            net,
            hasStudentDiscount,
          };
        })
        .sort((a, b) => new Date((b.settledAt || b.completedAt) ?? b.completedAt).getTime() - new Date((a.settledAt || a.completedAt) ?? a.completedAt).getTime()),
    [commissionRatePercent, containerMap, extraPriceMap, packagePriceMap, partnerFeeMap, partnerNameMap, productMap, requests, requestedAtMap, servicePriceMap, view]
  );

  const settlementHistoryRecords = useMemo(() => invoiceRecords.filter((record) => record.request.is_settled), [invoiceRecords]);
  const transactionSummaryRecords = useMemo(() => invoiceRecords.filter((record) => record.request.status === "fulfilled"), [invoiceRecords]);

  const filteredRecords = useMemo(() => {
    const source = view === "settlements" ? settlementHistoryRecords : invoiceRecords;
    const query = invoiceQuery.trim().toLowerCase();

    return source.filter((record) => {
      const baseDate = view === "settlements" ? record.settledAt || record.completedAt : record.completedAt;
      const baseMonth = baseDate.slice(0, 7);
      const currencyCode = (record.request.currency_code || "USD").toUpperCase();

      return (
        (!monthFilter || baseMonth === monthFilter) &&
        (selectedCurrency === "ALL" || currencyCode === selectedCurrency) &&
        (!query ||
          record.invoiceNumber.toLowerCase().includes(query) ||
          record.request.contact_name.toLowerCase().includes(query) ||
          record.request.product_name.toLowerCase().includes(query))
      );
    });
  }, [invoiceQuery, invoiceRecords, monthFilter, selectedCurrency, settlementHistoryRecords, view]);

  const currencyOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(invoiceRecords.map((record) => (record.request.currency_code || "USD").toUpperCase())))],
    [invoiceRecords]
  );

  const summaryCards = useMemo<CurrencySummary[]>(() => {
    const grouped = transactionSummaryRecords
      .filter((record) => {
        const baseMonth = record.completedAt.slice(0, 7);
        const currencyCode = (record.request.currency_code || "USD").toUpperCase();
        const query = invoiceQuery.trim().toLowerCase();
        return (
          (!monthFilter || baseMonth === monthFilter) &&
          (selectedCurrency === "ALL" || currencyCode === selectedCurrency) &&
          (!query ||
            record.invoiceNumber.toLowerCase().includes(query) ||
            record.request.contact_name.toLowerCase().includes(query) ||
            record.request.product_name.toLowerCase().includes(query))
        );
      })
      .reduce<Record<string, CurrencySummary>>((acc, record) => {
        const currencyCode = (record.request.currency_code || "USD").toUpperCase();
        if (!acc[currencyCode]) {
          acc[currencyCode] = { currencyCode, gross: 0, fee: 0, partnerFee: 0, net: 0 };
        }
        acc[currencyCode].gross += record.gross;
        acc[currencyCode].fee += record.fee;
        acc[currencyCode].partnerFee += record.partnerFee;
        acc[currencyCode].net += record.net;
        return acc;
      }, {});

    return Object.values(grouped).sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [invoiceQuery, monthFilter, selectedCurrency, transactionSummaryRecords]);

  const summaryMetricCards = useMemo<SummaryMetricCard[]>(
    () =>
      summaryCards.flatMap((card) => [
        { key: `${card.currencyCode}-gross`, label: `${card.currencyCode} 총 매출`, value: card.gross, currencyCode: card.currencyCode, color: "text-[#111827]" },
        { key: `${card.currencyCode}-fee`, label: `${card.currencyCode} 수수료`, value: card.fee, currencyCode: card.currencyCode, color: "text-[#ff4d4f]" },
        { key: `${card.currencyCode}-partner-fee`, label: `${card.currencyCode} 파트너 수수료`, value: card.partnerFee, currencyCode: card.currencyCode, color: "text-[#344054]", precise: true },
        { key: `${card.currencyCode}-net`, label: `${card.currencyCode} 정산 금액`, value: card.net, currencyCode: card.currencyCode, color: "text-[#2563eb]", precise: true },
      ]),
    [summaryCards]
  );

  const selectedFeeMonthKey = getMonthKey(currentYear, selectedFeeMonth);
  const feeMonthRecords = useMemo(
    () => transactionSummaryRecords.filter((record) => getEffectiveFeeMonthKeyFromMap(record.completedAt, closedMonthMap) === selectedFeeMonthKey),
    [closedMonthMap, selectedFeeMonthKey, transactionSummaryRecords]
  );
  const feeMonthRequestableRecords = useMemo(() => feeMonthRecords.filter((record) => !record.request.is_settled && !record.requestedAt), [feeMonthRecords]);
  const feeSummaryCards = useMemo<CurrencySummary[]>(() => {
    const grouped = feeMonthRecords.reduce<Record<string, CurrencySummary>>((acc, record) => {
      const currencyCode = (record.request.currency_code || "USD").toUpperCase();
      if (!acc[currencyCode]) {
        acc[currencyCode] = { currencyCode, gross: 0, fee: 0, partnerFee: 0, net: 0 };
      }
      acc[currencyCode].gross += record.gross;
      acc[currencyCode].fee += record.fee;
      acc[currencyCode].net += record.net;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [feeMonthRecords]);

  const feeMetricCards = useMemo<SummaryMetricCard[]>(
    () =>
      feeSummaryCards.flatMap((card) => [
        { key: `${card.currencyCode}-fee-gross`, label: `${card.currencyCode} 총 매출`, value: card.gross, currencyCode: card.currencyCode, color: "text-[#111827]" },
        { key: `${card.currencyCode}-fee-fee`, label: `${card.currencyCode} 수수료`, value: card.fee, currencyCode: card.currencyCode, color: "text-[#ff4d4f]", precise: true },
      ]),
    [feeSummaryCards]
  );

  const feeMonthSummary = useMemo(() => feeMonthRecords.reduce((acc, record) => ({ fee: acc.fee + record.fee }), { fee: 0 }), [feeMonthRecords]);
  const feeCurrencyCode = feeMonthRecords[0]?.request.currency_code || "USD";
  const feeMonthClosed = Boolean(closedMonthMap[selectedFeeMonthKey]);
  const feeMonthRequestable = feeMonthRequestableRecords.length > 0 && !feeMonthClosed;
  const feeRequestAmountLabel = `${selectedFeeMonth}월 수수료 ${formatCurrencyDisplay(feeMonthSummary.fee, feeCurrencyCode)}`;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const pagedRecords = useMemo(() => filteredRecords.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE), [filteredRecords, visiblePage]);
  const feeTotalPages = Math.max(1, Math.ceil(feeMonthRecords.length / PAGE_SIZE));
  const visibleFeePage = Math.min(feePage, feeTotalPages);
  const pagedFeeRecords = useMemo(() => feeMonthRecords.slice((visibleFeePage - 1) * PAGE_SIZE, visibleFeePage * PAGE_SIZE), [feeMonthRecords, visibleFeePage]);

  return {
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
  };
}
