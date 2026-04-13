"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Package, Info, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getProductDetails, type ContainerOption, type Product } from "../_data/catalog";

interface SummaryAsideProps {
  selectedProduct: Product | null;
  selectedManufacturer: { image?: string; name?: string } | null;
  selectedContainer: ContainerOption | null;
  currentStep: number;
  totalPrice: number;
  unitPrice: number;
  quantity: number;
}

export function SummaryAside({
  selectedProduct,
  selectedManufacturer,
  selectedContainer,
  currentStep,
  totalPrice,
  unitPrice,
  quantity
}: SummaryAsideProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const productDetails = getProductDetails(selectedProduct);

  const displayImage =
    currentStep === 1 ? selectedManufacturer?.image || selectedProduct?.image : selectedProduct?.image || selectedManufacturer?.image;

  return (
    <aside className="sticky top-28 h-fit w-full space-y-4">
      <div className="overflow-hidden rounded-[8px] border border-[#e5e8eb] bg-white shadow-sm">
        {/* 이미지 섹션 */}
        <div className="relative aspect-[16/9] w-full bg-[#f7f9fa]">
          {displayImage ? (
            <Image
              key={displayImage}
              src={displayImage}
              alt="Preview"
              fill
              className="animate-in object-cover duration-500 fade-in zoom-in-95"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Package className="mb-4 h-16 w-16 text-[#e5e8eb]" />
              <p className="text-[14px] font-medium leading-relaxed text-[#8b95a1]">
                {currentStep === 1 ? "제조사를 선택하시면\n미리보기가 표시됩니다." : "제품을 선택해주세요."}
              </p>
            </div>
          )}
        </div>

        {/* 요약 정보 섹션 */}
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#191f28]">실시간 견적 요약</h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#8b95a1] hover:text-[#191f28]"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>

          {selectedProduct ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#8b95a1]">선택한 제품</span>
                  <span className="text-right text-[12px] font-bold text-[#191f28]">{selectedProduct.name}</span>
                </div>
                {selectedManufacturer?.name && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12px] font-medium text-[#8b95a1]">제조 파트너</span>
                    <span className="text-right text-[12px] font-bold text-[#191f28]">{selectedManufacturer.name}</span>
                  </div>
                )}
                {selectedContainer && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12px] font-medium text-[#8b95a1]">용기 옵션</span>
                    <span className="text-right text-[12px] font-bold text-[#191f28]">{selectedContainer.name}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#8b95a1]">주문 수량</span>
                  <span className="text-right text-[12px] font-bold text-[#191f28]">{quantity.toLocaleString()}개</span>
                </div>
              </div>

              <div className="border-t border-dashed border-[#e5e8eb] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#4e5968]">개당 예상 단가</span>
                  <span className="text-[14px] font-bold text-[#3182f6]">{formatCurrency(unitPrice, selectedProduct.paymentCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#191f28]">최종 예상 합계</span>
                  <span className="text-[18px] font-black text-[#3182f6]">
                    {formatCurrency(totalPrice, selectedProduct.paymentCurrency)}
                  </span>
                </div>
                <p className="mt-1 text-right text-[10px] text-[#8b95a1]">* VAT 별도 금액입니다.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Info className="mb-2 h-5 w-5 text-[#e5e8eb]" />
              <p className="text-[13px] text-[#8b95a1]">항목을 선택하시면 견적서에 반영됩니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 제품 상세 정보  */}
      {selectedProduct && productDetails && isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-[12px] border border-[#e5e8eb] bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#3182f6]">Key Features</h4>
              <div className="flex flex-wrap gap-1.5">
                {productDetails.keyFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-1 rounded-full bg-[#f2f8ff] px-2.5 py-1 text-[11px] font-medium text-[#3182f6]">
                    <CheckCircle2 className="h-3 w-3" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[1px] bg-[#f2f4f6]" />
            <div>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#3182f6]">Ingredients</h4>
              <p className="text-[13px] leading-relaxed text-[#6b7684]">
                {productDetails.ingredients.join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
