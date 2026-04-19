import type { CurrencyCode } from "@/lib/currency";
import type { NewContainerForm, NewOptionForm, NewPackageForm } from "./product-catalog/ProductCatalogLinkedOptions";

export type ProductManagementSection = "product-list" | "product-create";

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number | null;
  payment_currency: CurrencyCode | null;
};

export type PackageRow = {
  id: string;
  name: string;
  badge: string | null;
  description: string | null;
  price: number;
  included: string[] | null;
  sort_order: number | null;
  payment_currency: CurrencyCode | null;
};

export type ExtraRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number | null;
  payment_currency: CurrencyCode | null;
};

export const createNewContainerForm = (): NewContainerForm => ({
  name: "",
  description: "",
  addPrice: "",
  sortOrder: "",
  image: "",
});

export const createNewOptionForm = (): NewOptionForm => ({
  name: "",
  description: "",
  price: "",
  sortOrder: "",
});

export const createNewPackageForm = (): NewPackageForm => ({
  name: "",
  description: "",
  price: "",
  sortOrder: "",
  badge: "",
  includedText: "",
});
