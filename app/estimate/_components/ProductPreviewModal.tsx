"use client";

import Image from "next/image";
import { X, Check, AlertTriangle } from "lucide-react";
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

      <div className="relative flex max-h-[92vh] w-full max-w-[640px] animate-in zoom-in-95 slide-in-from-bottom-4 flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl duration-300">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-[22px] font-bold text-[#191f28] leading-tight">{product.name}</h2>
            <span className="mt-2 inline-block rounded-full bg-[#eaf3ff] px-3 py-1 text-[12px] font-bold text-[#3182f6]">
              {product.category}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#adb5bd] transition-colors hover:bg-[#f2f4f6] hover:text-[#191f28]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar pt-2">
          {/* Main Image */}
          <div className="relative mx-auto mb-8 aspect-[4/3] w-full max-w-[400px] overflow-hidden rounded-xl bg-white">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) calc(100vw - 64px), 400px"
              className="object-contain"
            />
          </div>

          {/* Description */}
          <p className="mb-8 text-[14px] leading-relaxed text-[#4e5968]">
            {product.description}
          </p>

          {/* Features & Ingredients */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="mb-4 text-[13px] font-bold tracking-wider text-[#191f28] uppercase">KEY FEATURES</h3>
              <ul className="space-y-2.5">
                {details.keyFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#4e5968]">
                    <Check className="h-4 w-4 shrink-0 text-[#0052cc] mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-[13px] font-bold tracking-wider text-[#191f28] uppercase">INGREDIENTS</h3>
              <ul className="space-y-2.5">
                {details.ingredients.map((ingredient, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#4e5968]">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#adb5bd]" />
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Directions */}
          {details.directions && details.directions.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 rounded-[8px] bg-[#f2f4f6] px-4 py-2 text-[12px] font-bold tracking-wider text-[#4e5968] uppercase">
                DIRECTIONS FOR USE
              </div>
              <div className="px-1 space-y-1">
                {details.directions.map((step, idx) => (
                  <p key={idx} className="text-[14px] leading-relaxed text-[#4e5968]">
                    {step}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Cautions */}
          {details.cautions && details.cautions.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 rounded-[8px] bg-[#f2f4f6] px-4 py-2 text-[12px] font-bold tracking-wider text-[#4e5968] uppercase">
                CAUTIONS
              </div>
              <div className="px-1 space-y-3">
                {details.cautions.map((caution, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#4e5968]">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[#f0a500] mt-0.5" />
                    <span>{caution}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Table */}
          <div>
            <div className="mb-4 rounded-[8px] bg-[#f2f4f6] px-4 py-2 text-[12px] font-bold tracking-wider text-[#4e5968]">
              가격표
            </div>
            <div className="px-1">
              <div className="flex border-b border-[#f2f4f6] pb-2 text-[12px] font-medium text-[#191f28]">
                <span className="flex-1">수량</span>
                <span className="w-32 text-center">단가</span>
                <span className="w-32 text-right">합계</span>
              </div>
              <div className="divide-y divide-[#f2f4f6]">
                {pricingRows.map((row) => {
                  const unitPrice = (product.basePrice || 0) * row.discount;
                  const total = unitPrice * row.qty;
                  return (
                    <div key={row.qty} className="flex py-3.5 text-[14px]">
                      <span className="flex-1 font-medium text-[#191f28]">{row.qty.toLocaleString()}개</span>
                      <span className="w-32 text-center font-bold text-[#0052cc]">
                        {formatCurrency(unitPrice, product.paymentCurrency)}
                      </span>
                      <span className="w-32 text-right text-[#191f28]">
                        {formatCurrency(total, product.paymentCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
