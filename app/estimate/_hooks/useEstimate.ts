import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collectCatalogImagePaths, fetchCatalogSignedUrls, resolveCatalogImageUrl } from "@/lib/catalogImageUrls";
import { normalizeCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { MANUFACTURERS as FALLBACK_MANUFACTURERS } from "../_data/constants";
import {
  type ContainerOption,
  type DesignExtraItem,
  type DesignOption,
  type DesignPackageItem,
  type DesignServiceItem,
  type Product,
  getContainerById,
  getDesignSelectionsSummary,
  getPricingBySelection,
  getProductById,
} from "../_data/catalog";

interface Manufacturer {
  id: number;
  name: string;
  location: string;
  address?: string;
  rating: number;
  description: string;
  tags: string[];
  products: string[];
  image: string;
  logo: string;
  catalog_currency?: CurrencyCode | null;
}

type ProductRow = {
  id: string;
  manufacturer_id: number;
  category: string;
  name: string;
  description: string | null;
  payment_currency: CurrencyCode | null;
  base_price: number;
  discount_config: Record<string, number> | null;
  image: string | null;
  key_features: string[] | null;
  ingredients: string[] | null;
  directions: string[] | null;
  cautions: string[] | null;
  container_ids: string[] | null;
  design_service_ids: string[] | null;
  design_package_ids: string[] | null;
  design_extra_ids: string[] | null;
};

type ContainerRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  description: string | null;
  add_price: number;
  image: string | null;
  payment_currency: CurrencyCode | null;
};

type DesignOptionRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  price: number;
  is_default: boolean | null;
};

type DesignServiceRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  description: string | null;
  price: number;
  payment_currency: CurrencyCode | null;
};

type DesignPackageRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  badge: string | null;
  description: string | null;
  price: number;
  included: string[] | null;
  payment_currency: CurrencyCode | null;
};

type DesignExtraRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  description: string | null;
  price: number;
  payment_currency: CurrencyCode | null;
};

type CatalogSnapshot = {
  manufacturerCurrency: CurrencyCode | null;
  productRows: ProductRow[];
  containerRows: ContainerRow[];
  designOptionRows: DesignOptionRow[];
  designServiceRows: DesignServiceRow[];
  designPackageRows: DesignPackageRow[];
  designExtraRows: DesignExtraRow[];
};

const mapProduct = (
  row: ProductRow,
  signedUrls: Record<string, string>,
  currencyCode?: CurrencyCode | null
): Product => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  category: row.category,
  name: row.name,
  description: row.description || "",
  paymentCurrency: normalizeCurrencyCode(row.payment_currency || currencyCode || "USD"),
  basePrice: row.base_price,
  discountConfig: Object.fromEntries(
    Object.entries(row.discount_config || {}).map(([qty, discount]) => [Number(qty), Number(discount)])
  ),
  image: resolveCatalogImageUrl(row.image, signedUrls),
  keyFeatures: row.key_features || [],
  ingredients: row.ingredients || [],
  directions: row.directions || [],
  cautions: row.cautions || [],
  containerIds: row.container_ids || [],
  designServiceIds: row.design_service_ids,
  designPackageIds: row.design_package_ids,
  designExtraIds: row.design_extra_ids,
});

const mapContainer = (row: ContainerRow, signedUrls: Record<string, string>): ContainerOption => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  description: row.description || "",
  addPrice: row.add_price,
  image: resolveCatalogImageUrl(row.image, signedUrls),
  paymentCurrency: normalizeCurrencyCode(row.payment_currency || "USD"),
});

const mapDesignOption = (row: DesignOptionRow): DesignOption => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  price: row.price,
  isDefault: row.is_default || false,
});

const mapDesignService = (row: DesignServiceRow): DesignServiceItem => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  description: row.description || undefined,
  price: row.price,
  paymentCurrency: normalizeCurrencyCode(row.payment_currency || "USD"),
});

const mapDesignPackage = (row: DesignPackageRow): DesignPackageItem => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  badge: row.badge || undefined,
  description: row.description || undefined,
  price: row.price,
  included: row.included || [],
  paymentCurrency: normalizeCurrencyCode(row.payment_currency || "USD"),
});

const mapDesignExtra = (row: DesignExtraRow): DesignExtraItem => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  description: row.description || "",
  price: row.price,
  paymentCurrency: normalizeCurrencyCode(row.payment_currency || "USD"),
});

