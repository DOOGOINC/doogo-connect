import { type CurrencyCode } from "@/lib/currency";
import { type RfqRequestRow } from "@/lib/rfq";

export type TransactionsViewMode = "transactions" | "settlements" | "fees";

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  request: RfqRequestRow;
  completedAt: string;
  settledAt: string | null;
  requestedAt: string | null;
  capsuleCost: number;
  capsuleSalePrice: number;
  boxPrice: number;
  designPrice: number;
  gross: number;
  commissionRatePercent: number;
  fee: number;
  partnerFee: number;
  partnerCommissionRatePercent: number | null;
  partnerName: string | null;
  net: number;
  hasStudentDiscount: boolean;
};

export type CurrencySummary = {
  currencyCode: string;
  gross: number;
  fee: number;
  partnerFee: number;
  net: number;
};

export type SummaryMetricCard = {
  key: string;
  label: string;
  value: number;
  currencyCode: string;
  color: string;
  precise?: boolean;
};

export type FeeMetaPayload = {
  rows?: Array<{ rfq_request_id: string; requested_at: string }>;
  closures?: Array<{ settlement_year: number; settlement_month: number; closed_at: string }>;
  partnerFees?: Record<string, { amount: number; commissionRate: number }>;
  partnerNames?: Record<string, string>;
};

export type SnapshotPricing = {
  product_unit_price?: number;
  product_amount?: number;
  container_unit_price?: number;
  container_amount?: number;
  package_price?: number;
  additional_discount_percent?: number;
  additional_discount_amount?: number;
  services?: Array<{ id?: string; price?: number }>;
  extras?: Array<{ id?: string; price?: number }>;
};

export type ProductPricingRow = {
  id: string;
  manufacturer_id: number;
  base_price: number | null;
  cost_price: number | null;
  discount_config: Record<string, number> | null;
};

export type ContainerPricingRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  add_price: number | null;
};

export type PackagePricingRow = {
  id: string;
  price: number | null;
};

export type ServicePricingRow = {
  id: string;
  price: number | null;
};

export type ExtraPricingRow = {
  id: string;
  price: number | null;
};

export type CurrencyOption = "ALL" | CurrencyCode | string;
