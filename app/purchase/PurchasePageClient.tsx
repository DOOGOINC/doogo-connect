"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { getPortalHomeByRole, type AppRole } from "@/lib/auth/roles";
import { authFetch } from "@/lib/client/auth-fetch";
import { clearStoredImpersonationUserId, getStoredImpersonationUserId, setStoredImpersonationUserId } from "@/lib/client/impersonation";
import { supabase } from "@/lib/supabase";
import { PurchaseFooterNotice, PurchaseMainSection, PurchaseSummarySection } from "./PurchaseSections";
import {
  DEFAULT_POINT_PACKAGES,
  PROFILE_LOOKUP_TIMEOUT_MS,
  type PointPackage,
  type PortOnePaymentResponse,
  type PortOneRequestPaymentParams,
} from "./purchaseShared";

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (params: PortOneRequestPaymentParams) => Promise<PortOnePaymentResponse>;
    };
  }
}

function resolveSessionRole(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
  const metadataRole = session?.user.user_metadata?.role;
  return metadataRole === "master" || metadataRole === "manufacturer" || metadataRole === "member" || metadataRole === "partner"
    ? metadataRole
    : null;
}

export function PurchasePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPackage = searchParams.get("package");
  const [pointPackages, setPointPackages] = useState<PointPackage[]>(DEFAULT_POINT_PACKAGES);
  const [selectedPackageId, setSelectedPackageId] = useState(requestedPackage || "starter");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/?auth=login";
        return;
      }

      const fallbackRole = resolveSessionRole(session) || "member";
      const requestedImpersonationUserId = searchParams.get("impersonate")?.trim() || "";
      const storedImpersonationUserId = getStoredImpersonationUserId();
      const impersonationUserId = requestedImpersonationUserId || storedImpersonationUserId || "";

      if (impersonationUserId) {
        setStoredImpersonationUserId(impersonationUserId);
      }

      const profileSyncUrl = impersonationUserId
        ? `/api/profile/sync?impersonate=${encodeURIComponent(impersonationUserId)}`
        : "/api/profile/sync";
      const profileLookupRequest = (
        impersonationUserId
          ? authFetch(profileSyncUrl, {
              headers: {
                "X-Impersonate-User-Id": impersonationUserId,
              },
            })
          : authFetch(profileSyncUrl)
      )
        .then(async (response) => {
          const payload = (await response.json()) as {
            profile?: { role?: AppRole | null };
            error?: string;
          };
          if (!response.ok) {
            throw new Error(payload.error || "Profile lookup failed.");
          }
          return payload;
        })
        .catch((error) => {
          console.warn("Profile role lookup skipped:", error instanceof Error ? error.message : String(error));
          return null;
        });

      const profilePayload = await (impersonationUserId
        ? profileLookupRequest
        : Promise.race([
            profileLookupRequest,
            new Promise<null>((resolve) => {
              window.setTimeout(() => resolve(null), PROFILE_LOOKUP_TIMEOUT_MS);
            }),
          ]));

      const role = (profilePayload?.profile?.role || fallbackRole) as AppRole;
      if (impersonationUserId) {
        if (profilePayload?.profile?.role && role !== "member") {
          clearStoredImpersonationUserId();
          window.location.href = "/master?tab=requesters";
          return;
        }
      } else if (role !== "member") {
        router.replace(getPortalHomeByRole(role));
        return;
      }

      const pointResponse = await authFetch("/api/points/summary");
      const pointPayload = (await pointResponse.json()) as { pointPurchasePackages?: PointPackage[] };
      if (pointResponse.ok && pointPayload.pointPurchasePackages?.length) {
        setPointPackages(pointPayload.pointPurchasePackages);
        setSelectedPackageId((prev) =>
          pointPayload.pointPurchasePackages?.some((item) => item.id === prev) ? prev : pointPayload.pointPurchasePackages?.[0]?.id || "starter"
        );
      }

      setLoading(false);
    };

    void checkAccess();
  }, [router, searchParams]);

  const selectedPackage = useMemo(
    () => pointPackages.find((item) => item.id === selectedPackageId) || pointPackages[0],
    [pointPackages, selectedPackageId]
  );

  const totalPoints = (selectedPackage?.points || 0) + (selectedPackage?.bonusPoints || 0);

  const completePurchase = async (paymentId: string) => {
    const response = await authFetch("/api/points/purchases", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentId }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "결제 검증에 실패했습니다.");
    }

    setPendingPaymentId("");
    setCompleted(true);
  };

  const handlePurchase = async () => {
    if (!agreedToPolicy) {
      window.alert("주문 내용 및 포인트 이용 약관에 동의한 뒤 결제를 진행해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (pendingPaymentId) {
        await completePurchase(pendingPaymentId);
        return;
      }

      if (!window.PortOne) {
        throw new Error("결제 모듈이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      }

      const response = await authFetch("/api/points/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });
      const payload = (await response.json()) as {
        error?: string;
        payment?: {
          storeId: string;
          channelKey: string;
          paymentId: string;
          orderName: string;
          totalAmount: number;
          customer?: {
            fullName?: string;
            email?: string;
            phoneNumber?: string;
          };
        };
      };

      if (!response.ok || !payload.payment) {
        throw new Error(payload.error || "포인트 충전에 실패했습니다.");
      }

      setPendingPaymentId(payload.payment.paymentId);

      const paymentResult = await window.PortOne.requestPayment({
        storeId: payload.payment.storeId,
        channelKey: payload.payment.channelKey,
        paymentId: payload.payment.paymentId,
        orderName: payload.payment.orderName,
        totalAmount: payload.payment.totalAmount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: payload.payment.customer || {},
      });

      if (paymentResult.code) {
        setPendingPaymentId("");
        throw new Error(paymentResult.message || "결제가 취소되었거나 실패했습니다.");
      }

      await completePurchase(payload.payment.paymentId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "포인트 충전에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E49D8]" />
      </div>
    );
  }

  return (
    <>
      <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="afterInteractive" />
      <main className="min-h-screen bg-[#F7F8FA] px-4 py-18 md:px-6 md:py-20">
        <div className="mx-auto max-w-[1160px]">
          <button
            type="button"
            onClick={() => router.push("/my-connect?tab=points")}
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#DDE2EA] bg-white px-4 text-[13px] font-extrabold text-[#4B5563] transition hover:border-[#AEB8C8]"
          >
            <ArrowLeft className="h-4 w-4" />
            포인트 관리로 돌아가기
          </button>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <PurchaseMainSection
              pointPackages={pointPackages}
              selectedPackage={selectedPackage}
              agreedToPolicy={agreedToPolicy}
              completed={completed}
              submitting={submitting}
              pendingPaymentId={pendingPaymentId}
              errorMessage={errorMessage}
              onSelectPackage={setSelectedPackageId}
              onAgreeChange={setAgreedToPolicy}
              onSubmit={() => {
                void handlePurchase();
              }}
              onViewHistory={() => router.push("/my-connect?tab=points")}
            />
            <PurchaseSummarySection selectedPackage={selectedPackage} totalPoints={totalPoints} />
          </div>

          <PurchaseFooterNotice />
        </div>
      </main>
    </>
  );
}
