"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { MasterLoadingState } from "./MasterLoadingState";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  role: string | null;
  ban_type: "none" | "temporary" | "permanent" | null;
  ban_expires_at: string | null;
  ban_updated_at: string | null;
  ban_reason?: string | null;
};

type WalletRow = {
  user_id: string;
  balance: number;
};

type RequestRow = {
  client_id: string;
  status: string;
  created_at: string;
};

type RequesterFilter = "all" | "active";

type RequesterTableRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  points: number;
  completedCount: number;
  status: "활성" | "휴면" | "벤";
  banLabel: string | null;
  banExpiresAt: string | null;
  banReason: string | null;
};

type BanAction = "7d" | "30d" | "permanent";

const FILTERS: Array<{ id: RequesterFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "active", label: "활성 회원(거래완료)" },
];

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPoints(value: number) {
  return `${value.toLocaleString("ko-KR")}P`;
}

function getMonthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

function getRecentMonthSeeds(baseDate: Date, count: number) {
  return Array.from({ length: count }, (_, index) => new Date(baseDate.getFullYear(), baseDate.getMonth() - (count - 1 - index), 1));
}

function buildMonthlyBars(requesters: RequesterTableRow[], baseDate: Date, count: number) {
  const seeds = getRecentMonthSeeds(baseDate, count);
  const counts = seeds.map((seed) =>
    requesters.filter((requester) => {
      const createdAt = new Date(requester.createdAt);
      return createdAt.getFullYear() === seed.getFullYear() && createdAt.getMonth() === seed.getMonth();
    }).length
  );
  const max = Math.max(...counts, 1);

  return seeds.map((seed, index) => ({
    label: index === seeds.length - 1 ? `${getMonthLabel(seed)}(현재)` : getMonthLabel(seed),
    count: counts[index],
    height: counts[index] > 0 ? Math.max(12, Math.round((counts[index] / max) * 58)) : 0,
  }));
}

function isRequesterBanned(profile: Pick<ProfileRow, "ban_type" | "ban_expires_at">) {
  if (profile.ban_type === "permanent") return true;
  if (profile.ban_type === "temporary" && profile.ban_expires_at) {
    return new Date(profile.ban_expires_at).getTime() > Date.now();
  }
  return false;
}

function getBanLabel(profile: Pick<ProfileRow, "ban_type" | "ban_expires_at">) {
  if (profile.ban_type === "permanent") {
    return "영구 차단";
  }

  if (profile.ban_type === "temporary" && profile.ban_expires_at) {
    const expiresAt = new Date(profile.ban_expires_at);
    if (expiresAt.getTime() > Date.now()) {
      return `${formatDate(profile.ban_expires_at)}까지 정지`;
    }
  }

  return null;
}

