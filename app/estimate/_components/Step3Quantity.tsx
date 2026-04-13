"use client";

import { Minus, Package2, Plus, RotateCcw, Check } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";

import {
  formatPriceText,
  getContainersByProduct,
  getDynamicDiscounts,
  type ContainerOption,
  type EstimateSelection,
  type Product,
} from "../_data/catalog";

export function Step3Quantity({
  containers,
  selection,
  setSelection,
  selectedProduct,
  selectedContainer,
  onReset,
}: {
  containers: ContainerOption[];
  selection: EstimateSelection;
  setSelection: (value: EstimateSelection) => void;
  selectedProduct: Product | null;
  selectedContainer: ContainerOption | null;
  onReset: () => void;
}) {
  const currencyCode = selectedProduct?.paymentCurrency || "USD";
  const dynamicDiscounts = getDynamicDiscounts(selectedProduct);
  const availableContainers = getContainersByProduct(containers, selectedProduct);

  const updateQty = (newQty: number) => {
    if (newQty < 50) return;
    setSelection({ ...selection, quantity: newQty });
  };

  const handleQtySelect = (qty: number) => {
    setSelection({ ...selection, quantity: qty });
  };

  const handleContainerSelect = (id: string | null) => {
    setSelection({ ...selection, container: id });
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#f2f4f6] pb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-[#191f28]">수량 및 용기 선택</h2>
          <p className="mt-1 text-[14px] text-[#4e5968]">제조 수량에 따른 할인 혜택과 패키징 옵션을 확인하세요.</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-full bg-[#f2f4f6] px-3 py-2 text-[12px] font-bold text-[#4e5968] hover:bg-[#e5e8eb] transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 처음으로
        </button>
      </div>

      <div className="grid gap-8">
        {/* 수량 설정 섹션 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#191f28]">주문 수량 설정</h3>
            <div className="flex items-center gap-2 rounded-[6px] bg-[#f2f8ff] px-3 py-1.5 text-[12px] font-bold text-[#3182f6]">
              현재 {selection.quantity.toLocaleString()}개 선택됨
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 rounded-[12px] border border-[#e5e8eb] bg-white p-6">
            <div className="flex h-12 w-full md:w-[200px] items-center overflow-hidden rounded-[8px] border-2 border-[#f2f4f6] bg-white">
              <button
                onClick={() => updateQty(selection.quantity - 50)}
                className="flex h-full w-14 items-center justify-center hover:bg-[#f9fafb] text-[#8b95a1]"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex h-full flex-1 items-center justify-center border-x border-[#f2f4f6]">
                <span className="text-[16px] font-bold text-[#191f28]">{selection.quantity.toLocaleString()}</span>
                <span className="ml-1 text-[14px] font-medium text-[#8b95a1]">개</span>
              </div>
              <button
                onClick={() => updateQty(selection.quantity + 50)}
                className="flex h-full w-14 items-center justify-center hover:bg-[#f9fafb] text-[#3182f6]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[12px] leading-relaxed text-[#8b95a1]">
              수량을 직접 조절하거나 아래의 수량 구간별 <br className="hidden md:block" />
              할인 단가를 클릭하여 즉시 적용할 수 있습니다.
            </p>
          </div>

          {/* 수량별 할인 리스트  */}
          <div className="grid gap-2">
            {dynamicDiscounts.map((row, index) => {
              const nextQty = dynamicDiscounts[index + 1]?.qty;
              const isCurrentRange = selection.quantity >= row.qty && (!nextQty || selection.quantity < nextQty);
              const discountedProductUnitPrice = (selectedProduct?.basePrice || 0) * row.discount;
              const unitPrice = discountedProductUnitPrice + (selectedContainer?.addPrice || 0);

              return (
                <button
                  key={row.qty}
                  onClick={() => handleQtySelect(row.qty)}
                  className={`flex w-full items-center justify-between rounded-[8px] border p-3 transition-all ${isCurrentRange
                    ? "border-[#3182f6] bg-[#f2f8ff] shadow-sm"
                    : "border-[#e5e8eb] bg-white hover:border-[#3182f6]"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isCurrentRange ? "border-[#3182f6] bg-[#3182f6]" : "border-[#d1d6db]"
                      }`}>
                      {isCurrentRange && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <div className="text-left">
                      <p className={`text-[14px] font-bold ${isCurrentRange ? "text-[#3182f6]" : "text-[#191f28]"}`}>
                        {row.label}
                      </p>
                      <p className="text-[11px] font-medium text-[#3182f6]">{row.note}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-medium text-[#8b95a1]">개당 단가</p>
                    <p className={`text-[14px] font-bold ${isCurrentRange ? "text-[#3182f6]" : "text-[#191f28]"}`}>
                      {formatCurrency(unitPrice, currencyCode)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 용기 선택 섹션 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#191f28]">용기 옵션 선택</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">


            {availableContainers.map((container) => {
              const isSelected = selection.container === container.id;

              return (
                <button
                  key={container.id}
                  onClick={() => handleContainerSelect(container.id)}
                  className={`flex items-center gap-4 rounded-[12px] border p-4 text-left transition-all ${isSelected
                    ? "border-[#3182f6] bg-[#f2f8ff] shadow-sm"
                    : "border-[#e5e8eb] bg-white hover:border-[#3182f6]"
                    }`}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border border-[#f2f4f6] bg-[#f7f9fa]">
                    {container.image ? (
                      <Image src={container.image} alt={container.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package2 className="h-6 w-6 text-[#d1d6db]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-[#191f28]">{container.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[#8b95a1]">{container.description}</p>
                    <p className="mt-2 text-[12px] font-bold text-[#3182f6]">{formatPriceText(container.addPrice, currencyCode)}</p>
                  </div>

                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#3182f6] bg-[#3182f6]" : "border-[#d1d6db]"
                    }`}>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
