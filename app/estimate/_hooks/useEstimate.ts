import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { getCatalogImageUrl } from "@/lib/catalogImageUpload";
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
};

type ContainerRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  description: string | null;
  add_price: number;
  image: string | null;
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
};

type DesignPackageRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  badge: string | null;
  description: string | null;
  price: number;
  included: string[] | null;
};

type DesignExtraRow = {
  id: string;
  manufacturer_id: number;
  name: string;
  description: string | null;
  price: number;
};

const mapProduct = (row: ProductRow, currencyCode?: CurrencyCode | null): Product => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  category: row.category,
  name: row.name,
  description: row.description || "",
  paymentCurrency: normalizeCurrencyCode(currencyCode || row.payment_currency || "USD"),
  basePrice: row.base_price,
  discountConfig: Object.fromEntries(
    Object.entries(row.discount_config || {}).map(([qty, discount]) => [Number(qty), Number(discount)])
  ),
  image: getCatalogImageUrl(row.image),
  keyFeatures: row.key_features || [],
  ingredients: row.ingredients || [],
  directions: row.directions || [],
  cautions: row.cautions || [],
  containerIds: row.container_ids || [],
});

const mapContainer = (row: ContainerRow): ContainerOption => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  description: row.description || "",
  addPrice: row.add_price,
  image: getCatalogImageUrl(row.image),
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
});

const mapDesignPackage = (row: DesignPackageRow): DesignPackageItem => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  badge: row.badge || undefined,
  description: row.description || undefined,
  price: row.price,
  included: row.included || [],
});

const mapDesignExtra = (row: DesignExtraRow): DesignExtraItem => ({
  id: row.id,
  manufacturerId: row.manufacturer_id,
  name: row.name,
  description: row.description || "",
  price: row.price,
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

      setProducts(((productsResult.data as ProductRow[] | null) || []).map((row) => mapProduct(row, manufacturerCurrency)));
      setContainers(((containersResult.data as ContainerRow[] | null) || []).map(mapContainer));
      setDesignOptions(((designOptionsResult.data as DesignOptionRow[] | null) || []).map(mapDesignOption));
      setDesignServices(((designServicesResult.data as DesignServiceRow[] | null) || []).map(mapDesignService));
      setDesignPackages(((designPackagesResult.data as DesignPackageRow[] | null) || []).map(mapDesignPackage));
      setDesignExtras(((designExtrasResult.data as DesignExtraRow[] | null) || []).map(mapDesignExtra));
      setCatalogLoading(false);
    };

    void fetchCatalog();
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
            containers.filter((container) => selectedProduct.containerIds.includes(container.id)),
            selection.container
          )
        : null,
    [containers, selectedProduct, selection.container]
  );

  const selectedDesign = useMemo(
    () =>
      getDesignSelectionsSummary({
        designOptions,
        designServices,
        designPackages,
        designExtras,
        design: selection.design,
        selectedServiceIds: selection.designServices,
        selectedPackageId: selection.designPackage,
        selectedExtraIds: selection.designExtras,
      }),
    [
      designExtras,
      designOptions,
      designPackages,
      designServices,
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
    designServices,
    designPackages,
    designExtras,
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
