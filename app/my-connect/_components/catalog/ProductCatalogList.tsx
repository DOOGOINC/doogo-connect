/* eslint-disable @next/next/no-img-element */
import { Edit3, Image as ImageIcon, Power, Trash2 } from "lucide-react";
import { formatCurrency, normalizeCurrencyCode } from "@/lib/currency";
import { getCatalogImageUrl } from "@/lib/catalogImageUpload";

import { ProductForm, ProductRow } from "./productCatalogShared";

type ProductCatalogListProps = {
  items: ProductRow[];
  containerNames: Record<string, string>;
  onEdit: (form: ProductForm) => void;
  onDelete: (id: string) => void;
  onToggleActive: (item: ProductRow) => void;
  mapItemToForm: (item: ProductRow) => ProductForm;
};

export function ProductCatalogList({
  items,
  containerNames,
  onEdit,
  onDelete,
  onToggleActive,
  mapItemToForm,
}: ProductCatalogListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-[#F2F4F6] text-left">
            <th className="pb-4 pl-2 text-[13px] font-semibold text-[#8B95A1]">상품 ID / 이름</th>
            <th className="hidden pb-4 text-[13px] font-semibold text-[#8B95A1] lg:table-cell">카테고리 / 연결 용기</th>
            <th className="hidden pb-4 text-[13px] font-semibold text-[#8B95A1] md:table-cell">상세 설명</th>
            <th className="pb-4 text-right text-[13px] font-semibold text-[#8B95A1]">기본 가격</th>
            <th className="pb-4 text-center text-[13px] font-semibold text-[#8B95A1]">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2F4F6]">
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-20 text-center text-[14px] text-[#8B95A1]">
                등록된 상품이 없습니다.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className={`group hover:bg-[#F9FAFB] ${item.is_active === false ? "bg-[#FCFCFD]" : ""}`}>
                <td className="py-4 pl-2">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-[#F2F4F6] bg-[#F7F9FA]">
                      {item.image ? (
                        <img src={getCatalogImageUrl(item.image)} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <ImageIcon className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-[#ADB5BD]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-[#8B95A1]">{item.id}</div>
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[15px] font-bold text-[#191F28]">{item.name}</div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-[999px] px-2.5 py-1 text-[10px] font-semibold ${
                            item.is_active === false
                              ? "bg-[#F2F4F6] text-[#667085]"
                              : "bg-[#ECFDF3] text-[#027A48]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.is_active === false ? "bg-[#98A2B3]" : "bg-[#12B76A]"
                            }`}
                          />
                          {item.is_active === false ? "비활성화됨" : "활성화됨"}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="hidden py-4 lg:table-cell">
                  <div className="min-w-[180px]">
                    <div className="text-[12px] font-semibold text-[#3182F6]">{item.category}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(item.container_ids || []).length > 0 ? (
                        (item.container_ids || []).map((containerId) => (
                          <span
                            key={containerId}
                            className="rounded-[999px] bg-[#F2F4F6] px-2.5 py-1 text-[11px] font-medium text-[#6B7684]"
                          >
                            {containerNames[containerId] || containerId}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-[#98A2B3]">연결 용기 없음</span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="hidden max-w-xs py-4 text-[14px] text-[#4E5968] md:table-cell">
                  <p className="truncate">{item.description || "-"}</p>
                </td>

                <td className="py-4 text-right">
                  <span className="text-[15px] font-bold text-[#3182F6]">
                    {formatCurrency(item.base_price, normalizeCurrencyCode(item.payment_currency))}
                  </span>
                </td>

                <td className="py-4 text-center">
                  <div className="flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onToggleActive(item)}
                      className={`flex h-8 items-center justify-center gap-1 rounded-[8px] px-2 text-[11px] font-semibold transition ${
                        item.is_active === false
                          ? "text-[#1570EF] hover:bg-[#EFF8FF]"
                          : "text-[#F04452] hover:bg-red-50"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {item.is_active === false ? "활성화" : "비활성화"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(mapItemToForm(item))}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#4E5968] hover:bg-[#E5E8EB] hover:text-[#191F28]"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#F04452] hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
