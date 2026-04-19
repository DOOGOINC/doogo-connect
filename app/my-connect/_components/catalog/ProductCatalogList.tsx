/* eslint-disable @next/next/no-img-element */
import { Edit3, Image as ImageIcon, Power, Trash2, Box, PenTool, Layout, PlusCircle, type LucideIcon } from "lucide-react";
import { formatCurrency, normalizeCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { ProductForm, ProductRow } from "./productCatalogShared";

type ProductCatalogListProps = {
  items: ProductRow[];
  currencyCode: CurrencyCode;
  containerNames: Record<string, string>;
  serviceNames: Record<string, string>;
  packageNames: Record<string, string>;
  extraNames: Record<string, string>;
  onEdit: (form: ProductForm) => void;
  onDelete: (id: string) => void;
  onToggleActive: (item: ProductRow) => void;
  mapItemToForm: (item: ProductRow) => ProductForm;
  resolveImageUrl: (pathOrUrl: string | null | undefined) => string;
};

function OptionSummary({ 
  icon: Icon, 
  label, 
  ids, 
  names 
}: { 
  icon: LucideIcon,
  label: string, 
  ids: string[] | null | undefined, 
  names: Record<string, string> 
}) {
  const count = ids?.length || 0;
  const activeNames = ids?.map(id => names[id]).filter(Boolean) || [];
  
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-[#F8F9FA] px-2 py-1 text-[11px] text-[#4E5968]">
      <Icon className="h-3 w-3 text-[#8B95A1]" />
      <span className="font-medium">{label}</span>
      <span className="font-bold text-[#3182F6]">{count}</span>
      <div className="ml-1 h-3 w-[1px] bg-[#E5E8EB]" />
      <span className="max-w-[120px] truncate text-[#8B95A1]">{activeNames.join(", ")}</span>
    </div>
  );
}

export function ProductCatalogList({
  items,
  currencyCode,
  containerNames,
  serviceNames,
  packageNames,
  extraNames,
  onEdit,
  onDelete,
  onToggleActive,
  mapItemToForm,
  resolveImageUrl,
}: ProductCatalogListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#E5E8EB] bg-white py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F8F9FA]">
          <Box className="h-8 w-8 text-[#ADB5BD]" />
        </div>
        <p className="mt-4 text-[15px] font-medium text-[#8B95A1]">
          {currencyCode} 통화로 등록된 상품이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div
          key={item.id} 
          className={`group relative flex flex-col gap-6 rounded-[16px] border border-[#E5E8EB] bg-white p-5 transition-all hover:border-[#3182F6] hover:shadow-[0_8px_24px_rgba(49,130,246,0.08)] sm:flex-row ${
            item.is_active === false ? "opacity-75" : ""
          }`}
        >
          {/* Image Section */}
          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-[12px] border border-[#F2F4F6] bg-[#F9FAFB] sm:h-32 sm:w-32">
            {resolveImageUrl(item.image) ? (
              <img src={resolveImageUrl(item.image)} className="h-full w-full object-cover transition-transform group-hover:scale-105" alt="" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-[#D1D5DB]" />
              </div>
            )}
            <div className="absolute left-2 top-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
                  item.is_active === false ? "bg-white text-[#667085]" : "bg-[#3182F6] text-white"
                }`}
              >
                {item.is_active === false ? "비활성" : "활성"}
              </span>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-1 flex-col justify-between">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[#3182F6]">
                    <span>{item.category}</span>
                    <span className="h-3 w-[1px] bg-[#D1D5DB]" />
                    <span className="text-[#8B95A1]">{item.id}</span>
                  </div>
                  <h3 className="mt-1 truncate text-[18px] font-bold text-[#191F28]">{item.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-[20px] font-extrabold text-[#191F28]">
                    {formatCurrency(item.base_price, normalizeCurrencyCode(item.payment_currency))}
                  </div>
                  <div className="text-[12px] font-medium text-[#8B95A1]">기본가</div>
                </div>
              </div>

              {/* Linked Options Summary */}
              <div className="mt-4 flex flex-wrap gap-2">
                <OptionSummary icon={Box} label="용기" ids={item.container_ids} names={containerNames} />
                <OptionSummary icon={PenTool} label="서비스" ids={item.design_service_ids} names={serviceNames} />
                <OptionSummary icon={Layout} label="패키지" ids={item.design_package_ids} names={packageNames} />
                <OptionSummary icon={PlusCircle} label="추가" ids={item.design_extra_ids} names={extraNames} />
                
                {(!item.container_ids?.length && !item.design_service_ids?.length && !item.design_package_ids?.length && !item.design_extra_ids?.length) && (
                  <span className="text-[12px] text-[#98A2B3]">연결된 옵션이 없습니다.</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-between border-t border-[#F2F4F6] pt-4">
              <div className="flex items-center gap-4 text-[12px] text-[#8B95A1]">
                <span className="flex items-center gap-1">
                  결제통화: <strong className="text-[#4E5968]">{normalizeCurrencyCode(item.payment_currency)}</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleActive(item)}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold transition ${
                    item.is_active === false 
                      ? "bg-[#F2F8FF] text-[#3182F6] hover:bg-[#E1EFFF]" 
                      : "bg-[#FFF0F0] text-[#F04452] hover:bg-[#FFE5E5]"
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {item.is_active === false ? "활성화" : "비활성화"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(mapItemToForm(item))}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#E5E8EB] bg-white px-3 text-[13px] font-semibold text-[#4E5968] transition hover:bg-[#F8F9FA] hover:text-[#191F28]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#FFE5E5] bg-white text-[#F04452] transition hover:bg-[#FFF0F0]"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
