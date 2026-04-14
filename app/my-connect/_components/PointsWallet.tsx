"use client";

import { useEffect, useState } from "react";
import { Coins, Gift, Loader2, Users } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

type PointTransaction = {
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  category: string;
  created_at: string;
};

type PointSummaryResponse = {
  wallet: {
    balance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  };
  referralCount: number;
  transactions: PointTransaction[];
};

function formatCategory(category: string) {
  switch (category) {
    case "referral_referrer_bonus":
      return "추천인 적립";
    case "referral_referee_bonus":
      return "가입 보너스";
    default:
      return category;
  }
}

export function PointsWallet() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PointSummaryResponse | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await authFetch("/api/points/summary");
        const payload = (await response.json()) as PointSummaryResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "포인트 정보를 불러오지 못했습니다.");
        }
        setSummary(payload);
      } catch (error) {
        console.error("Failed to load point summary:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
      <div className="mx-auto max-w-[960px]">
        <h1 className="mb-8 text-2xl font-bold text-[#191F28]">내 포인트</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[14px] border border-[#F2F4F6] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-[#0064FF]" />
              <p className="text-sm font-semibold text-[#4E5968]">현재 포인트</p>
            </div>
            <p className="mt-4 text-[32px] font-bold text-[#191F28]">{summary?.wallet.balance.toLocaleString() || 0} P</p>
          </div>

          <div className="rounded-[14px] border border-[#F2F4F6] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-[#00A86B]" />
              <p className="text-sm font-semibold text-[#4E5968]">누적 적립</p>
            </div>
            <p className="mt-4 text-[32px] font-bold text-[#191F28]">{summary?.wallet.lifetimeEarned.toLocaleString() || 0} P</p>
          </div>

          <div className="rounded-[14px] border border-[#F2F4F6] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[#7C3AED]" />
              <p className="text-sm font-semibold text-[#4E5968]">내가 추천한 가입자</p>
            </div>
            <p className="mt-4 text-[32px] font-bold text-[#191F28]">{summary?.referralCount.toLocaleString() || 0}명</p>
          </div>
        </div>

        <section className="mt-6 rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#191F28]">포인트 적립 내역</h2>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[20px] border border-[#EEF2F6]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[#667085]">
                <tr>
                  <th className="px-5 py-4 font-semibold">일시</th>
                  <th className="px-5 py-4 font-semibold">구분</th>
                  <th className="px-5 py-4 font-semibold">사유</th>
                  <th className="px-5 py-4 font-semibold">변동</th>
                  <th className="px-5 py-4 font-semibold">잔액</th>
                </tr>
              </thead>
              <tbody>
                {summary?.transactions.length ? (
                  summary.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-[#F2F4F6]">
                      <td className="px-5 py-4 font-medium text-[#4E5968]">
                        {new Date(transaction.created_at).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-5 py-4 text-[#344054]">{formatCategory(transaction.category)}</td>
                      <td className="px-5 py-4 text-[#344054]">{transaction.reason}</td>
                      <td className="px-5 py-4 font-semibold text-[#00A86B]">+{Number(transaction.amount || 0).toLocaleString()} P</td>
                      <td className="px-5 py-4 font-semibold text-[#191F28]">{Number(transaction.balance_after || 0).toLocaleString()} P</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#98A2B3]">
                      아직 적립된 포인트 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
