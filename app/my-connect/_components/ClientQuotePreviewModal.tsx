"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { PrintableEstimate } from "@/app/estimate/_components/PrintableEstimate";
import { getPricingBySelection, type ContainerOption, type Product } from "@/app/estimate/_data/catalog";
import { type CurrencyCode } from "@/lib/currency";
import { type RfqRequestRow } from "@/lib/rfq";
import { supabase } from "@/lib/supabase";

interface ClientQuotePreviewModalProps {
  request: RfqRequestRow | null;
  open: boolean;
  onClose: () => void;
}

type PrintableRow = {
  title: string;
  spec: string;
  unitPrice: number;
  quantity: number;
  amount: number;
};

type SnapshotPricing = {
  product_unit_price?: number;
  product_amount?: number;
  container_unit_price?: number;
  container_amount?: number;
  package_price?: number;
  services?: Array<{ id: string; name: string; price: number }>;
  extras?: Array<{ id: string; name: string; price: number }>;
};

type SelectionSnapshot = {
  pricing?: SnapshotPricing;
};

export function ClientQuotePreviewModal({ request, open, onClose }: ClientQuotePreviewModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);
  const [supplierMeta, setSupplierMeta] = useState<{ logo: string | null; address: string | null; location: string | null }>({
    logo: null,
    address: null,
    location: null,
  });
  const [displayRows, setDisplayRows] = useState<PrintableRow[]>([]);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!request?.manufacturer_id) return;

    let ignore = false;

    const loadSupplierMeta = async () => {
      const { data } = await supabase
        .from("manufacturers")
        .select("logo, address, location")
        .eq("id", request.manufacturer_id)
        .maybeSingle();

      if (!ignore) {
        setSupplierMeta({
          logo: data?.logo || null,
          address: (data as { address?: string | null } | null)?.address || null,
          location: data?.location || null,
        });
      }
    };

    void loadSupplierMeta();

    return () => {
      ignore = true;
    };
  }, [request?.manufacturer_id]);

  useEffect(() => {
    if (!request) {
      setDisplayRows([]);
      return;
    }

    let ignore = false;
    const selectionSnapshot = (request.selection_snapshot || {}) as SelectionSnapshot;
    const snapshotPricing = selectionSnapshot.pricing || {};

    const buildFallbackRows = () => {
      const rows: PrintableRow[] = [
        {
          title: request.product_name,
          spec: `${request.manufacturer_name} | Qty ${request.quantity.toLocaleString()}`,
          unitPrice: Number(request.unit_price || 0),
          quantity: request.quantity,
          amount: Number(request.total_price || 0),
        },
      ];

      if (request.container_name) {
        rows.push({
          title: request.container_name,
          spec: "Container option",
          unitPrice: 0,
          quantity: 1,
          amount: 0,
        });
      }

      if (request.design_summary) {
        rows.push({
          title: request.design_summary,
          spec: "Design option",
          unitPrice: 0,
          quantity: 1,
          amount: 0,
        });
      }

      return rows;
    };

    const loadDisplayRows = async () => {
      const rows: PrintableRow[] = [];

      const [productResult, containerResult, designPackageResult, designServicesResult, designExtrasResult] = await Promise.all([
        supabase
          .from("manufacturer_products")
          .select("id, manufacturer_id, base_price, discount_config")
          .eq("id", request.product_id)
          .maybeSingle(),
        request.container_id
          ? supabase
            .from("manufacturer_container_options")
            .select("id, manufacturer_id, name, add_price")
            .eq("id", request.container_id)
            .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        request.design_package_id
          ? supabase
            .from("manufacturer_design_packages")
            .select("id, name, price")
            .eq("id", request.design_package_id)
            .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        request.design_service_ids?.length
          ? supabase
            .from("manufacturer_design_services")
            .select("id, name, price")
            .in("id", request.design_service_ids)
          : Promise.resolve({ data: [], error: null }),
        request.design_extra_ids?.length
          ? supabase
            .from("manufacturer_design_extras")
            .select("id, name, price")
            .in("id", request.design_extra_ids)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const productData = productResult.data;
      const containerData = containerResult.data;

      if (!productData) {
        if (!ignore) {
          setDisplayRows(buildFallbackRows());
        }
        return;
      }

      const product: Product = {
        id: productData.id,
        manufacturerId: productData.manufacturer_id,
        category: "",
        name: request.product_name,
        description: "",
        paymentCurrency: (request.currency_code || "USD") as CurrencyCode,
        basePrice: Number(productData.base_price || 0),
        discountConfig: Object.fromEntries(
          Object.entries(productData.discount_config || {}).map(([qty, discount]) => [Number(qty), Number(discount)])
        ),
        image: "",
        keyFeatures: [],
        ingredients: [],
        directions: [],
        cautions: [],
        containerIds: request.container_id ? [request.container_id] : [],
      };

      const container: ContainerOption | null = containerData
        ? {
          id: containerData.id,
          manufacturerId: containerData.manufacturer_id,
          name: containerData.name,
          description: "",
          addPrice: Number(containerData.add_price || 0),
          image: "",
        }
        : null;

      const pricing = getPricingBySelection({
        product,
        container,
        quantity: request.quantity,
        designPrice: 0,
      });

      const productUnitPrice = Number(snapshotPricing.product_unit_price ?? pricing.discountedProductUnitPrice ?? 0);
      const productAmount = Number(snapshotPricing.product_amount ?? productUnitPrice * request.quantity);
      const containerUnitPrice = Number(snapshotPricing.container_unit_price ?? pricing.containerUnitPrice ?? 0);
      const containerAmount = Number(snapshotPricing.container_amount ?? containerUnitPrice * request.quantity);

      rows.push({
        title: request.product_name,
        spec: `${request.manufacturer_name} | 수량 ${request.quantity.toLocaleString()}`,
        unitPrice: productUnitPrice,
        quantity: request.quantity,
        amount: productAmount,
      });

      if (request.container_name) {
        rows.push({
          title: request.container_name,
          spec: "용기/포장 옵션",
          unitPrice: containerUnitPrice,
          quantity: request.quantity,
          amount: containerAmount,
        });
      }

      const packageRow = designPackageResult.data;
      if (packageRow) {
        const packagePrice = Number(snapshotPricing.package_price ?? packageRow.price ?? 0);
        rows.push({
          title: packageRow.name,
          spec: "디자인 패키지",
          unitPrice: packagePrice,
          quantity: 1,
          amount: packagePrice,
        });
      }

      const snapshotServices = snapshotPricing.services || [];
      rows.push(
        ...(designServicesResult.data || []).map((item) => {
          const snapshotService = snapshotServices.find((service) => service.id === item.id);
          const price = Number(snapshotService?.price ?? item.price ?? 0);
          return {
            title: snapshotService?.name || item.name,
            spec: "디자인 패키지",
            unitPrice: price,
            quantity: 1,
            amount: price,
          };
        })
      );

      const snapshotExtras = snapshotPricing.extras || [];
      rows.push(
        ...(designExtrasResult.data || []).map((item) => {
          const snapshotExtra = snapshotExtras.find((extra) => extra.id === item.id);
          const price = Number(snapshotExtra?.price ?? item.price ?? 0);
          return {
            title: snapshotExtra?.name || item.name,
            spec: "추가 옵션",
            unitPrice: price,
            quantity: 1,
            amount: price,
          };
        })
      );

      if (!rows.length) {
        rows.push(...buildFallbackRows());
      }

      if (!ignore) {
        setDisplayRows(rows);
      }
    };

    void loadDisplayRows();

    return () => {
      ignore = true;
    };
  }, [request]);

  const orderDate = useMemo(() => {
    if (!request) return "";
    return new Date(request.created_at).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }, [request]);

  if (!open || !request) return null;

  const handlePrint = () => {
    if (!printableRef.current) return;

    const printWindow = window.open("", "_blank", "width=1180,height=900");
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Estimate</title>
          ${styles}
          <style>
            html, body { margin: 0; background: #fff; }
          </style>
        </head>
        <body>
          ${printableRef.current.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      window.setTimeout(() => {
        printWindow.print();
      }, 150);
    };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pb-10 pt-10 print:relative print:z-0 print:block print:bg-white print:p-0">
      <div className="relative flex w-full max-w-[1180px] flex-col rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 print:max-w-none print:animate-none print:rounded-none print:shadow-none">
        <div className="sticky top-0 z-[110] flex items-center justify-between rounded-t-2xl bg-[#191f28] px-6 py-4 text-white print:hidden">
          <h4 className="text-[15px] font-bold">견적서 미리보기</h4>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-[#3182f6] px-4 py-2 text-[13px] font-bold transition-colors hover:bg-[#1b64da]"
            >
              <Printer className="h-4 w-4" />
              견적서 PDF 다운로드
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-[#eef2f6] bg-white px-6 py-5 print:hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="mt-1 text-[22px] font-bold text-[#111827]">{request.product_name}</h3>
              <p className="mt-2 text-[14px] text-[#667085]">
                {request.brand_name} | {request.manufacturer_name} | {orderDate}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(90vh-180px)] flex-1 overflow-y-auto print:max-h-none print:overflow-visible">
          <div ref={printableRef}>
            <PrintableEstimate
              orderNumber={request.order_number?.trim() || request.request_number.replace(/^RFQ-/, "DGC-")}
              orderDate={orderDate}
              totalPrice={Number(request.total_price || 0)}
              currencyCode={(request.currency_code || "USD") as CurrencyCode}
              displayRows={displayRows}
              supplierName={request.manufacturer_name}
              supplierLogo={supplierMeta.logo}
              supplierAddress={supplierMeta.address || supplierMeta.location}
              recipientBrandName={request.brand_name}
              recipientContactName={request.contact_name}
            />
          </div>

          <div className="border-t border-gray-100 bg-[#f9fafb] px-6 py-4 text-center print:hidden">
            <p className="text-[12px] font-medium text-gray-500">Only the estimate document is included when printing or saving as PDF.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
