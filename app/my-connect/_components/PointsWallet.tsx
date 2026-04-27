"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/client/auth-fetch";

type PointTransaction = {
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  category: string;
  created_at: string;
};

type PointPurchase = {
  id: string;
  order_id: string;
  amount_krw: number;
  points: number;
  bonus_points: number;
  status: string;
  provider: string | null;
  created_at: string;
};

type PointPackage = {
  id: string;
  label: string;
  points: number;
  bonusPoints: number;
  amountKrw: number;
};

type PointSummaryResponse = {
  wallet: {
    balance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  };
  referralCount: number;
  transactions: PointTransaction[];
  purchases: PointPurchase[];
  pointPurchasePackages?: PointPackage[];
};

const DEFAULT_POINT_PACKAGES: PointPackage[] = [
  { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
  { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
  { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 7000, amountKrw: 50000 },
];

function formatPoints(value: number) {
  return `${Number(value || 0).toLocaleString()}P`;
}

function formatWon(value: number) {
  return `${Number(value || 0).toLocaleString()}원`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTransactionMeta(transaction: PointTransaction) {
  const category = transaction.category || "";

  if (category.includes("purchase")) {
    return { icon: "⬆️", label: "충전", className: "bg-[#E8F2FF] text-[#3182F6]" };
  }
  if (category.includes("admin_adjustment_credit")) {
    return { icon: "⬆️", label: "관리자 추가", className: "bg-[#E8F2FF] text-[#3182F6]" };
  }
  if (category.includes("admin_adjustment_debit")) {
    return { icon: "⬇️", label: "관리자 차감", className: "bg-[#FFE9EA] text-[#EF4444]" };
  }
  if (category.includes("referral")) {
    return { icon: "⬆️", label: "추천", className: "bg-[#E8F2FF] text-[#3182F6]" };
  }
  if (category.includes("refund")) {
    return { icon: "↩️", label: "환불", className: "bg-[#E9FBF0] text-[#1BB86F]" };
  }
  if (transaction.amount < 0) {
    return { icon: "⬇️", label: "제조 의뢰", className: "bg-[#FFE9EA] text-[#EF4444]" };
  }

  return { icon: "⬆️", label: "적립", className: "bg-[#E8F2FF] text-[#3182F6]" };
}

function formatManufacturingTitle(transaction: PointTransaction) {
  const reason = transaction.reason?.trim();
  const category = transaction.category || "";

  if (category.includes("admin_adjustment")) {
    return reason || getTransactionMeta(transaction).label;
  }

  if (category.includes("refund")) {
    if (!reason) return "제조사 취소 환불";
    if (reason.includes("제조사 취소 환불")) return reason;
    return `제조사 취소 환불 (${reason})`;
  }

  if (transaction.amount < 0) {
    if (!reason) return "제조 의뢰";
    if (reason.includes("제조 의뢰")) return reason;
    return `${reason} 제조 의뢰`;
  }

  return reason || getTransactionMeta(transaction).label;
}

function getPurchaseStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "충전 완료";
    case "ready":
      return "결제 대기";
    case "failed":
      return "실패";
    case "cancelled":
      return "취소";
    default:
      return status || "-";
  }
}

export function PointsWallet({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PointSummaryResponse | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [transactionVisibleCount, setTransactionVisibleCount] = useState(5);
  const [purchaseVisibleCount, setPurchaseVisibleCount] = useState(5);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await authFetch("/api/points/summary");
        const payload = (await response.json()) as PointSummaryResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "포인트 정보를 불러오지 못했습니다.");
        }
        setSummary(payload);
        const requestedPackageId = searchParams.get("package");
        const packages = payload.pointPurchasePackages?.length ? payload.pointPurchasePackages : DEFAULT_POINT_PACKAGES;
        if (requestedPackageId && packages.some((item) => item.id === requestedPackageId)) {
          setSelectedPackageId(requestedPackageId);
        }
      } catch (error) {
        console.error("Failed to load point summary:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSummary();
  }, [refreshKey, searchParams]);

  const selectedPackage = useMemo(
    () => (summary?.pointPurchasePackages || DEFAULT_POINT_PACKAGES).find((item) => item.id === selectedPackageId) || null,
    [selectedPackageId, summary?.pointPurchasePackages]
  );
  const visibleTransactions = useMemo(
    () => (summary?.transactions || []).slice(0, transactionVisibleCount),
    [summary?.transactions, transactionVisibleCount]
  );
  const visiblePurchases = useMemo(
    () => (summary?.purchases || []).slice(0, purchaseVisibleCount),
    [summary?.purchases, purchaseVisibleCount]
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B4DDB]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FA] px-3 py-4 md:px-6">
      <div className="mx-auto max-w-none space-y-5">
        <h1 className="text-[20px] font-bold text-[#1F2937]">💎 포인트 관리</h1>

        <section className="rounded-[12px] bg-gradient-to-r from-[#165cf9] via-[#1E49D8] to-[#1636A3] px-6 py-7 text-white shadow-md md:px-8">
          <p className="text-[14px] font-bold text-white/75">현재 보유 포인트</p>
          <p className="mt-1 text-[36px] font-bold leading-none tracking-wide">
            {formatPoints(summary?.wallet.balance || 0)}
          </p>
          <p className="mt-3 text-[12px] text-white/75">
            유효기간 : 결제일로부터 1년 | 견적 의뢰 시 5,000P 차감
          </p>
        </section>

        <section className="rounded-[10px] border border-[#E6E8EC] bg-white px-4 py-5">
          <h2 className="text-[16px] font-bold text-[#202632]">포인트 충전</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(summary?.pointPurchasePackages?.length ? summary.pointPurchasePackages : DEFAULT_POINT_PACKAGES).map((item) => {
              const totalPoints = item.points + item.bonusPoints;
              const selected = selectedPackageId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPackageId(item.id)}
                  className={`relative min-h-[110px] flex flex-col justify-center rounded-[14px] border px-5 py-4 text-left transition-all duration-200 ${selected
                    ? "border-[#2563eb] bg-[#eff6ff] ring-[1px] ring-[#2563eb]"
                    : "border-[#e5e7eb] bg-white hover:border-[#bfdbfe]"
                    }`}
                >
                  <p className={`text-[18px] font-black ${selected ? "text-[#1e40af]" : "text-[#2563eb]"}`}>
                    {formatPoints(totalPoints)}
                  </p>
                  {item.bonusPoints ? (
                    <p className="mt-0.5 text-[12px] font-bold text-[#059669]">
                      +{formatPoints(item.bonusPoints)} 보너스
                    </p>
                  ) : (
                    <div className="h-[18px]" />
                  )}
                  <p className="mt-1.5 text-[14px] font-medium text-[#6b7280]">
                    {formatWon(item.amountKrw)}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!selectedPackage}
            onClick={() => {
              if (!selectedPackage) return;
              router.push(`/purchase?package=${selectedPackage.id}`);
            }}
            className={`mt-4 h-10 w-full rounded-[9px] text-[13px] font-bold text-white transition duration-200 ${selectedPackage
              ? "bg-[#2563eb] hover:bg-[#1d4ed8] shadow-sm"
              : "bg-[#AFC6FB] cursor-not-allowed opacity-70"
              }`}
          >
            선택한 패키지로 충전하기
          </button>

          <ul className="mt-3 space-y-1 text-[12px]  leading-relaxed text-[#4B5563]">
            <li>• 보너스 포인트는 충전 즉시 지급됩니다.</li>
            <li>• 포인트 유효기간: 충전일로부터 1년</li>
            <li>• 제조사 취소 시 5,000P 자동 환불</li>
          </ul>
        </section>

        <section className="rounded-[10px] border border-[#E6E8EC] bg-white px-4 py-5">
          <h2 className="text-[16px] font-bold text-[#202632]">포인트 이용 내역</h2>
          <div className="mt-5 divide-y divide-[#F2F4F6]">
            {summary?.transactions.length ? (
              visibleTransactions.map((transaction) => {
                const meta = getTransactionMeta(transaction);
                const amount = Number(transaction.amount || 0);
                const isMinus = amount < 0;

                return (
                  <div key={transaction.id} className="flex items-center gap-3 py-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] ${meta.className}`}>
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-[#202632]">{formatManufacturingTitle(transaction)}</p>
                      <p className="mt-0.5 text-[12px] text-[#8B95A1]">
                        {formatDate(transaction.created_at)} · {meta.label}
                      </p>
                    </div>
                    <p className={`shrink-0 text-[14px] font-bold ${isMinus ? "text-[#EF4444]" : "text-[#2864F0]"}`}>
                      {isMinus ? "-" : "+"}
                      {formatPoints(Math.abs(amount))}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-[13px] font-semibold text-[#8B95A1]">아직 포인트 이용 내역이 없습니다.</div>
            )}
          </div>
          {(summary?.transactions.length || 0) > transactionVisibleCount ? (
            <button
              type="button"
              onClick={() => setTransactionVisibleCount((count) => count + 5)}
              className="mt-4 h-10 w-full rounded-[9px] border border-[#DDE2EA] bg-white text-[13px] font-bold text-[#4B5563] transition hover:border-[#AEB8C8] hover:bg-[#F8FAFC]"
            >
              더보기
            </button>
          ) : null}
        </section>

        <section className="rounded-[10px] border border-[#E6E8EC] bg-white px-4 py-5">
          <h2 className="text-[16px] font-bold text-[#202632]">포인트 구매내역</h2>
          <div className="mt-5 divide-y divide-[#F2F4F6]">
            {summary?.purchases.length ? (
              visiblePurchases.map((purchase) => {
                const totalPoints = Number(purchase.points || 0) + Number(purchase.bonus_points || 0);

                return (
                  <div key={purchase.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F2FF] text-[16px] text-[#3182F6]">
                      ⬆️
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-[#202632]">
                        포인트 충전 ({formatWon(purchase.amount_krw)})
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#8B95A1]">
                        {formatDate(purchase.created_at)} · {getPurchaseStatusLabel(purchase.status)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[14px] font-bold text-[#2864F0]">+{formatPoints(totalPoints)}</p>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-[13px] font-semibold text-[#8B95A1]">아직 포인트 구매내역이 없습니다.</div>
            )}
          </div>
          {(summary?.purchases.length || 0) > purchaseVisibleCount ? (
            <button
              type="button"
              onClick={() => setPurchaseVisibleCount((count) => count + 5)}
              className="mt-4 h-10 w-full rounded-[9px] border border-[#DDE2EA] bg-white text-[13px] font-bold text-[#4B5563] transition hover:border-[#AEB8C8] hover:bg-[#F8FAFC]"
            >
              더보기
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
