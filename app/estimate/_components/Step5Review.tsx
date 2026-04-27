"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock, LinkIcon, RotateCcw, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { ReviewFormValues } from "@/lib/rfq";
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

type ReviewEstimate = {
  selection: EstimateSelection;
  selectedProduct: Product | null;
  selectedContainer: ContainerOption | null;
  selectedManufacturer: { name?: string } | null;
  selectedDesign: DesignOption | null;
  totalPrice: number;
  unitPrice: number;
};

export function Step5Review({
  designServices,
  designPackages,
  designExtras,
  est,
  onReset,
  reviewForm,
  onReviewFormChange,
  pointBalance = 50000,
  pointCost = 5000,
}: {
  designServices: DesignServiceItem[];
  designPackages: DesignPackageItem[];
  designExtras: DesignExtraItem[];
  est: ReviewEstimate;
  onReset: () => void;
  reviewForm: ReviewFormValues;
  onReviewFormChange: <K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) => void;
  pointBalance?: number;
  pointCost?: number;
}) {
  const selectedServiceItems = useMemo(
    () => designServices.filter((service) => (est.selection.designServices || []).includes(service.id)),
    [designServices, est.selection.designServices]
  );
  const selectedPackageItem = useMemo(
    () => designPackages.find((item) => item.id === est.selection.designPackage) || null,
    [designPackages, est.selection.designPackage]
  );
  const selectedExtraItems = useMemo(
    () => designExtras.filter((extra) => (est.selection.designExtras || []).includes(extra.id)),
    [designExtras, est.selection.designExtras]
  );

  const pricing = useMemo(
    () =>
      getPricingBySelection({
        product: est.selectedProduct,
        container: est.selectedContainer,
        quantity: est.selection.quantity,
        designPrice: est.selectedDesign?.price || 0,
      }),
    [est.selectedContainer, est.selectedDesign?.price, est.selectedProduct, est.selection.quantity]
  );

  const displayRows = useMemo(() => {
    const rows: { title: string; subtitle: string; amount: number }[] = [];

    if (est.selectedProduct) {
      rows.push({
        title: est.selectedProduct.name,
        subtitle: `${est.selectedManufacturer?.name || "제조사 미정"} | 수량 ${est.selection.quantity.toLocaleString()}개 | 개당 ${formatCurrency(pricing.discountedProductUnitPrice, est.selectedProduct.paymentCurrency)}`,
        amount: pricing.discountedProductUnitPrice * est.selection.quantity,
      });
    }

    if (est.selectedContainer) {
      rows.push({
        title: est.selectedContainer.name,
        subtitle: `${formatCurrency(pricing.containerUnitPrice, est.selectedProduct?.paymentCurrency)}/개 x ${est.selection.quantity.toLocaleString()}개`,
        amount: pricing.containerUnitPrice * est.selection.quantity,
      });
    }

    if (selectedPackageItem) {
      rows.push({
        title: selectedPackageItem.name,
        subtitle: "디자인 패키지",
        amount: selectedPackageItem.price,
      });
    }

    selectedServiceItems.forEach((item) => {
      rows.push({
        title: item.name,
        subtitle: "디자인 서비스",
        amount: item.price,
      });
    });

    selectedExtraItems.forEach((item) => {
      rows.push({
        title: item.name,
        subtitle: "추가 옵션",
        amount: item.price,
      });
    });

    return rows;
  }, [est, pricing, selectedPackageItem, selectedServiceItems, selectedExtraItems]);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col justify-between gap-4 border-b border-[#f2f4f6] md:flex-row md:items-end">
      </div>

      <div className="space-y-10">
        <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <h3 className="mb-6 text-[16px] font-bold text-[#191f28]">가견적 내용</h3>

          <div className="space-y-6">
            {displayRows.map((row, index) => (
              <div key={index} className="flex items-start justify-between">
                <div className="space-y-1 pr-4">
                  <p className="text-[14px] font-bold leading-snug text-[#191f28]">{row.title}</p>
                  {row.subtitle ? (
                    <p className="text-[12px] font-medium leading-relaxed text-[#8b95a1]">{row.subtitle}</p>
                  ) : null}
                </div>
                <p className="whitespace-nowrap text-[14px] font-bold text-[#191f28]">
                  {formatCurrency(row.amount, est.selectedProduct?.paymentCurrency)}
                </p>
              </div>
            ))}

            <div className="mb-6 mt-8 h-[1px] bg-[#f2f4f6]" />

            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-[#191f28]">합계 (VAT 별도)</p>
              <p className="text-[20px] font-black tracking-tight text-[#1b64da]">
                {formatCurrency(est.totalPrice, est.selectedProduct?.paymentCurrency)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[16px] p-6 bg-[linear-gradient(135deg,_#eff6ff_0%,_#dbeafe_50%,_#bfdbfe_100%)]">
          <h3 className="mb-6 text-[16px] font-bold text-[#0052cc]">브랜드 & 담당자 정보</h3>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#8b95a1]">브랜드명</label>
              <input
                value={reviewForm.brandName}
                onChange={(e) => onReviewFormChange("brandName", e.target.value)}
                className="h-12 w-full rounded-[12px] border border-[#d1d6db] bg-[#f2f8ff]/50 px-4 text-[14px] outline-none transition-all focus:border-[#0052cc] focus:bg-white"
                placeholder="브랜드명"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#8b95a1]">담당자명</label>
              <input
                value={reviewForm.contactName}
                onChange={(e) => onReviewFormChange("contactName", e.target.value)}
                className="h-12 w-full rounded-[12px] border border-[#d1d6db] bg-[#f2f8ff]/50 px-4 text-[14px] outline-none transition-all focus:border-[#0052cc] focus:bg-white"
                placeholder="담당자명"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#8b95a1]">이메일</label>
              <input
                type="email"
                value={reviewForm.contactEmail}
                onChange={(e) => onReviewFormChange("contactEmail", e.target.value)}
                className="h-12 w-full rounded-[12px] border border-[#d1d6db] bg-[#f2f8ff]/50 px-4 text-[14px] outline-none transition-all focus:border-[#0052cc] focus:bg-white"
                placeholder="이메일"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#8b95a1]">연락처</label>
              <input
                value={reviewForm.contactPhone}
                onChange={(e) => onReviewFormChange("contactPhone", e.target.value)}
                className="h-12 w-full rounded-[12px] border border-[#d1d6db] bg-[#f2f8ff]/50 px-4 text-[14px] outline-none transition-all focus:border-[#0052cc] focus:bg-white"
                placeholder="연락처"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[13px] font-bold text-[#8b95a1]">요청사항</label>
              <textarea
                value={reviewForm.requestNote}
                onChange={(e) => onReviewFormChange("requestNote", e.target.value)}
                className="min-h-[120px] w-full rounded-[12px] border border-[#d1d6db] bg-[#f2f8ff]/50 p-4 text-[14px] outline-none transition-all focus:border-[#0052cc] focus:bg-white"
                placeholder="요청사항을 입력해 주세요."
              />
            </div>
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8eb] bg-[#fff] p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-[16px] font-bold text-[#191f28]">디자인 파일 공유</h3>
              <p className="mt-1 text-[14px] text-[#6a7282]">공유해주실 디자인 파일이 있으신가요?</p>
            </div>
            <div className="flex rounded-[8px] bg-[#f2f4f6] p-1">
              <button
                type="button"
                onClick={() => onReviewFormChange("hasFiles", "yes")}
                className={`h-10 rounded-[6px] px-6 text-[12px] font-bold transition-all ${reviewForm.hasFiles === "yes" ? "bg-white text-[#3182f6] shadow-sm" : "text-[#8b95a1] hover:bg-[#f2f4f6]"
                  }`}
              >
                네, 있습니다
              </button>
              <button
                type="button"
                onClick={() => onReviewFormChange("hasFiles", "no")}
                className={`h-10 rounded-[6px] px-6 text-[12px] font-bold transition-all ${reviewForm.hasFiles === "no" ? "bg-white text-[#3182f6] shadow-sm" : "text-[#8b95a1] hover:bg-[#f2f4f6]"
                  }`}
              >
                아니요
              </button>
            </div>
          </div>

          {reviewForm.hasFiles === "yes" ? (
            <div className="mt-8">
              <label className="mb-3 block text-[14px] font-semibold text-[#4e5968]">
                공유 링크를 입력해 주세요 (Google Drive, OneDrive, Dropbox 등)
              </label>
              <div className="group relative">
                <div className="absolute inset-y-0 left-4 flex items-center text-[#adb5bd] transition-colors group-focus-within:text-[#3182f6]">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <input
                  type="url"
                  value={reviewForm.fileLink}
                  onChange={(e) => onReviewFormChange("fileLink", e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="h-14 w-full rounded-[12px] border border-[#e5e8eb] bg-[#f9fafb] pl-12 pr-4 text-[15px] transition-all focus:border-[#3182f6] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#3182f6]/5"
                />
              </div>
              <ul className="mt-4 space-y-2 px-1">
                <li className="flex items-center gap-2 text-[12px] text-[#8b95a1]">
                  <div className="h-1 w-1 rounded-full bg-[#adb5bd]" />
                  구글 드라이브, 원드라이브, 드롭박스 등 외부 공유 링크를 입력해 주세요.
                </li>
                <li className="flex items-center gap-2 text-[12px] text-[#8b95a1]">
                  <div className="h-1 w-1 rounded-full bg-[#adb5bd]" />
                  링크 권한은 <span className="font-bold text-[#3182f6]">링크가 있는 모든 사용자</span>로 설정해 주세요.
                </li>
              </ul>
            </div>
          ) : (
            <div className="mt-6 flex items-start gap-3 border-amber-200 bg-amber-50 border p-4 rounded-xl bg-[#fffbeb]">
              <span className="shrink-0 text-[18px]">⚠️</span>
              <div>
                <p className="text-[14px] font-bold text-[#973c00]">디자인 파일이 없어도 괜찮습니다</p>
                <p className="text-[13px] leading-relaxed opacity-80 text-[#bb4d00]">
                  주문 접수 후 담당 디자이너가 배정되어 브랜드 방향성과 요구사항을 상세히 확인합니다.
                </p>
              </div>
            </div>
          )}

        </section>

        <section className="rounded-[14px] bg-[#fffbe6]/60 border border-[#ffeebf] p-6">
          <div className="flex items-start gap-4 mb-4">
            <span className="text-[20px]">⚡</span>
          <h3 className="text-[16px] font-bold text-[#92400e]">포인트 {pointCost.toLocaleString()}P가 차감됩니다</h3>
          </div>

          <div className="space-y-3.5 mb-4 ml-10">
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-medium text-[#191f28]">현재 보유 포인트</span>
              <span className="text-[16px] font-bold text-[#191f28]">{pointBalance.toLocaleString()}P</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-medium text-[#191f28]">차감 포인트</span>
              <span className="text-[16px] font-bold text-[#ef4444]">-{pointCost.toLocaleString()}P</span>
            </div>
            <div className="h-[1px] bg-[#ffeebf] w-full" />
            <div className="flex justify-between items-center pt-1">
              <span className="text-[15px] font-bold text-[#191f28]">차감 후 잔여</span>
              <span className="text-[18px] font-bold text-[#0052cc]">{Math.max(0, pointBalance - pointCost).toLocaleString()}P</span>
            </div>
          </div>

          <div className="rounded-[12px] bg-white border border-[#ffeebf]/50 p-5 ml-10">
            <p className="flex items-center gap-2 text-[14px] font-bold text-[#191f28] mb-2">
              💡 포인트 사용 TIP
            </p>
            <p className="text-[14px] leading-relaxed text-[#8b95a1]">
              제조사 재고 부족 또는 제조사 사정으로 견적이 취소될 경우, 사용된 {pointCost.toLocaleString()}P는 자동으로 환불됩니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
