import { formatCurrency, type CurrencyCode } from "@/lib/currency";

export type DiscountConfig = Record<number, number>;

export interface ProductDetail {
  keyFeatures: string[];
  ingredients: string[];
  directions?: string[];
  cautions?: string[];
}

export interface Product {
  id: string;
  manufacturerId: number;
  category: string;
  name: string;
  description: string;
  paymentCurrency: CurrencyCode;
  basePrice: number;
  discountConfig: DiscountConfig;
  image: string;
  keyFeatures: string[];
  ingredients: string[];
  directions?: string[];
  cautions?: string[];
  containerIds: string[];
}

export interface ContainerOption {
  id: string;
  manufacturerId: number;
  name: string;
  description: string;
  addPrice: number;
  image: string;
}

export interface DesignOption {
  id: string;
  manufacturerId: number;
  name: string;
  price: number;
  isDefault?: boolean;
}

export interface DesignServiceItem {
  id: string;
  manufacturerId: number;
  name: string;
  description?: string;
  price: number;
}

export interface DesignPackageItem {
  id: string;
  manufacturerId: number;
  name: string;
  badge?: string;
  description?: string;
  price: number;
  included: string[];
}

export interface DesignExtraItem {
  id: string;
  manufacturerId: number;
  name: string;
  description: string;
  price: number;
}

export interface DiscountRow {
  qty: number;
  label: string;
  discount: number;
  note: string;
}

export interface ManufacturerCatalog {
  products: Product[];
  containers: ContainerOption[];
  designOptions: DesignOption[];
  designServices: DesignServiceItem[];
  designPackages: DesignPackageItem[];
  designExtras: DesignExtraItem[];
}

export interface EstimateSelection {
  manufacturer: number | null;
  product: string | null;
  quantity: number;
  container: string | null;
  design: string | null;
  designServices: string[];
  designPackage: string | null;
  designExtras: string[];
}

export const formatPriceText = (addPrice: number, currencyCode: CurrencyCode = "USD") =>
  formatCurrency(addPrice, currencyCode);
export const getDynamicDiscounts = (product: Product | null): DiscountRow[] => {
  if (!product || !product.discountConfig || Object.keys(product.discountConfig).length === 0) {
    return [{ qty: 50, label: "50개 (최소)", discount: 1, note: "0% (최소)" }];
  }

  const quantities = Object.keys(product.discountConfig)
    .map(Number)
    .sort((a, b) => a - b);

  return quantities.map((qty) => {
    const percent = product.discountConfig[qty];
    const discountRate = 1 - percent / 100;

    return {
      qty,
      label: `${qty.toLocaleString()}개${qty === 50 ? " (최소)" : ""}`,
      discount: discountRate,
      note: percent === 0 ? "0% (기준가)" : `${percent}% 할인`,
    };
  });
};

export const getProductById = (products: Product[], productId: string | null): Product | null => {
  if (!productId) return null;
  return products.find((product) => product.id === productId) || null;
};

export const getProductDetails = (product: Product | null): ProductDetail | null => {
  if (!product) return null;

  return {
    keyFeatures: product.keyFeatures || [],
    ingredients: product.ingredients || [],
    directions: product.directions || [],
    cautions: product.cautions || [],
  };
};

export const getContainerById = (containers: ContainerOption[], containerId: string | null): ContainerOption | null => {
  if (!containerId) return null;
  return containers.find((container) => container.id === containerId) || null;
};

export const getContainersByProduct = (containers: ContainerOption[], product: Product | null): ContainerOption[] => {
  if (!product) return [];
  return containers.filter((container) => product.containerIds.includes(container.id));
};

export const getDefaultDesignOption = (designOptions: DesignOption[]): DesignOption | null => {
  return designOptions.find((option) => option.isDefault) || designOptions[0] || null;
};

export const getDesignSelectionsSummary = ({
  designOptions,
  designServices,
  designPackages,
  designExtras,
  design,
  selectedServiceIds,
  selectedPackageId,
  selectedExtraIds,
}: {
  designOptions: DesignOption[];
  designServices: DesignServiceItem[];
  designPackages: DesignPackageItem[];
  designExtras: DesignExtraItem[];
  design: string | null;
  selectedServiceIds: string[];
  selectedPackageId: string | null;
  selectedExtraIds: string[];
}): DesignOption => {
  const selectedServices = designServices.filter((service) => selectedServiceIds.includes(service.id));
  const selectedPackage = designPackages.find((item) => item.id === selectedPackageId) || null;
  const selectedExtras = designExtras.filter((extra) => selectedExtraIds.includes(extra.id));
  const fallbackOption =
    designOptions.find((option) => option.id === design) || getDefaultDesignOption(designOptions);

  const servicesPrice = selectedServices.reduce((sum, item) => sum + item.price, 0);
  const packagePrice = selectedPackage?.price || 0;
  const extrasPrice = selectedExtras.reduce((sum, item) => sum + item.price, 0);
  const fallbackPrice =
    !selectedServices.length && !selectedPackage && !selectedExtras ? fallbackOption?.price || 0 : 0;
  const price = servicesPrice + packagePrice + extrasPrice + fallbackPrice;

  const nameParts = [
    selectedPackage?.name,
    ...selectedServices.map((item) => item.name),
    ...selectedExtras.map((item) => item.name),
  ].filter(Boolean);

  return {
    id: selectedPackage?.id || design || fallbackOption?.id || "custom-design",
    manufacturerId: fallbackOption?.manufacturerId || 0,
    name: nameParts.length > 0 ? nameParts.join(", ") : fallbackOption?.name || "기본 디자인",
    price,
    isDefault: fallbackOption?.isDefault,
  };
};

export const getPricingBySelection = ({
  product,
  container,
  quantity,
  designPrice = 0,
}: {
  product: Product | null;
  container?: ContainerOption | null;
  quantity: number;
  designPrice?: number;
}) => {
  const discounts = getDynamicDiscounts(product);
  const currentDiscountRow =
    [...discounts].reverse().find((discount) => quantity >= discount.qty) || {
      qty: 50,
      discount: 1,
      label: "50개 (최소)",
      note: "0%",
    };

  const discountedProductUnitPrice = (product?.basePrice || 0) * currentDiscountRow.discount;
  const containerUnitPrice = container?.addPrice || 0;
  const unitPrice = discountedProductUnitPrice + containerUnitPrice;
  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal + designPrice;

  return {
    discounts,
    currentDiscountRow,
    discountedProductUnitPrice,
    containerUnitPrice,
    unitPrice,
    subtotal,
    totalPrice,
  };
};
