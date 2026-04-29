"use client";

import { Suspense, startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { authFetch } from "@/lib/client/auth-fetch";
import type { AppRole } from "@/lib/auth/roles";
import { DEFAULT_REVIEW_FORM_VALUES, type ReviewFormValues, type RfqRequestRow } from "@/lib/rfq";
import { supabase } from "@/lib/supabase";
import { FooterBar } from "./_components/FooterBar";
import { Step1Manufacturer } from "./_components/Step1Manufacturer";
import { Step2Product } from "./_components/Step2Product";
import { Step3Quantity } from "./_components/Step3Quantity";
import { Step4Design } from "./_components/Step4Design";
import { Step5Review } from "./_components/Step5Review";
import { Step6Confirmation } from "./_components/Step6Confirmation";
import { SummaryAside } from "./_components/SummaryAside";
import { STEPS } from "./_data/steps";
import { useEstimate } from "./_hooks/useEstimate";


function EstimatePageContent() {
  const router = useRouter();
  const est = useEstimate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormValues>(DEFAULT_REVIEW_FORM_VALUES);
  const [submittedRfq, setSubmittedRfq] = useState<Pick<RfqRequestRow, "request_number" | "order_number"> | null>(null);
  const [pointBalance, setPointBalance] = useState(0);
  const [rfqRequestPointCost, setRfqRequestPointCost] = useState(5000);
  const [userRole, setUserRole] = useState<AppRole>("member");

  useEffect(() => {
    const initializeSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/?auth=login";
        return;
      }

      setSession(session);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("Profile prefill skipped:", profileError.message);
      }

      setUserRole((profile?.role as AppRole | undefined) || "member");

      setReviewForm((prev) => ({
        ...prev,
        contactName: prev.contactName || profile?.full_name || session.user.user_metadata?.full_name || "",
        contactEmail: prev.contactEmail || profile?.email || session.user.email || "",
        contactPhone: prev.contactPhone || profile?.phone_number || session.user.user_metadata?.phone_number || "",
      }));

      const pointResponse = await authFetch("/api/points/summary");
      const pointPayload = (await pointResponse.json()) as {
        wallet?: { balance?: number };
        rfqRequestCostPoints?: number;
      } & { error?: string };
      if (pointResponse.ok) {
        setPointBalance(Number(pointPayload.wallet?.balance || 0));
        setRfqRequestPointCost(Number(pointPayload.rfqRequestCostPoints || 5000));
      }
      setIsLoadingAuth(false);
    };

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = "/?auth=login";
        return;
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReviewFormChange = <K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) => {
    setReviewForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitOrder = async () => {
    if (!session) {
      window.location.href = "/?auth=login";
      return;
    }

    if (userRole !== "member") {
      alert("의뢰자만 가능합니다");
      return;
    }

    if (
      !est.selection.manufacturer ||
      !est.selectedProduct ||
      !reviewForm.brandName.trim() ||
      !reviewForm.contactName.trim() ||
      !reviewForm.contactEmail.trim() ||
      !reviewForm.contactPhone.trim()
    ) {
      alert("브랜드명, 담당자명, 이메일, 연락처를 모두 입력해 주세요.");
      return;
    }

    if (reviewForm.hasFiles === "yes" && !reviewForm.fileLink.trim()) {
      alert("디자인 파일 링크를 입력해 주세요.");
      return;
    }

    if (userRole === "member") {
      const shouldProceed = window.confirm(`${rfqRequestPointCost.toLocaleString()}포인트가 소모됩니다 진행하시겠습니까?`);
      if (!shouldProceed) {
        return;
      }
    }

    setIsSubmittingOrder(true);

    const response = await authFetch("/api/rfqs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        manufacturerId: est.selection.manufacturer,
        productId: est.selectedProduct.id,
        containerId: est.selectedContainer?.id || null,
        designOptionId: est.selection.design,
        designPackageId: est.selection.designPackage,
        designServiceIds: est.selection.designServices,
        designExtraIds: est.selection.designExtras,
        quantity: est.selection.quantity,
        reviewForm,
      }),
    });

    setIsSubmittingOrder(false);

    const payload = (await response.json()) as { error?: string; data?: RfqRequestRow };
    if (!response.ok) {
      alert(`견적 요청 접수에 실패했습니다: ${payload.error || "알 수 없는 오류"}`);
      return;
    }

    setSubmittedRfq(
      payload.data
        ? {
          request_number: payload.data.request_number,
          order_number: payload.data.order_number,
        }
        : null
    );

    startTransition(() => {
      est.setCurrentStep(6);
    });
  };

  const handlePrimaryAction = () => {
    if (est.currentStep === 5) {
      void handleSubmitOrder();
      return;
    }

    est.handleNext();
  };

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#3182f6] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] pb-48 pt-16">
      <div className="mx-auto max-w-[1280px] px-6">
        {est.currentStep < 6 ? (
          <div className="mb-12 flex flex-col items-center justify-center gap-2">
            <h1 className="text-[26px] py-4 font-bold tracking-tight text-[#191f28]">Custom OEM 견적</h1>

            <div className="relative flex w-full max-w-[800px] items-start justify-between">
              {STEPS.map((step, idx) => {
                const isActive = est.currentStep === step.id;
                const isCompleted = est.currentStep > step.id;
                const isLast = idx === STEPS.length - 1;

                return (
                  <div key={step.id} className="relative flex flex-1 flex-col items-center">
                    {/* Circle */}
                    <div
                      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold transition-all duration-300 ${isActive || isCompleted
                        ? "bg-[#0052cc] text-white shadow-sm"
                        : "bg-[#e5e8eb] text-[#adb5bd]"
                        }`}
                    >
                      {isCompleted ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3 text-white"
                          aria-hidden="true"
                        >
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                      ) : step.id}
                    </div>

                    {/* Label */}
                    <span
                      className={`mt-3 whitespace-nowrap text-[12px] font-bold transition-colors duration-300 ${isActive || isCompleted ? "text-[#0052cc]" : "text-[#adb5bd]"
                        }`}
                    >
                      {step.name}
                    </span>

                    {/* Segmented Line */}
                    {!isLast && (
                      <div className="absolute left-[calc(50%+25px)] right-[calc(-50%+25px)] top-5 h-[2px] bg-[#e5e8eb]">
                        <div
                          className="h-full bg-[#0052cc] transition-all duration-500"
                          style={{ width: isCompleted ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={session ? "" : "pointer-events-none opacity-50 grayscale"}>
          {est.currentStep === 6 ? (
            <Step6Confirmation
              designServices={est.designServices}
              designPackages={est.designPackages}
              designExtras={est.designExtras}
              est={est}
              reviewForm={reviewForm}
              rfqRequest={submittedRfq}
              onReset={est.resetSelection}
            />
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[380px_1fr]">
              <SummaryAside
                selectedProduct={est.selectedProduct}
                selectedManufacturer={est.selectedManufacturer}
                selectedContainer={est.selectedContainer}
                currentStep={est.currentStep}
                totalPrice={est.totalPrice}
                unitPrice={est.unitPrice}
                quantity={est.selection.quantity}
              />

              <div className="relative min-h-[500px] p-1">
                {est.currentStep === 1 ? (
                  <Step1Manufacturer
                    selection={est.selection}
                    setSelection={est.setSelection}
                    manufacturers={est.manufacturers}
                    loading={est.loading}
                  />
                ) : null}
                {est.currentStep === 2 ? (
                  <Step2Product
                    key={est.selection.manufacturer ?? "none"}
                    manufacturerName={est.selectedManufacturer?.name || "선택한 제조사"}
                    products={est.products}
                    catalogLoading={est.catalogLoading}
                    selection={est.selection}
                    setSelection={est.setSelection}
                    onReset={est.resetSelection}
                  />
                ) : null}
                {est.currentStep === 3 ? (
                  <Step3Quantity
                    containers={est.containers}
                    selection={est.selection}
                    setSelection={est.setSelection}
                    selectedProduct={est.selectedProduct}
                    selectedContainer={est.selectedContainer}
                    onReset={est.resetSelection}
                  />
                ) : null}
                {est.currentStep === 4 ? (
                  <Step4Design
                    designOptions={est.designOptions}
                    designServices={est.designServices}
                    designPackages={est.designPackages}
                    designExtras={est.designExtras}
                    selection={est.selection}
                    setSelection={est.setSelection}
                    onReset={est.resetSelection}
                    selectedProduct={est.selectedProduct}
                  />
                ) : null}
                {est.currentStep === 5 ? (
                  <Step5Review
                    designServices={est.designServices}
                    designPackages={est.designPackages}
                    designExtras={est.designExtras}
                    est={est}
                    onReset={est.resetSelection}
                    reviewForm={reviewForm}
                    onReviewFormChange={handleReviewFormChange}
                    pointBalance={pointBalance}
                    pointCost={rfqRequestPointCost}
                    userRole={userRole}
                    onPurchasePoints={() => router.push("/purchase")}
                  />
                ) : null}

                <div className="mt-12 flex justify-end gap-3 border-t border-[#f2f4f6] pt-8">
                  {est.currentStep > 1 ? (
                    <button
                      onClick={est.handleBack}
                      className="flex h-14 items-center gap-2 rounded-[16px] border border-[#e5e8eb] bg-white px-8 font-bold text-[#4e5968] transition-all hover:bg-[#f9fafb]"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      이전
                    </button>
                  ) : null}

                  <button
                    onClick={handlePrimaryAction}
                    disabled={
                      isSubmittingOrder ||
                      (est.currentStep === 1 && !est.selection.manufacturer) ||
                      (est.currentStep === 2 && !est.selection.product) ||
                      (est.currentStep === 3 && !est.selection.container)
                    }
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#0052cc] px-8 text-[18px] font-bold text-white transition-all hover:bg-[#0747a6] disabled:bg-[#e5e8eb] disabled:text-[#adb5bd]"
                  >
                    {isSubmittingOrder ? "접수중..." : est.currentStep === 5 ? `⚡ ${rfqRequestPointCost.toLocaleString()}P 사용 · 견적 접수하기` : (
                      <>
                        다음 단계
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {est.currentStep < 6 ? (
        <FooterBar
          designExtras={est.designExtras}
          designPackages={est.designPackages}
          designServices={est.designServices}
          selectedProduct={est.selectedProduct}
          selectedContainer={est.selectedContainer}
          selection={est.selection}
          selectedDesign={est.selectedDesign}
          quantity={est.selection.quantity}
          unitPrice={est.unitPrice}
          totalPrice={est.totalPrice}
        />
      ) : null}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode="login" />
    </main>
  );
}

function EstimatePageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#3182f6] border-t-transparent"></div>
    </div>
  );
}

export default function EstimatePage() {
  return (
    <Suspense fallback={<EstimatePageFallback />}>
      <EstimatePageContent />
    </Suspense>
  );
}
