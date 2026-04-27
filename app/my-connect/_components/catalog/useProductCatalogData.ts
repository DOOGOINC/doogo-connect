"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCatalogSignedUrls, resolveCatalogImageUrl } from "@/lib/catalogImageUrls";
import type { CurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import {
  type ContainerRow,
  type ProductForm,
  type ProductRow,
  createDiscountRows,
  joinLines,
} from "./productCatalogShared";
import type { ExtraRow, PackageRow, ServiceRow } from "./productCatalogManager.types";
import type { NewContainerForm } from "./product-catalog/ProductCatalogLinkedOptions";

export function useProductCatalogData({
  manufacturerId,
  currencyCode,
  activeCurrency,
  form,
  newContainers,
}: {
  manufacturerId: number;
  currencyCode: CurrencyCode;
  activeCurrency: CurrencyCode;
  form: ProductForm;
  newContainers: NewContainerForm[];
}) {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [designServices, setDesignServices] = useState<ServiceRow[]>([]);
  const [designPackages, setDesignPackages] = useState<PackageRow[]>([]);
  const [designExtras, setDesignExtras] = useState<ExtraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedImageUrls, setSignedImageUrls] = useState<Record<string, string>>({});

  const loadItems = async () => {
    setLoading(true);
    const [productsResult, containersResult, servicesResult, packagesResult, extrasResult] = await Promise.all([
      supabase.from("manufacturer_products").select("*").eq("manufacturer_id", manufacturerId).order("updated_at", { ascending: false }),
      supabase
        .from("manufacturer_container_options")
        .select("id, name, description, add_price, image, sort_order, payment_currency")
        .eq("manufacturer_id", manufacturerId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("manufacturer_design_services")
        .select("id, name, description, price, sort_order, payment_currency")
        .eq("manufacturer_id", manufacturerId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("manufacturer_design_packages")
        .select("id, name, badge, description, price, included, sort_order, payment_currency")
        .eq("manufacturer_id", manufacturerId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("manufacturer_design_extras")
        .select("id, name, description, price, sort_order, payment_currency")
        .eq("manufacturer_id", manufacturerId)
        .order("sort_order", { ascending: true }),
    ]);

    setItems((productsResult.data || []) as ProductRow[]);
    setContainers((containersResult.data || []) as ContainerRow[]);
    setDesignServices((servicesResult.data || []) as ServiceRow[]);
    setDesignPackages((packagesResult.data || []) as PackageRow[]);
    setDesignExtras((extrasResult.data || []) as ExtraRow[]);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      setLoading(true);
      const [productsResult, containersResult, servicesResult, packagesResult, extrasResult] = await Promise.all([
        supabase.from("manufacturer_products").select("*").eq("manufacturer_id", manufacturerId).order("updated_at", { ascending: false }),
        supabase
          .from("manufacturer_container_options")
          .select("id, name, description, add_price, image, sort_order, payment_currency")
          .eq("manufacturer_id", manufacturerId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("manufacturer_design_services")
          .select("id, name, description, price, sort_order, payment_currency")
          .eq("manufacturer_id", manufacturerId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("manufacturer_design_packages")
          .select("id, name, badge, description, price, included, sort_order, payment_currency")
          .eq("manufacturer_id", manufacturerId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("manufacturer_design_extras")
          .select("id, name, description, price, sort_order, payment_currency")
          .eq("manufacturer_id", manufacturerId)
          .order("sort_order", { ascending: true }),
      ]);

      if (ignore) return;

      setItems((productsResult.data || []) as ProductRow[]);
      setContainers((containersResult.data || []) as ContainerRow[]);
      setDesignServices((servicesResult.data || []) as ServiceRow[]);
      setDesignPackages((packagesResult.data || []) as PackageRow[]);
      setDesignExtras((extrasResult.data || []) as ExtraRow[]);
      setLoading(false);
    };

    void initialize();

    return () => {
      ignore = true;
    };
  }, [manufacturerId]);

  useEffect(() => {
    const paths = [
      ...items.map((item) => item.image),
      ...containers.map((item) => item.image),
      form.image,
      ...newContainers.map((item) => item.image),
    ].filter((path): path is string => Boolean(path));
    let ignore = false;

    const loadSignedUrls = async () => {
      try {
        const urls = await fetchCatalogSignedUrls(paths);
        if (!ignore) {
          setSignedImageUrls((prev) => ({ ...prev, ...urls }));
        }
      } catch (error) {
        console.error("[product catalog image urls]", error);
      }
    };

    void loadSignedUrls();

    return () => {
      ignore = true;
    };
  }, [containers, form.image, items, newContainers]);

  const filteredProducts = useMemo(
    () => items.filter((item) => (item.payment_currency || "USD") === activeCurrency),
    [activeCurrency, items]
  );
  const filteredContainers = useMemo(
    () => containers.filter((item) => (item.payment_currency || "USD") === activeCurrency),
    [activeCurrency, containers]
  );
  const filteredServices = useMemo(
    () => designServices.filter((item) => (item.payment_currency || "USD") === activeCurrency),
    [activeCurrency, designServices]
  );
  const filteredPackages = useMemo(
    () => designPackages.filter((item) => (item.payment_currency || "USD") === activeCurrency),
    [activeCurrency, designPackages]
  );
  const filteredExtras = useMemo(
    () => designExtras.filter((item) => (item.payment_currency || "USD") === activeCurrency),
    [activeCurrency, designExtras]
  );

  const formContainers = useMemo(
    () => containers.filter((item) => (item.payment_currency || "USD") === form.paymentCurrency),
    [containers, form.paymentCurrency]
  );
  const formServices = useMemo(
    () => designServices.filter((item) => (item.payment_currency || "USD") === form.paymentCurrency),
    [designServices, form.paymentCurrency]
  );
  const formPackages = useMemo(
    () => designPackages.filter((item) => (item.payment_currency || "USD") === form.paymentCurrency),
    [designPackages, form.paymentCurrency]
  );
  const formExtras = useMemo(
    () => designExtras.filter((item) => (item.payment_currency || "USD") === form.paymentCurrency),
    [designExtras, form.paymentCurrency]
  );

  const containerNames = useMemo(() => Object.fromEntries(filteredContainers.map((container) => [container.id, container.name])), [filteredContainers]);
  const serviceNames = useMemo(() => Object.fromEntries(filteredServices.map((item) => [item.id, item.name])), [filteredServices]);
  const packageNames = useMemo(() => Object.fromEntries(filteredPackages.map((item) => [item.id, item.name])), [filteredPackages]);
  const extraNames = useMemo(() => Object.fromEntries(filteredExtras.map((item) => [item.id, item.name])), [filteredExtras]);

  const resolveImageUrl = (pathOrUrl: string | null | undefined) => resolveCatalogImageUrl(pathOrUrl, signedImageUrls);

  const mapItemToForm = (item: ProductRow): ProductForm => ({
    id: item.id,
    category: item.category,
    name: item.name,
    description: item.description || "",
    paymentCurrency: (item.payment_currency || currencyCode) as CurrencyCode,
    costPrice: item.cost_price == null ? "" : String(item.cost_price),
    basePrice: String(item.base_price),
    image: item.image || "",
    keyFeatures: joinLines(item.key_features),
    ingredients: joinLines(item.ingredients),
    directions: joinLines(item.directions),
    cautions: joinLines(item.cautions),
    containerIds: item.container_ids || [],
    designServiceIds: item.design_service_ids || [],
    designPackageIds: item.design_package_ids || [],
    designExtraIds: item.design_extra_ids || [],
    discountRows:
      item.discount_config && Object.keys(item.discount_config).length > 0
        ? Object.entries(item.discount_config).map(([qty, discount]) => ({ qty, discount: String(discount) }))
        : createDiscountRows(),
  });

  return {
    items,
    containers,
    designServices,
    designPackages,
    designExtras,
    loading,
    loadItems,
    filteredProducts,
    formContainers,
    formServices,
    formPackages,
    formExtras,
    containerNames,
    serviceNames,
    packageNames,
    extraNames,
    resolveImageUrl,
    mapItemToForm,
  };
}