export function MasterRequesterManagement() {
  const today = useMemo(() => new Date(), []);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<RequesterFilter>("all");
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [selectedRequester, setSelectedRequester] = useState<RequesterTableRow | null>(null);
  const [updatingBanAction, setUpdatingBanAction] = useState<BanAction | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [profileResult, walletResult, requestResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, created_at, role, ban_type, ban_expires_at, ban_updated_at, ban_reason")
          .eq("role", "member")
          .order("created_at", { ascending: false }),
        supabase.from("user_point_wallets").select("user_id, balance"),
        supabase.from("rfq_requests").select("client_id, status, created_at"),
      ]);

      if (profileResult.error) {
        if (profileResult.error.message.includes("ban_reason")) {
          const fallbackProfileResult = await supabase
            .from("profiles")
            .select("id, full_name, email, created_at, role, ban_type, ban_expires_at, ban_updated_at")
            .eq("role", "member")
            .order("created_at", { ascending: false });

          if (fallbackProfileResult.error) {
            console.error("Failed to fetch requester profiles:", fallbackProfileResult.error.message);
          } else {
            const nextProfiles = ((fallbackProfileResult.data as Omit<ProfileRow, "ban_reason">[] | null) || []).map((profile) => ({
              ...profile,
              ban_reason: null,
            }));
            setProfiles(nextProfiles);
          }
        } else {
          console.error("Failed to fetch requester profiles:", profileResult.error.message);
        }
      } else {
        setProfiles((profileResult.data as ProfileRow[] | null) || []);
      }

      if (walletResult.error) {
        console.error("Failed to fetch requester wallets:", walletResult.error.message);
      } else {
        setWallets((walletResult.data as WalletRow[] | null) || []);
      }

      if (requestResult.error) {
        console.error("Failed to fetch requester transactions:", requestResult.error.message);
      } else {
        setRequests((requestResult.data as RequestRow[] | null) || []);
      }

      setLoading(false);
    };

    void fetchData();
  }, []);

  const walletMap = useMemo(() => new Map(wallets.map((wallet) => [wallet.user_id, Number(wallet.balance || 0)])), [wallets]);

  const completedCountMap = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach((request) => {
      if (request.status !== "fulfilled") return;
      map.set(request.client_id, (map.get(request.client_id) || 0) + 1);
    });
    return map;
  }, [requests]);

  const requesters = useMemo<RequesterTableRow[]>(
    () =>
      profiles.map((profile) => {
        const completedCount = completedCountMap.get(profile.id) || 0;
        const isBanned = isRequesterBanned(profile);
        return {
          id: profile.id,
          name: profile.full_name?.trim() || "회원",
          email: profile.email?.trim() || "-",
          createdAt: profile.created_at,
          points: walletMap.get(profile.id) || 0,
          completedCount,
          status: isBanned ? "벤" : completedCount > 0 ? "활성" : "휴면",
          banLabel: getBanLabel(profile),
          banExpiresAt: profile.ban_expires_at,
          banReason: profile.ban_reason?.trim() || null,
        };
      }),
    [completedCountMap, profiles, walletMap]
  );

  useEffect(() => {
    setBanReasonInput(selectedRequester?.banReason || "");
  }, [selectedRequester]);

  const filteredRequesters = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return requesters.filter((requester) => {
      if (activeFilter === "active" && requester.status !== "활성") return false;
      if (!normalizedSearch) return true;
      return [requester.name, requester.email].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [activeFilter, requesters, searchTerm]);

  const summary = useMemo(() => {
    const currentMonthCount = requesters.filter((requester) => {
      const createdAt = new Date(requester.createdAt);
      return createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth();
    }).length;

    return {
      totalCount: requesters.length,
      activeCount: requesters.filter((requester) => requester.status === "활성").length,
      currentMonthCount,
    };
  }, [requesters, today]);

  const monthlyBars = useMemo(() => buildMonthlyBars(requesters, today, 7), [requesters, today]);
  const expandedMonthlyBars = useMemo(() => buildMonthlyBars(requesters, today, 12), [requesters, today]);

  const handleBan = async (requester: RequesterTableRow, action: BanAction) => {
    const trimmedReason = banReasonInput.trim();
    if (!trimmedReason) {
      window.alert("제재 사유를 입력해 주세요.");
      return;
    }

    setUpdatingBanAction(action);

    try {
      const response = await authFetch(`/api/admin/members/${requester.id}/ban`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, reason: trimmedReason }),
      });
      const payload = (await response.json()) as {
        error?: string;
        member?: { id: string; ban_type: ProfileRow["ban_type"]; ban_expires_at: string | null; ban_reason: string | null };
      };

      if (!response.ok) {
        throw new Error(payload.error || "벤 처리 중 오류가 발생했습니다.");
      }

      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === requester.id
            ? {
              ...profile,
              ban_type: payload.member?.ban_type || profile.ban_type,
              ban_expires_at: payload.member?.ban_expires_at ?? null,
              ban_reason: payload.member?.ban_reason ?? null,
              ban_updated_at: new Date().toISOString(),
            }
            : profile
        )
      );
      setSelectedRequester((prev) =>
        prev?.id === requester.id
          ? {
            ...prev,
            status: "벤",
            banLabel:
              action === "permanent"
                ? "영구 차단"
                : `${formatDate(
                  new Date(Date.now() + (action === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString()
                )}까지 정지`,
            banExpiresAt:
              action === "permanent"
                ? null
                : new Date(Date.now() + (action === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            banReason: trimmedReason,
          }
          : prev
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "벤 처리 중 오류가 발생했습니다.");
      return;
    } finally {
      setUpdatingBanAction(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#F8FAFC] px-5 py-5">
      <div className="flex w-full flex-col gap-4">
        <section>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[20px] font-bold text-[#1F2A44]">
              <span className="text-[20px]">👤</span>
              <h1>의뢰자 관리</h1>
            </div>
            <p className="text-[14px]  text-[#8C96A8]">두고커넥트 운영 관리 시스템</p>
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-3">
          {[
            { icon: "👥", label: "총 회원수", value: `${summary.totalCount}명`, valueClass: "text-[#2F6BFF]" },
            { icon: "🟢", label: "활성 회원 (거래완료)", value: `${summary.activeCount}명`, valueClass: "text-[#16A34A]" },
            { icon: "🗓️", label: "이번달 신규", value: `${summary.currentMonthCount}명`, valueClass: "text-[#A855F7]" },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-[14px] border border-[#E8EDF3] bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-1 text-[12px] text-[#6a7282]">
                <span className="text-[18px]">{card.icon}</span>
                <span>{card.label}</span>
              </div>
              <p className={`mt-1 text-[24px] font-bold ${card.valueClass}`}>{card.value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[14px] border border-[#E8EDF3] bg-white px-5 py-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#24324A]">
            <span className="text-[14px]">📊</span>
            월별 신규 가입자 추이
          </h2>

          <button type="button" onClick={() => setIsChartOpen(true)} className="mt-8 block w-full text-left">

            <div className="mt-6 grid grid-cols-7 items-end gap-1.5 lg:gap-2">
              {monthlyBars.map((bar) => (
                <div key={bar.label} className="flex flex-col items-center gap-2">
                  <div className="flex h-[84px] w-full items-end">
                    <div className="group relative flex w-full justify-center">
                      {bar.count > 0 ? (
                        <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden flex-col items-center group-hover:flex">
                          <div className="whitespace-nowrap rounded-lg bg-[#1E293B] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                            {bar.count}명
                          </div>
                          <div className="-mt-1 h-2 w-2 rotate-45 bg-[#1E293B]" />
                        </div>
                      ) : null}
                      {bar.height > 0 ? (
                        <div className="w-full rounded-t-[6px] bg-[#5B9DF1] transition hover:bg-[#4389e8]" style={{ height: `${bar.height}px` }} />
                      ) : null}
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-[#A0A8B8]">{bar.label}</span>
                </div>
              ))}
            </div>
          </button>
        </section>

        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-4 py-2 text-[14px] font-bold transition ${isActive ? "bg-[#2F6BFF] text-white" : "border border-[#E3E8EF] bg-white text-[#667085]"
                    }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full max-w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="이름·이메일 검색..."
              className="h-[42px] w-full rounded-full border border-[#E5EAF0] bg-white pl-11 pr-4 text-[14px] font-medium text-[#344054] outline-none placeholder:text-[#98A2B3]"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-[14px] border border-[#E8EDF3] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-[#EEF2F6] text-left">
                  {["이름", "이메일", "가입일", "포인트", "거래횟수", "상태", "관리"].map((label) => (
                    <th key={label} className="px-4 py-3 text-[12px] font-bold text-[#6a7282]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <MasterLoadingState variant="inline" />
                    </td>
                  </tr>
                ) : filteredRequesters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-[14px] font-semibold text-[#98A2B3]">
                      조회된 의뢰자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRequesters.map((requester) => (
                    <tr key={requester.id} className="border-b border-[#F2F5F8] last:border-b-0">
                      <td className="px-4 py-3 text-[14px] font-bold text-[#344054]">{requester.name}</td>
                      <td className="px-4 py-3 text-[12px] text-[#344054]">{requester.email}</td>
                      <td className="px-4 py-3 text-[12px] text-[#344054]">{formatDate(requester.createdAt)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[#4B5565]">{formatPoints(requester.points)}</td>
                      <td className="px-4 py-3 text-[12px] text-[#344054]">{requester.completedCount}회</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${requester.status === "활성"
                            ? "bg-[#E5F9EA] text-[#1BA34A]"
                            : requester.status === "벤"
                              ? "bg-[#FDECEC] text-[#E03131]"
                              : "bg-[#F4F5F7] text-[#6B7280]"
                            }`}
                        >
                          {requester.status}
                        </span>
                      </td>
                      <td className="px-4 py-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRequester(requester)}
                          className="inline-flex items-center rounded-full bg-[#EEF4FF] px-3 py-1 text-[12px] font-bold text-[#2F6BFF]"
                        >
                          관리
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isChartOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="flex max-h-[calc(100vh-48px)] w-full max-w-[980px] flex-col overflow-hidden rounded-[20px] border border-[#E7ECF3] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] px-6 py-5">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-[#24324A]">
                <span className="text-[16px]">📊</span>
                월별 신규 가입자 추이
              </h3>
              <button
                type="button"
                onClick={() => setIsChartOpen(false)}
                className="rounded-full p-2 text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#191F28]"
                aria-label="Close requester chart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto px-6 py-6">
              <div className="min-w-[1180px]">
                <p className="text-[11px] font-bold text-[#98A2B3]">월별 신규 가입자 수 (마우스 오버 시 인원 표시)</p>
                <div
                  className="mt-6 grid items-end gap-2"
                  style={{ gridTemplateColumns: `repeat(${expandedMonthlyBars.length}, minmax(0, 1fr))` }}
                >
                  {expandedMonthlyBars.map((bar) => (
                    <div key={bar.label} className="flex flex-col items-center gap-2">
                      <div className="flex h-[160px] w-full items-end">
                        <div className="group relative flex w-full justify-center">
                          {bar.count > 0 ? (
                            <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden flex-col items-center group-hover:flex">
                              <div className="whitespace-nowrap rounded-lg bg-[#1E293B] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                                {bar.count}명
                              </div>
                              <div className="-mt-1 h-2 w-2 rotate-45 bg-[#1E293B]" />
                            </div>
                          ) : null}
                          {bar.height > 0 ? (
                            <div className="w-full rounded-t-[6px] bg-[#5B9DF1] transition hover:bg-[#4389e8]" style={{ height: `${Math.max(bar.height * 2, 24)}px` }} />
                          ) : null}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#A0A8B8]">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedRequester ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-[480px] overflow-hidden rounded-[14px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#2463eb] to-[#2848c7] px-4 py-2 text-white">
              <h3 className="flex items-center gap-3 text-[16px] font-bold">
                <span className="text-[16px]">👤</span>
                {selectedRequester.name} 관리
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRequester(null)}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close requester modal"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-[14px] bg-[#f7f8fa] px-4 py-3">
                <div className="grid grid-cols-[108px_1fr] gap-y-2.5 text-[14px]">
                  <span className="font-semibold text-[#7b8597]">이메일</span>
                  <span className="text-right font-semibold text-[#1f2937]">{selectedRequester.email}</span>
                  <span className="font-semibold text-[#7b8597]">현재 포인트</span>
                  <span className="text-right text-[14px] font-bold text-[#f07f13]">{formatPoints(selectedRequester.points)}</span>
                  <span className="font-bold text-[#7b8597]">거래 횟수</span>
                  <span className="text-right font-semibold text-[#1f2937]">{selectedRequester.completedCount}회</span>
                  <span className="font-bold text-[#7b8597]">현재 상태</span>
                  <span className="text-right font-semibold text-[#1f2937]">
                    {selectedRequester.status}
                    {selectedRequester.banLabel ? ` · ${selectedRequester.banLabel}` : ""}
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-[#edf1f5] pt-4">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-[#4b5565]">
                  <span>⚠️</span>
                  계정 제재
                </p>

                <div className="mt-3">
                  <label className="mb-2 block text-[12px] font-bold text-[#6b7280]">제재 사유</label>
                  <textarea
                    value={banReasonInput}
                    onChange={(event) => setBanReasonInput(event.target.value)}
                    placeholder="제재 사유를 입력해 주세요."
                    className="h-24 w-full resize-none rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] text-[#1f2937] outline-none transition focus:border-[#2463eb] focus:ring-4 focus:ring-[#2463eb]/10"
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {[
                    { id: "7d" as const, label: "7일 제재", className: "bg-[#fff8e8] text-[#df7a0f]" },
                    { id: "30d" as const, label: "30일 정지", className: "bg-[#fff4ea] text-[#f06417]" },
                    { id: "permanent" as const, label: "영구차단", className: "bg-[#fdeff0] text-[#e03131]" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={updatingBanAction !== null}
                      onClick={() => void handleBan(selectedRequester, item.id)}
                      className={`cursor-pointer rounded-full px-3 py-2 text-[12px] font-bold transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${item.className}`}
                    >
                      {updatingBanAction === item.id ? "처리 중..." : item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequester(null)}
                className="mt-5 w-full rounded-full bg-[#eef0f3] px-5 py-2.5 text-[14px] font-bold text-[#4b5565] transition hover:bg-[#e5e7eb]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
