"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock, LinkIcon, RotateCcw } from "lucide-react";
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
}: {
  designServices: DesignServiceItem[];
  designPackages: DesignPackageItem[];
  designExtras: DesignExtraItem[];
  est: ReviewEstimate;
  onReset: () => void;
  reviewForm: ReviewFormValues;
  onReviewFormChange: <K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) => void;
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
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#f2f4f6] pb-6 md:flex-row md:items-end">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[#191f28]">최종 주문 확인</h2>
          <p className="mt-1 text-[14px] text-[#4e5968]">입력하신 내용을 확인하고 주문을 접수해 주세요.</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-full bg-[#f2f4f6] px-3 py-2 text-[12px] font-bold text-[#4e5968] transition-colors hover:bg-[#e5e8eb]"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 처음으로
        </button>
      </div>

      <div className="space-y-10">
        <section className="bg-white">
          <h3 className="mb-6 text-[16px] font-bold text-[#191f28]">견적 요약</h3>

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
            <div className="mb-6 mt-8 h-[2px] bg-[#f2f4f6]" />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[16px] font-bold text-[#191f28]">브랜드 및 담당자 정보</h3>
          <div className="grid gap-5 rounded-[12px] border border-[#e5e8eb] bg-white p-6 shadow-sm sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-[#4e5968]">브랜드명</label>
              <input
                value={reviewForm.brandName}
                onChange={(e) => onReviewFormChange("brandName", e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#e5e8eb] px-4 text-[14px] outline-none transition-colors focus:border-[#3182f6]"
                placeholder="브랜드명을 입력해 주세요"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-[#4e5968]">담당자명</label>
              <input
                value={reviewForm.contactName}
                onChange={(e) => onReviewFormChange("contactName", e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#e5e8eb] px-4 text-[14px] outline-none transition-colors focus:border-[#3182f6]"
                placeholder="담당자 성함을 입력해 주세요"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-[#4e5968]">이메일 주소</label>
              <input
                type="email"
                value={reviewForm.contactEmail}
                onChange={(e) => onReviewFormChange("contactEmail", e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#e5e8eb] px-4 text-[14px] outline-none transition-colors focus:border-[#3182f6]"
                placeholder="example@brand.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-[#4e5968]">연락처</label>
              <input
                value={reviewForm.contactPhone}
                onChange={(e) => onReviewFormChange("contactPhone", e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#e5e8eb] px-4 text-[14px] outline-none transition-colors focus:border-[#3182f6]"
                placeholder="연락 가능한 번호를 입력해 주세요"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[13px] font-bold text-[#4e5968]">요청사항</label>
              <textarea
                value={reviewForm.requestNote}
                onChange={(e) => onReviewFormChange("requestNote", e.target.value)}
                className="min-h-[100px] w-full rounded-[8px] border border-[#e5e8eb] p-4 text-[14px] outline-none transition-colors focus:border-[#3182f6]"
                placeholder="희망 일정, 브랜드 방향성, 참고사항을 입력해 주세요"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8eb] bg-[#fff] p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-[16px] font-bold text-[#191f28]">디자인 파일 공유</h3>
              <p className="mt-1 text-[14px] text-[#8b95a1]">보유 중인 디자인 파일이 있다면 링크로 전달해 주세요.</p>
            </div>
            <div className="flex rounded-[8px] bg-[#f2f4f6] p-1">
              <button
                type="button"
                onClick={() => onReviewFormChange("hasFiles", "yes")}
                className={`h-10 rounded-[6px] px-6 text-[12px] font-bold transition-all ${
                  reviewForm.hasFiles === "yes" ? "bg-white text-[#3182f6] shadow-sm" : "text-[#8b95a1] hover:bg-[#f2f4f6]"
                }`}
              >
                네, 있습니다
              </button>
              <button
                type="button"
                onClick={() => onReviewFormChange("hasFiles", "no")}
                className={`h-10 rounded-[6px] px-6 text-[12px] font-bold transition-all ${
                  reviewForm.hasFiles === "no" ? "bg-white text-[#3182f6] shadow-sm" : "text-[#8b95a1] hover:bg-[#f2f4f6]"
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
            <div className="mt-6 flex items-start gap-3 rounded-[12px] bg-[#f2f8ff] px-5 py-4 text-[#3182f6]">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-[14px] font-bold">디자인 파일이 없어도 괜찮습니다</p>
                <p className="mt-1 text-[13px] leading-relaxed opacity-80">
                  주문 접수 후 담당 디자이너가 배정되어 브랜드 방향성과 요구사항을 상세히 확인합니다.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-[#f2f4f6] pt-8 md:flex-row">
          <div className="flex items-center gap-3 text-[#3182f6]">
            <Clock className="h-5 w-5" />
            <p className="text-[14px] font-bold">주문 후 평균 3~4주 이내 제조가 진행됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