export const useEstimate = () => {
  const searchParams = useSearchParams();
  const requestedManufacturerId = Number(searchParams.get("manufacturer"));
  const requestedStep = Number(searchParams.get("step"));
  const initialManufacturerId =
    requestedManufacturerId && !Number.isNaN(requestedManufacturerId) ? requestedManufacturerId : null;

  const [currentStep, setCurrentStep] = useState(initialManufacturerId && requestedStep === 2 ? 2 : 1);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [designOptions, setDesignOptions] = useState<DesignOption[]>([]);
  const [designServices, setDesignServices] = useState<DesignServiceItem[]>([]);
  const [designPackages, setDesignPackages] = useState<DesignPackageItem[]>([]);
  const [designExtras, setDesignExtras] = useState<DesignExtraItem[]>([]);
  const catalogCacheRef = useRef(new Map<number, CatalogSnapshot>());
  const signedUrlCacheRef = useRef<Record<string, string>>({});
  const [selection, setSelection] = useState({
    manufacturer: initialManufacturerId as number | null,
    product: null as string | null,
    quantity: 50,
    container: null as string | null,
    design: null as string | null,
    designServices: [] as string[],
    designPackage: null as string | null,
    designExtras: [] as string[],
  });
  useEffect(() => {
    const fetchManufacturers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("manufacturers").select("*").order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        setManufacturers(data as Manufacturer[]);
      } else {
        setManufacturers(FALLBACK_MANUFACTURERS as Manufacturer[]);
      }
      setLoading(false);
    };

    void fetchManufacturers();
  }, []);

  useEffect(() => {
    const manufacturerId = selection.manufacturer;
    let ignore = false;

    const applyCatalogSnapshot = (snapshot: CatalogSnapshot) => {
      const signedUrls = signedUrlCacheRef.current;
      setProducts(snapshot.productRows.map((row) => mapProduct(row, signedUrls, snapshot.manufacturerCurrency)));
      setContainers(snapshot.containerRows.map((row) => mapContainer(row, signedUrls)));
      setDesignOptions(snapshot.designOptionRows.map(mapDesignOption));
      setDesignServices(snapshot.designServiceRows.map(mapDesignService));
      setDesignPackages(snapshot.designPackageRows.map(mapDesignPackage));
      setDesignExtras(snapshot.designExtraRows.map(mapDesignExtra));
    };

    const fetchCatalog = async () => {
      setCatalogLoading(true);

      if (!manufacturerId) {
        setProducts([]);
        setContainers([]);
        setDesignOptions([]);
        setDesignServices([]);
        setDesignPackages([]);
        setDesignExtras([]);
        setCatalogLoading(false);
        return;
      }

      let snapshot = catalogCacheRef.current.get(manufacturerId);
      if (!snapshot) {
        const manufacturerCurrency =
          manufacturers.find((manufacturer) => manufacturer.id === manufacturerId)?.catalog_currency || null;

        const [
          productsResult,
          containersResult,
          designOptionsResult,
          designServicesResult,
          designPackagesResult,
          designExtrasResult,
        ] = await Promise.all([
          supabase
            .from("manufacturer_products")
            .select("*")
            .eq("manufacturer_id", manufacturerId)
            .eq("is_active", true)
            .order("name", { ascending: true }),
          supabase
            .from("manufacturer_container_options")
            .select("*")
            .eq("manufacturer_id", manufacturerId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("manufacturer_design_options")
            .select("*")
            .eq("manufacturer_id", manufacturerId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("manufacturer_design_services")
            .select("*")
            .eq("manufacturer_id", manufacturerId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("manufacturer_design_packages")
            .select("*")
            .eq("manufacturer_id", manufacturerId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("manufacturer_design_extras")
            .select("*")
            .eq("manufacturer_id", manufacturerId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

        snapshot = {
          manufacturerCurrency,
          productRows: (productsResult.data as ProductRow[] | null) || [],
          containerRows: (containersResult.data as ContainerRow[] | null) || [],
          designOptionRows: (designOptionsResult.data as DesignOptionRow[] | null) || [],
          designServiceRows: (designServicesResult.data as DesignServiceRow[] | null) || [],
          designPackageRows: (designPackagesResult.data as DesignPackageRow[] | null) || [],
          designExtraRows: (designExtrasResult.data as DesignExtraRow[] | null) || [],
        };
        catalogCacheRef.current.set(manufacturerId, snapshot);
      }

      if (ignore) return;

      applyCatalogSnapshot(snapshot);
      setCatalogLoading(false);

      const missingPaths = collectCatalogImagePaths([
        ...snapshot.productRows.map((row) => row.image),
        ...snapshot.containerRows.map((row) => row.image),
      ]).filter((path) => !signedUrlCacheRef.current[path]);

      if (missingPaths.length === 0) {
        return;
      }

      try {
        const nextSignedImageUrls = await fetchCatalogSignedUrls(missingPaths);
        if (ignore || Object.keys(nextSignedImageUrls).length === 0) {
          return;
        }

        signedUrlCacheRef.current = {
          ...signedUrlCacheRef.current,
          ...nextSignedImageUrls,
        };

        if (selection.manufacturer === manufacturerId) {
          applyCatalogSnapshot(snapshot);
        }
      } catch (error) {
        console.error("[estimate catalog image urls]", error);
      }
    };

    void fetchCatalog();

    return () => {
      ignore = true;
    };
  }, [manufacturers, selection.manufacturer]);

  const selectedProduct = useMemo(() => getProductById(products, selection.product), [products, selection.product]);

  const selectedManufacturer = useMemo(
    () => manufacturers.find((manufacturer) => manufacturer.id === selection.manufacturer) || null,
    [manufacturers, selection.manufacturer]
  );

  const selectedContainer = useMemo(
    () =>
      selectedProduct
        ? getContainerById(
            containers.filter((container) => selectedProduct.containerIds.includes(container.id) && container.paymentCurrency === selectedProduct.paymentCurrency),
            selection.container
          )
        : null,
    [containers, selectedProduct, selection.container]
  );

  const availableDesignServices = useMemo(() => {
    if (!selectedProduct) return designServices;
    if (selectedProduct.designServiceIds == null) return designServices;
    return designServices.filter((item) => selectedProduct.designServiceIds?.includes(item.id) && item.paymentCurrency === selectedProduct.paymentCurrency);
  }, [designServices, selectedProduct]);

  const availableDesignPackages = useMemo(() => {
    if (!selectedProduct) return designPackages;
    if (selectedProduct.designPackageIds == null) return designPackages;
    return designPackages.filter((item) => selectedProduct.designPackageIds?.includes(item.id) && item.paymentCurrency === selectedProduct.paymentCurrency);
  }, [designPackages, selectedProduct]);

  const availableDesignExtras = useMemo(() => {
    if (!selectedProduct) return designExtras;
    if (selectedProduct.designExtraIds == null) return designExtras;
    return designExtras.filter((item) => selectedProduct.designExtraIds?.includes(item.id) && item.paymentCurrency === selectedProduct.paymentCurrency);
  }, [designExtras, selectedProduct]);

  const selectedDesign = useMemo(
    () =>
      getDesignSelectionsSummary({
        designOptions,
        designServices: availableDesignServices,
        designPackages: availableDesignPackages,
        designExtras: availableDesignExtras,
        design: selection.design,
        selectedServiceIds: selection.designServices,
        selectedPackageId: selection.designPackage,
        selectedExtraIds: selection.designExtras,
      }),
    [
      availableDesignExtras,
      designOptions,
      availableDesignPackages,
      availableDesignServices,
      selection.design,
      selection.designExtras,
      selection.designPackage,
      selection.designServices,
    ]
  );

  const pricing = useMemo(
    () =>
      getPricingBySelection({
        product: selectedProduct,
        container: selectedContainer,
        quantity: selection.quantity,
        designPrice: selectedDesign?.price || 0,
      }),
    [selectedProduct, selectedContainer, selection.quantity, selectedDesign]
  );

  const unitPrice = selection.product && currentStep > 1 ? pricing.unitPrice : 0;
  const totalPrice = selection.product && currentStep > 1 ? pricing.totalPrice : 0;

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const resetSelection = () => {
    setCurrentStep(1);
    setSelection({
      manufacturer: null,
      product: null,
      quantity: 50,
      container: null,
      design: null,
      designServices: [],
      designPackage: null,
      designExtras: [],
    });
  };

  return {
    currentStep,
    setCurrentStep,
    selection,
    setSelection,
    manufacturers,
    loading,
    catalogLoading,
    products,
    containers,
    designOptions,
    designServices: availableDesignServices,
    designPackages: availableDesignPackages,
    designExtras: availableDesignExtras,
    selectedProduct,
    selectedManufacturer,
    selectedContainer,
    selectedDesign,
    unitPrice,
    totalPrice,
    handleNext,
    handleBack,
    resetSelection,
  };
};
