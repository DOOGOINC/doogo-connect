"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPortalHomeByRole, type AppRole } from "@/lib/auth/roles";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";

type PointPackage = {
  id: string;
  label: string;
  points: number;
  bonusPoints: number;
  amountKrw: number;
};

const DEFAULT_POINT_PACKAGES: PointPackage[] = [
  { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
  { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
  { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 7000, amountKrw: 50000 },
];

const PROFILE_LOOKUP_TIMEOUT_MS = 1200;

function resolveSessionRole(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
  const metadataRole = session?.user.user_metadata?.role;
  return metadataRole === "master" || metadataRole === "manufacturer" || metadataRole === "member" || metadataRole === "partner"
    ? metadataRole
    : null;
}

function formatPoints(value: number) {
  return `${Number(value || 0).toLocaleString()}P`;
}

function formatWon(value: number) {
  return `${Number(value || 0).toLocaleString()}원`;
}

function PurchasePageContent() {
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
      const profile = await Promise.race([
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.warn("Profile role lookup skipped:", error.message);
              return null;
            }

            return data;
          }),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), PROFILE_LOOKUP_TIMEOUT_MS);
        }),
      ]);

      const role = ((profile?.role as AppRole | null) || fallbackRole) as AppRole;
      if (role !== "member") {
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
  }, [router]);

  const selectedPackage = useMemo(
    () => pointPackages.find((item) => item.id === selectedPackageId) || pointPackages[0],
    [pointPackages, selectedPackageId]
  );

  const totalPoints = (selectedPackage?.points || 0) + (selectedPackage?.bonusPoints || 0);

  const handlePurchase = async () => {
    if (!agreedToPolicy) {
      window.alert("주문 내용 및 포인트 이용 정책 동의 후 결제를 진행해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await authFetch("/api/points/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "포인트 충전에 실패했습니다.");
      }

      setCompleted(true);
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
          <section className="rounded-[18px] border border-[#E6E8EC] bg-white p-5 shadow-sm md:p-7">
            <div className="border-b border-[#EEF1F4] pb-5">
              <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#202632]">포인트 충전</h1>
              <p className="mt-2 text-[13px] font-semibold leading-6 text-[#6B7280]">
                필요한 포인트 상품을 선택하고 결제 정보를 확인한 뒤 충전을 진행해 주세요.
              </p>
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#202632]">1. 포인트 선택</h2>
                  <p className="mt-1 text-[12px] font-semibold text-[#6B7280]">충전할 포인트 상품을 선택해 주세요.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {pointPackages.map((item) => {
                  const selected = selectedPackage.id === item.id;
                  const packagePoints = item.points + item.bonusPoints;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPackageId(item.id)}
                      className={`rounded-[14px] border px-4 py-5 text-left transition ${selected ? "border-[#1E49D8] bg-[#F5F8FF] ring-2 ring-[#1E49D8]/15" : "border-[#DDE2EA] bg-white hover:border-[#9FB5F7]"
                        }`}
                    >
                      <p className="text-[12px] font-extrabold text-[#6B7280]">{item.label}</p>
                      <p className="mt-3 text-[22px] font-bold tracking-[-0.03em] text-[#2864F0]">{formatPoints(packagePoints)}</p>
                      {item.bonusPoints ? <p className="mt-1 text-[12px] font-extrabold text-[#10A25F]">+ {formatPoints(item.bonusPoints)} 보너스</p> : null}
                      <p className="mt-4 text-[13px] font-bold text-[#6B7280]">{formatWon(item.amountKrw)}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[12px] border border-[#E7ECF3] bg-[#F8FAFD] px-4 py-4">
                <div className="flex items-center gap-2 text-[14px] font-bold text-[#202632]">
                  <CreditCard className="h-4 w-4 text-[#1E49D8]" />
                  결제 수단 (신용카드 전용)
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-[16px] font-bold text-[#202632]">2. 결제 동의 및 충전</h2>
              <div className="mt-4 rounded-[14px] border border-[#E7ECF3] bg-[#F8FAFD] px-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2 text-[13px] font-semibold leading-6 text-[#334155]">
                    <p>
                      <span className="mr-2 inline-block h-[8px] w-[8px] rounded-full bg-[#2563EB] align-middle" />
                      충전된 포인트의 유효기간은 결제일로부터 <span className="font-bold text-[#2563EB]">1년</span>입니다.
                    </p>
                    <p>
                      <span className="mr-2 inline-block h-[8px] w-[8px] rounded-full bg-[#2563EB] align-middle" />
                      포인트 환불은 결제하신 수단(<span className="font-bold text-[#2563EB]">신용카드</span>)을 통해서만 가능합니다.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-4">
                    <input
                      type="checkbox"
                      checked={agreedToPolicy}
                      onChange={(event) => setAgreedToPolicy(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border border-[#D6DEEB] bg-white text-white transition peer-checked:border-[#2563EB] peer-checked:bg-[#2563EB]">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-7 text-[#334155]">
                        주문 내용 및 포인트 이용 정책을 확인하였으며, 결제에 동의합니다.
                      </span>
                      <span className="mt-2 block text-[13px] font-semibold leading-8 text-[#94A3B8]">
                        구매하신 포인트는 디지털 상품의 특성상 사용 즉시 환불이 제한될 수 있음을 확인하였으며, 서비스 이용약관 및 개인정보 처리방침에 따라
                        결제를 진행합니다.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {completed ? (
                <div className="mt-5 rounded-[14px]  p-4">
                  <div className="flex items-center gap-2 text-[14px] font-bold text-[#10a25f]">
                    <CheckCircle2 className="h-5 w-5" />
                    포인트 충전이 완료되었습니다.
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/my-connect?tab=points")}
                    className="mt-4 h-11 w-full rounded-[10px] bg-[#1E49D8] text-[14px] font-extrabold text-white transition hover:bg-[#173DB8]"
                  >
                    구매내역 확인하기
                  </button>
                </div>
              ) : (
                <>
                  {errorMessage ? (
                    <p className="mt-4 rounded-[10px] bg-[#FFF1F1] px-4 py-3 text-[13px] font-bold text-[#D92D20]">{errorMessage}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handlePurchase()}
                    disabled={submitting}
                    className="mt-5 h-12 w-full rounded-[10px] bg-[#1E49D8] text-[14px] font-extrabold text-white transition hover:bg-[#173DB8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "충전 처리 중..." : "충전하기"}
                  </button>
                </>
              )}

            </div>
          </section>

          <aside className="rounded-[18px] border border-[#E6E8EC] bg-white p-5 shadow-sm lg:sticky lg:top-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1E49D8]" />
              <h2 className="text-[18px] font-bold text-[#202632]">주문 요약</h2>
            </div>

            <div className="mt-5 rounded-[14px] bg-[#F7F8FA] p-4">
              <p className="text-[12px] font-extrabold text-[#6B7280]">선택 상품</p>
              <p className="mt-2 text-[18px] font-bold text-[#202632]">{selectedPackage.label}</p>
              <p className="mt-1 text-[13px] font-bold text-[#6B7280]">{formatPoints(totalPoints)}</p>
            </div>

            <div className="mt-5 space-y-3 rounded-[14px] border border-[#EEF1F4] bg-white p-4">
              <div className="flex items-center justify-between text-[14px] font-bold text-[#4B5563]">
                <span>충전 포인트</span>
                <span className="text-[#202632]">{formatPoints(selectedPackage.points)}</span>
              </div>
              <div className="flex items-center justify-between text-[14px] font-bold text-[#4B5563]">
                <span>보너스 포인트</span>
                <span className="text-[#10A25F]">+{formatPoints(selectedPackage.bonusPoints)}</span>
              </div>
              <div className="h-px bg-[#E6E8EC]" />
              <div className="flex items-center justify-between text-[18px] font-bold text-[#202632]">
                <span>총 결제 금액</span>
                <span>{formatWon(selectedPackage.amountKrw)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[14px] border border-[#E7ECF3] bg-[#F8FAFD] px-4 py-4">
              <p className="text-[12px] font-extrabold text-[#6B7280]">결제 안내</p>
              <div className="mt-3 space-y-2 text-[13px] font-semibold leading-6 text-[#6B7280]">
                <p>- 결제 완료 후 포인트가 즉시 충전됩니다.</p>
                <p>- 충전된 포인트는 마이페이지에서 바로 확인 가능합니다.</p>
                <p>- 신용카드 결제만 지원합니다.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 px-1">
          <div className="space-y-2 text-[13px] font-semibold leading-6 text-[#6B7280]">
            <p>결제 완료 시 즉시 포인트가 충전되며, 충전 내역은 마이페이지에서 확인 가능합니다.</p>
            <p>결제 과정에서 문제가 발생할 경우 고객센터로 문의해 주시기 바랍니다.</p>
            <p>- 모든거래에 대한 책임과 환불, 민원등은 ㈜두고홀딩스에서진행합니다.</p>
            <p>- 민원담당자 : 문원오</p>
            <p>- 연락처 : 070-7174-2186</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E49D8]" />
        </div>
      }
    >
      <PurchasePageContent />
    </Suspense>
  );
}
