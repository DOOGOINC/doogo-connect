"use client";

import { Suspense, startTransition, useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { authFetch } from "@/lib/client/auth-fetch";
import { DEFAULT_REVIEW_FORM_VALUES, type ReviewFormValues } from "@/lib/rfq";
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
  const est = useEstimate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormValues>(DEFAULT_REVIEW_FORM_VALUES);

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
        .select("full_name, email, phone_number")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("Profile prefill skipped:", profileError.message);
      }

      setReviewForm((prev) => ({
        ...prev,
        contactName: prev.contactName || profile?.full_name || session.user.user_metadata?.full_name || "",
        contactEmail: prev.contactEmail || profile?.email || session.user.email || "",
        contactPhone: prev.contactPhone || profile?.phone_number || session.user.user_metadata?.phone_number || "",
      }));
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

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      alert(`견적 요청 접수에 실패했습니다: ${payload.error || "알 수 없는 오류"}`);
      return;
    }

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
    <main className="min-h-screen bg-[#f7f8fa] pb-48 pt-24">
      <div className="mx-auto max-w-[1280px] px-6">
        {est.currentStep < 6 ? (
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#191f28]">Custom OEM 견적</h1>
          </div>
        ) : null}

        {!session ? (
          <div className="mb-8 rounded-2xl border border-[#f2f4f6] bg-white p-8 text-center shadow-sm">
            <p className="mb-4 text-lg font-bold text-[#4e5968]">로그인이 필요한 서비스입니다.</p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="h-12 rounded-xl bg-[#3182f6] px-8 font-bold text-white transition-all hover:bg-[#1b64da]"
            >
              로그인하기
            </button>
          </div>
        ) : null}

        <div className={session ? "" : "pointer-events-none opacity-50 grayscale"}>
          {est.currentStep < 6 ? (
            <div className="no-scrollbar mb-6 flex items-center justify-between overflow-x-auto rounded-xl border border-[#f2f4f6] bg-white px-5 py-3 shadow-sm">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = est.currentStep === step.id;
                const isCompleted = est.currentStep > step.id;

                return (
                  <div key={step.id} className="flex flex-1 items-center last:flex-none">
                    <div className={`flex items-center gap-2 transition-all duration-300 ${isActive ? "opacity-100" : "opacity-50"}`}>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                          isActive
                            ? "bg-[#3182f6] text-white"
                            : isCompleted
                              ? "bg-[#e5f1ff] text-[#3182f6]"
                              : "bg-[#f2f4f6] text-[#8b95a1]"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className={`whitespace-nowrap text-[12px] font-extrabold ${isActive ? "text-[#3182f6]" : "text-[#4e5968]"}`}>
                        {step.name}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 ? (
                      <div className="mx-3 h-[1px] min-w-[20px] flex-1 bg-[#f2f4f6]">
                        <div className={`h-full bg-[#3182f6] transition-all duration-500 ${isCompleted ? "w-full" : "w-0"}`} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {est.currentStep === 6 ? (
            <Step6Confirmation
              designServices={est.designServices}
              designPackages={est.designPackages}
              designExtras={est.designExtras}
              est={est}
              reviewForm={reviewForm}
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

              <div className="relative min-h-[500px] rounded-2xl border border-[#f2f4f6] bg-white p-10 shadow-sm">
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
                  />
                ) : null}

                <div className="mt-12 flex justify-end gap-3 border-t border-[#f2f4f6] pt-8">
                  {est.currentStep > 1 ? (
                    <button
                      onClick={est.handleBack}
                      className="flex h-12 items-center gap-2 rounded-2xl bg-[#f2f4f6] px-6 font-bold text-[#4e5968] transition-all hover:bg-[#e5e8eb]"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      이전 단계
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
                    className="flex h-12 items-center gap-2 rounded-2xl bg-[#3182f6] px-6 font-bold text-white transition-all hover:bg-[#1b64da] disabled:bg-[#e5e8eb] disabled:text-[#adb5bd]"
                  >
                    {isSubmittingOrder ? "저장 중..." : est.currentStep === 5 ? "주문하기" : "다음 단계로"}
                    <ChevronRight className="h-5 w-5" />
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
