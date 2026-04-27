"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";

type ReferralMember = {
  id: string;
  name: string;
  email: string;
  joinedAt: string | null;
  orderCount: number;
  totalKrw: number;
  totalNzd: number;
};

type ReferralResponse = {
  partner: {
    fullName: string;
    referralCode: string;
  };
  summary: {
    totalReferralCount: number;
    newThisMonthCount: number;
    totalContributionKrw: number;
    totalContributionNzd: number;
  };
  members: ReferralMember[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatKrw(value: number) {
  return `₩${Math.round(value).toLocaleString()}`;
}

function formatNzd(value: number) {
  return `NZD ${Math.round(value).toLocaleString()}`;
}

export function PartnerReferralsPanel() {
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copyLabel, setCopyLabel] = useState("복사");
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    const loadReferrals = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "10",
        });

        const trimmedSearch = searchInput.trim();
        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        }

        const response = await authFetch(`/api/partner/referrals?${params.toString()}`);
        const payload = (await response.json()) as ReferralResponse;

        if (!response.ok) {
          throw new Error(payload.error || "추천 회원 정보를 불러오지 못했습니다.");
        }

        if (!active) return;
        setData(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "추천 회원 정보를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadReferrals();

    return () => {
      active = false;
    };
  }, [page, searchInput]);

  const handleCopy = async () => {
    if (!data?.partner.referralCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(data.partner.referralCode);
      setCopyLabel("복사됨 ✓");
      window.setTimeout(() => setCopyLabel("복사"), 1500);
    } catch (err) {
      console.error("Referral code copy failed:", err);
      setCopyLabel("실패");
      window.setTimeout(() => setCopyLabel("복사"), 1500);
    }
  };

  return (
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#f9fafb] px-6 py-6">
      <div className="w-full max-w-[1400px]">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">추천 회원</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-[14px] font-semibold text-[#B91C1C]">{error}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">총 추천 회원</p>
            <p className="mt-1 text-[24px] font-bold tracking-[-0.04em] text-[#2563EB]">{loading ? "-" : `${data?.summary.totalReferralCount || 0}명`}</p>
          </article>

          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">이번 달 신규</p>
            <p className="mt-1 text-[24px] font-bold tracking-[-0.04em] text-[#16A34A]">{loading ? "-" : `${data?.summary.newThisMonthCount || 0}명`}</p>
          </article>

          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">총 기여 매출 (NZD)</p>
            <p className="mt-1 text-[24px] font-bold tracking-[-0.04em] text-[#8B2CF5]">{loading ? "-" : formatNzd(data?.summary.totalContributionNzd || 0)}</p>
          </article>

          <article className="rounded-[14px] border border-[#E7ECF3] bg-white px-5 py-4 shadow-sm">
            <p className="text-[12px] font-semibold text-[#8B95A1]">총 기여 매출 (KRW)</p>
            <p className="mt-1 text-[24px] font-bold tracking-[-0.04em] text-[#4F46E5]">{loading ? "-" : formatKrw(data?.summary.totalContributionKrw || 0)}</p>
          </article>
        </div>

        <section className="mt-5 rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-[12px] font-semibold text-[#7B8794]">내 추천 코드</p>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-[24px] font-bold tracking-[0.12em] text-[#2563EB]">{data?.partner.referralCode || "-"}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    disabled={!data?.partner.referralCode}
                    className="inline-flex h-10 items-center gap-2 rounded-[16px] bg-[#2563EB] px-5 text-[14px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    {copyLabel}
                  </button>
                </div>
              </div>
            </div>

            <label className="block">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="이름 또는 이메일로 검색..."
                className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-[14px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A2B3] focus:border-[#C6D8FF] focus:ring-4 focus:ring-[#EEF4FF]"
              />
            </label>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[14px] border border-[#E7ECF3] bg-white shadow-sm">
          <div className="border-b border-[#EEF2F6] px-5 py-5">
            <h2 className="text-[14px] font-bold text-[#111827]">추천 회원 목록</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-[#EEF2F6] bg-white text-left text-[12px] font-bold text-[#6B7280]">
                  <th className="px-6 py-4">이름</th>
                  <th className="px-6 py-4">이메일</th>
                  <th className="px-6 py-4">가입일</th>
                  <th className="px-6 py-4">주문 횟수</th>
                  <th className="px-6 py-4">기여 매출</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : data?.members.length ? (
                  data.members.map((member) => (
                    <tr key={member.id} className="border-b border-[#F2F4F7] last:border-b-0">
                      <td className="px-6 py-4 text-[14px] font-semibold text-[#1F2937]">{member.name}</td>
                      <td className="px-6 py-4 text-[14px] text-[#344054]">{member.email}</td>
                      <td className="px-6 py-4 text-[14px] text-[#344054]">{formatDate(member.joinedAt)}</td>
                      <td className="px-6 py-4 text-[14px] text-[#344054]">{member.orderCount}건</td>
                      <td className="px-6 py-4 text-[14px] text-[#344054]">
                        <div className="flex flex-col gap-1">
                          {member.totalNzd > 0 ? <span>{formatNzd(member.totalNzd)}</span> : null}
                          <span>{formatKrw(member.totalKrw)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[14px] font-semibold text-[#98A2B3]">
                      추천 회원이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data?.pagination.totalCount && data.pagination.totalCount > data.pagination.pageSize ? (
            <MasterTablePagination
              totalItems={data.pagination.totalCount}
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </section>
      </div>
    </section>
  );
}
