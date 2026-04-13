import { Clock } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  type ContainerOption,
  type DesignExtraItem,
  type DesignOption,
  type DesignPackageItem,
  type DesignServiceItem,
  type EstimateSelection,
  type Product,
  getPricingBySelection,
} from "../_data/catalog";

interface FooterBarProps {
  designExtras: DesignExtraItem[];
  designPackages: DesignPackageItem[];
  designServices: DesignServiceItem[];
  selectedProduct: Product | null;
  selectedContainer: ContainerOption | null;
  selection: EstimateSelection;
  selectedDesign: DesignOption | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function FooterBar({
  selectedProduct,
  selectedContainer,
  quantity,
  unitPrice,
  totalPrice,
}: FooterBarProps) {
  const pricing = getPricingBySelection({
    product: selectedProduct,
    container: selectedContainer,
    quantity,
  });

  return (
    <footer className="fixed bottom-0 left-0 z-50 w-full border-t border-[#e5e8eb] bg-white/90 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-md">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="flex items-center justify-between gap-8">
          {selectedProduct ? (
            <>
              <div className="flex items-center gap-10">
                <div className="hidden md:block">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8b95a1]">
                    <Clock className="h-3.5 w-3.5 text-[#3182f6]" /> 예상 제조
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold text-[#191f28]">약 3~4주</p>
                </div>

                <div className="h-8 w-[1px] bg-[#f2f4f6] hidden md:block" />

                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8b95a1]">
                    개당 단가
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold text-[#3182f6]">{formatCurrency(unitPrice, selectedProduct.paymentCurrency)}</p>
                </div>

                <div className="h-8 w-[1px] bg-[#f2f4f6] hidden lg:block" />

                <div className="hidden lg:block min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b95a1]">선택 요약</p>
                  <p className="mt-0.5 truncate text-[14px] font-medium text-[#4e5968]">
                    {selectedProduct.name} / {selectedContainer?.name || "기본"} / {quantity.toLocaleString()}개
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b95a1]">최종 예상 합계</p>
                  <div className="flex flex-col items-end">
                    <p className="text-[24px] font-black tracking-tight text-[#191f28]">
                      {formatCurrency(totalPrice, selectedProduct.paymentCurrency)}
                    </p>
                    {pricing.currentDiscountRow.discount < 1 && (
                      <span className="text-[11px] font-bold text-[#3182f6]">
                        {Math.round((1 - pricing.currentDiscountRow.discount) * 100)}% 할인 적용됨
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex w-full items-center justify-center py-2">
              <p className="text-[14px] font-medium text-[#8b95a1]">
                제품을 선택하시면 실시간 견적 정보가 활성화됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
