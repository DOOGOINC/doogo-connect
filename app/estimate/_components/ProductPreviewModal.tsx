"use client";

import Image from "next/image";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getDynamicDiscounts, getProductDetails, type Product } from "../_data/catalog";

export function ProductPreviewModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const details = getProductDetails(product);
  const pricingRows = getDynamicDiscounts(product);

  if (!product || !details) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#191f28]/70 p-4 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose} 
      />
      
      <div className="relative flex max-h-[90vh] w-full max-w-4xl animate-in zoom-in-95 slide-in-from-bottom-4 flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[#f2f4f6] px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#191f28]">제품 상세 정보</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b95a1] transition-colors hover:bg-[#f2f4f6] hover:text-[#191f28]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[320px_1fr]">
            {/* 좌측: 이미지 및 기본 정보 */}
            <div className="space-y-6">
              <div className="relative aspect-square overflow-hidden rounded-[12px] border border-[#f2f4f6] bg-[#f7f9fa]">
                <Image src={product.image} alt={product.name} fill className="object-cover" />
              </div>
              
              <div className="rounded-[12px] bg-[#f7f9fa] p-5">
                <h3 className="mb-3 text-[14px] font-bold text-[#191f28]">수량별 할인 단가</h3>
                <div className="space-y-2">
                  {pricingRows.slice(0, 10).map((row) => (
                    <div key={row.qty} className="flex items-center justify-between text-[13px]">
                      <span className="text-[#8b95a1]">{row.label}</span>
                      <span className="font-bold text-[#3182f6]">{formatCurrency((product.basePrice || 0) * row.discount, product.paymentCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 우측: 상세 설명 */}
            <div className="space-y-8">
              <section>
                <div className="mb-2">
                  <span className="text-[12px] font-bold text-[#3182f6] uppercase tracking-wider">{product.category}</span>
                  <h1 className="mt-1 text-[24px] font-bold text-[#191f28]">{product.name}</h1>
                </div>
                <p className="text-[15px] leading-relaxed text-[#4e5968]">{product.description}</p>
              </section>

              <div className="h-[1px] bg-[#f2f4f6]" />

              <section className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#191f28]">
                    <CheckCircle2 className="h-4 w-4 text-[#3182f6]" /> 주요 특징
                  </h4>
                  <ul className="space-y-2">
                    {details.keyFeatures.map((feature) => (
                      <li key={feature} className="text-[13px] leading-relaxed text-[#6b7684]">
                        • {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#191f28]">
                    <Info className="h-4 w-4 text-[#3182f6]" /> 전성분 정보
                  </h4>
                  <p className="text-[13px] leading-relaxed text-[#6b7684]">
                    {details.ingredients.join(", ")}
                  </p>
                </div>
              </section>

              {details.directions && details.directions.length > 0 && (
                <section className="rounded-[8px] bg-[#f7f9fa] p-5">
                  <h4 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-[#191f28]">
                    사용 방법
                  </h4>
                  <div className="space-y-1">
                    {details.directions.map((step, idx) => (
                      <p key={idx} className="text-[13px] leading-relaxed text-[#6b7684]">
                        {idx + 1}. {step}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {details.cautions && details.cautions.length > 0 && (
                <section className="rounded-[8px] border border-red-50 bg-red-50/30 p-5">
                  <h4 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-red-600">
                    <AlertCircle className="h-4 w-4" /> 주의사항
                  </h4>
                  <div className="space-y-1">
                    {details.cautions.map((caution, idx) => (
                      <p key={idx} className="text-[13px] leading-relaxed text-red-500/80">
                        • {caution}
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="border-t border-[#f2f4f6] px-6 py-4 text-center">
          <button
            onClick={onClose}
            className="h-11 w-full rounded-[8px] bg-[#3182f6] font-bold text-white transition-all hover:bg-[#1b64da] active:scale-[0.98]"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
