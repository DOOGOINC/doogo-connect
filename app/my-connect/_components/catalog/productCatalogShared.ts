import type { CurrencyCode } from "@/lib/currency";

export type DiscountRow = {
  qty: string;
  discount: string;
};

export type ProductRow = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  is_active?: boolean;
  payment_currency?: CurrencyCode | null;
  base_price: number;
  cost_price?: number | null;
  discount_config: Record<string, number> | null;
  image: string | null;
  key_features: string[] | null;
  ingredients: string[] | null;
  directions: string[] | null;
  cautions: string[] | null;
  container_ids: string[] | null;
  design_service_ids?: string[] | null;
  design_package_ids?: string[] | null;
  design_extra_ids?: string[] | null;
};

export type ContainerRow = {
  id: string;
  name: string;
  description?: string | null;
  add_price?: number;
  image?: string | null;
  sort_order?: number | null;
  payment_currency?: CurrencyCode | null;
};

export type ProductForm = {
  id: string;
  category: string;
  name: string;
  description: string;
  paymentCurrency: CurrencyCode;
  costPrice: string;
  basePrice: string;
  image: string;
  keyFeatures: string;
  ingredients: string;
  directions: string;
  cautions: string;
  containerIds: string[];
  designServiceIds: string[];
  designPackageIds: string[];
  designExtraIds: string[];
  discountRows: DiscountRow[];
};

export const createDiscountRows = (): DiscountRow[] => [
  { qty: "50", discount: "0" },
  { qty: "100", discount: "0" },
  { qty: "200", discount: "0" },
];

export const createProductForm = (): ProductForm => ({
  id: "",
  category: "",
  name: "",
  description: "",
  paymentCurrency: "USD",
  costPrice: "",
  basePrice: "",
  image: "",
  keyFeatures: "",
  ingredients: "",
  directions: "",
  cautions: "",
  containerIds: [],
  designServiceIds: [],
  designPackageIds: [],
  designExtraIds: [],
  discountRows: createDiscountRows(),
});

export const createCatalogEntityId = (prefix: string) => {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${random}`.toUpperCase();
};

export const parseLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export const joinLines = (items?: string[] | null) => (items || []).join("\n");
