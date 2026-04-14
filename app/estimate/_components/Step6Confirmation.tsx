"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  RotateCcw,
  ChevronRight,
  X,
  Printer
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  type ContainerOption,
  type DesignExtraItem,
  type DesignPackageItem,
  type DesignServiceItem,
  type Product,
  getPricingBySelection,
} from "../_data/catalog";
import { PrintableEstimate } from "./PrintableEstimate";
import { type ReviewFormValues } from "@/lib/rfq";

type ReviewEstimate = {
  selection: {
    quantity: number;
    designServices: string[];
    designPackage: string | null;
    designExtras: string[];
  };
  selectedProduct: Product | null;
  selectedContainer: ContainerOption | null;
  selectedManufacturer: { name?: string; logo?: string; location?: string; address?: string } | null;
  selectedDesign: { price: number } | null;
  totalPrice: number;
};

export function Step6Confirmation({
  designServices,
  designPackages,
  designExtras,
  est,
  reviewForm,
  onReset,
}: {
  designServices: DesignServiceItem[];
  designPackages: DesignPackageItem[];
  designExtras: DesignExtraItem[];
  est: ReviewEstimate;
  reviewForm: ReviewFormValues;
  onReset: () => void;
}) {
  const [showPrintPopup, setShowPrintPopup] = useState(false);

  // ESC 키로 팝업 닫기 처리
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPrintPopup(false);
    };
    if (showPrintPopup) {
      window.addEventListener("keydown", handleEsc);
      // 스크롤 방지
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [showPrintPopup]);

  const orderDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const [orderNumber] = useState(() => {
    const random = Math.floor(Math.random() * 90000000) + 10000000;
    return `DGC-${random}`;
  });

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
    const rows = [];
    const selectedServiceItems = designServices.filter((service) => (est.selection.designServices || []).includes(service.id));
    const selectedPackageItem = designPackages.find((item) => item.id === est.selection.designPackage) || null;
    const selectedExtraItems = designExtras.filter((extra) => (est.selection.designExtras || []).includes(extra.id));

    if (est.selectedProduct) {
      rows.push({
        title: est.selectedProduct.name,
        spec: `${est.selectedManufacturer?.name || "제조사 미정"}`,
        unitPrice: pricing.discountedProductUnitPrice,
        quantity: est.selection.quantity,
        amount: pricing.discountedProductUnitPrice * est.selection.quantity,
      });
    }

    if (est.selectedContainer) {
      rows.push({
        title: est.selectedContainer.name,
        spec: "용기/포장 옵션",
        unitPrice: pricing.containerUnitPrice,
        quantity: est.selection.quantity,
        amount: pricing.containerUnitPrice * est.selection.quantity,
      });
    }

    if (selectedPackageItem) {
      rows.push({
        title: selectedPackageItem.name,
        spec: "디자인 패키지",
        unitPrice: selectedPackageItem.price,
        quantity: 1,
        amount: selectedPackageItem.price,
      });
    }

    selectedServiceItems.forEach((item) => {
      rows.push({
        title: item.name,
        spec: "디자인 서비스",
        unitPrice: item.price,
        quantity: 1,
        amount: item.price,
      });
    });

    selectedExtraItems.forEach((item) => {
      rows.push({
        title: item.name,
        spec: "추가 옵션",
        unitPrice: item.price,
        quantity: 1,
        amount: item.price,
      });
    });

    return rows;
  }, [est, pricing, designServices, designPackages, designExtras]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-[940px] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 화면용 UI (인쇄 시 숨김) */}
      <div className="print:hidden">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#3182f6]">
            <Check className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-[24px] font-black tracking-tight text-[#191f28]">견적 내역 확인</h2>
          <div className="mt-2.5 flex items-center gap-2.5 text-[14px] font-medium text-[#8b95a1]">
            <span>주문번호: <span className="font-bold text-[#191f28]">{orderNumber}</span></span>
            <span className="h-3 w-[1px] bg-[#e5e8eb]" />
            <span>{orderDate}</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="rounded-[14px] border border-[#f2f4f6] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <h3 className="mb-6 text-[17px] font-extrabold text-[#191f28]">가견적 상세 내역</h3>
              <div className="space-y-5">
                {displayRows.map((row, index) => (
                  <div key={index} className="flex justify-between items-start pb-5 border-b border-[#f9fafb] last:border-none last:pb-0">
                    <div className="space-y-1 pr-4">
                      <p className="text-[14px] font-bold text-[#333d4b] leading-tight">{row.title}</p>
                      <p className="text-[12px] font-medium text-[#8b95a1]">
                        {row.spec} {row.quantity > 1 ? `| ${row.quantity.toLocaleString()}개` : ""} | 단가 {formatCurrency(row.unitPrice, est.selectedProduct?.paymentCurrency)}
                      </p>
                    </div>
                    <p className="text-[14px] font-bold text-[#333d4b] tabular-nums">
                      {formatCurrency(row.amount, est.selectedProduct?.paymentCurrency)}
                    </p>
                  </div>
                ))}

                <div className="mt-6 rounded-[16px] bg-[#f9fafb] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-bold text-[#4e5968]">최종 합계 <span className="text-[12px] font-normal opacity-70">(VAT 별도)</span></p>
                    <p className="text-[22px] font-black text-[#3182f6] tracking-tight tabular-nums">
                      {formatCurrency(est.totalPrice, est.selectedProduct?.paymentCurrency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border border-[#f2f4f6] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <h3 className="mb-4 text-[16px] font-bold text-[#191f28]">주문 정보</h3>
              <div className="flex items-center justify-between py-1">
                <span className="text-[14px] font-medium text-[#8b95a1]">견적 접수일</span>
                <span className="text-[14px] font-bold text-[#333d4b]">{orderDate}</span>
              </div>
            </div>

            <div className="rounded-[14px] bg-[#f0f2ff] p-6">
              <h3 className="mb-4 text-[15px] font-bold text-[#193cb8]">주문 및 제조 안내</h3>
              <ul className="grid gap-3">
                {[
                  "견적 접수 후 영업일 기준 1~2일 내 담당자가 상세 상담을 위해 연락드립니다.",
                  "제조 공정은 최종 계약서 서명 및 선금 입금 확인 후 즉시 시작됩니다.",
                  "디자인 작업이 포함된 경우 착수금 입금 확인 후 전담 디자이너가 배정됩니다.",
                  "최종 견적가는 원료 시세 변화 및 환율 변동에 따라 일부 조정될 수 있습니다.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#193cb8]">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#193cb8]/80" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="sticky top-6 space-y-3">
              <button
                onClick={() => setShowPrintPopup(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#3182f6] py-4 text-[14px] font-extrabold text-white shadow-[0_4px_12px_rgba(49,130,246,0.12)] transition-all hover:bg-[#1b64da] hover:shadow-[0_4px_15px_rgba(49,130,246,0.2)] active:scale-[0.98]"
              >
                <Download className="h-4.5 w-4.5" />
                견적서 다운로드 (PDF)
              </button>
              <button
                onClick={onReset}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#f2f4f6] py-3.5 text-[13px] font-bold text-[#4e5968] transition-all hover:bg-[#e5e8eb] active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                주문 취소 / 다시하기
              </button>

              <div className="mt-6 pt-5 border-t border-[#f2f4f6]">
                <button className="group relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#191f28] py-5 text-[16px] font-black text-white transition-all hover:bg-[#000] active:scale-[0.97]">
                  <span className="relative z-10 flex items-center gap-2">
                    주문 결제하기
                    <span className="text-[11px] font-medium opacity-50 uppercase tracking-tighter">Utransfer</span>
                    <ChevronRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
                <p className="mt-3.5 text-center text-[12px] font-medium text-[#4e5968]">
                  최종 확인 후 결제를 진행해주세요
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 팝업 모달 (화면용) & 인쇄용 견적서 */}
      {showPrintPopup && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-10 pb-10 print:relative print:z-0 print:block print:bg-white print:p-0">
          <div className="relative w-full max-w-[1180px] flex flex-col bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 print:max-w-none print:animate-none print:shadow-none print:rounded-none">
            {/* 팝업 헤더 (인쇄 시 숨김) - Sticky로 고정 */}
            <div className="sticky top-0 z-[110] flex items-center justify-between rounded-t-2xl bg-[#191f28] px-6 py-4 text-white print:hidden">
              <h4 className="text-[15px] font-bold">견적서 미리보기</h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg bg-[#3182f6] px-4 py-2 text-[13px] font-bold transition-colors hover:bg-[#1b64da]"
                >
                  <Printer className="h-4 w-4" /> 인쇄 및 저장 (PDF)
                </button>
                <button
                  onClick={() => setShowPrintPopup(false)}
                  className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 인쇄 전용 표 형식 견적서 본문 분리 컴포넌트 - 내부 스크롤 적용 */}
            <div className="flex-1 overflow-y-auto max-h-[calc(90vh-120px)] print:max-h-none print:overflow-visible">
              <PrintableEstimate
                orderNumber={orderNumber}
                orderDate={orderDate}
                totalPrice={est.totalPrice}
                currencyCode={est.selectedProduct?.paymentCurrency || "USD"}
                displayRows={displayRows}
                supplierName={est.selectedManufacturer?.name || "제조사 미정"}
                supplierLogo={est.selectedManufacturer?.logo || null}
                supplierAddress={est.selectedManufacturer?.address || est.selectedManufacturer?.location || null}
                recipientBrandName={reviewForm.brandName}
                recipientContactName={reviewForm.contactName}
              />

              {/* 팝업 하단 (인쇄 시 숨김) */}
              <div className="bg-[#f9fafb] px-6 py-4 border-t border-gray-100 print:hidden text-center">
                <p className="text-[12px] text-gray-500 font-medium">위 양식은 표준 견적서 양식으로 출력됩니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
