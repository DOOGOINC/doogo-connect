"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { setStoredImpersonationUserId } from "@/lib/client/impersonation";
import { supabase } from "@/lib/supabase";
import { useIsClient } from "./useIsClient";
import { RequesterChartModal } from "./master-requester-management/RequesterChartModal";
import { RequesterDashboard } from "./master-requester-management/RequesterDashboard";
import { RequesterDetailModal } from "./master-requester-management/RequesterDetailModal";
import type { BanAction, ProfileRow, RequestRow, RequesterTableRow, WalletRow } from "./master-requester-management/types";
import { buildMonthlyBars, formatDate, getBanLabel, isRequesterBanned, PAGE_SIZE } from "./master-requester-management/utils";

type PartnerProfileRow = {
  id: string;
  full_name: string | null;
};

export function MasterRequesterManagement({ refreshKey = 0 }: { refreshKey?: number }) {
  const today = useMemo(() => new Date(), []);
  const mounted = useIsClient();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active">("all");
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [selectedRequester, setSelectedRequester] = useState<RequesterTableRow | null>(null);
  const [updatingBanAction, setUpdatingBanAction] = useState<BanAction | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("");
  const [pointAmountInput, setPointAmountInput] = useState("");
  const [pointReasonInput, setPointReasonInput] = useState("");
  const [isSubmittingPoint, setIsSubmittingPoint] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [partnerNameMap, setPartnerNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let loadedProfiles: ProfileRow[] = [];

      const profileResult = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at, referred_by_profile_id, member_grade, ban_type, ban_expires_at, ban_updated_at, ban_reason")
        .eq("role", "member")
        .order("created_at", { ascending: false });

      if (profileResult.error) {
        if (
          profileResult.error.message.includes("ban_reason") ||
          profileResult.error.message.includes("referred_by_profile_id") ||
          profileResult.error.message.includes("member_grade")
        ) {
          const fallbackProfileResult = await supabase
            .from("profiles")
            .select("id, full_name, email, created_at, ban_type, ban_expires_at, ban_updated_at")
            .eq("role", "member")
            .order("created_at", { ascending: false });

          if (fallbackProfileResult.error) {
            console.error("Failed to fetch requester profiles:", fallbackProfileResult.error.message);
          } else {
            const nextProfiles = ((fallbackProfileResult.data as Omit<ProfileRow, "ban_reason">[] | null) || []).map((profile) => ({
              ...profile,
              referred_by_profile_id: null,
              member_grade: "general" as const,
              ban_reason: null,
            }));
            loadedProfiles = nextProfiles;
            setProfiles(nextProfiles);
          }
        } else {
          console.error("Failed to fetch requester profiles:", profileResult.error.message);
        }
      } else {
        loadedProfiles = (profileResult.data as ProfileRow[] | null) || [];
        setProfiles(loadedProfiles);
      }

      const memberIds = Array.from(new Set(loadedProfiles.map((profile) => profile.id).filter(Boolean)));
      const partnerIds = Array.from(
        new Set(loadedProfiles.map((profile) => profile.referred_by_profile_id).filter((value): value is string => Boolean(value)))
      );

      const [walletResult, requestResult, partnerResult] = await Promise.all([
        memberIds.length
          ? supabase.from("user_point_wallets").select("user_id, balance").in("user_id", memberIds)
          : Promise.resolve({ data: [], error: null }),
        memberIds.length
          ? supabase.from("rfq_requests").select("client_id").in("client_id", memberIds).eq("status", "fulfilled")
          : Promise.resolve({ data: [], error: null }),
        partnerIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", partnerIds).eq("role", "partner")
          : Promise.resolve({ data: [], error: null }),
      ]);

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

      if (partnerResult.error) {
        console.error("Failed to fetch partner profiles:", partnerResult.error.message);
      } else {
        const nextPartnerNameMap = new Map<string, string>();
        (((partnerResult.data as PartnerProfileRow[] | null) || [])).forEach((partner) => {
          nextPartnerNameMap.set(partner.id, partner.full_name?.trim() || "파트너");
        });
        setPartnerNameMap(nextPartnerNameMap);
      }

      setLoading(false);
    };

    void fetchData();
  }, [refreshKey]);

  const walletMap = useMemo(() => new Map(wallets.map((wallet) => [wallet.user_id, Number(wallet.balance || 0)])), [wallets]);

  const completedCountMap = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach((request) => {
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
          partnerName: profile.referred_by_profile_id ? partnerNameMap.get(profile.referred_by_profile_id) || "-" : "-",
          memberGrade: profile.member_grade === "student" ? "student" : "general",
          points: walletMap.get(profile.id) || 0,
          completedCount,
          status: isBanned ? "벤" : completedCount > 0 ? "활성" : "휴면",
          banLabel: getBanLabel(profile),
          banExpiresAt: profile.ban_expires_at,
          banReason: profile.ban_reason?.trim() || null,
        };
      }),
    [completedCountMap, partnerNameMap, profiles, walletMap]
  );

  useEffect(() => {
    setBanReasonInput(selectedRequester?.banReason || "");
    setPointAmountInput("");
    setPointReasonInput("");
  }, [selectedRequester]);

  const handleAddPoints = async (requester: RequesterTableRow) => {
    const amount = Math.max(0, Math.floor(Number(pointAmountInput || 0)));
    const reason = pointReasonInput.trim() || "관리자 수동 지급";

    if (amount <= 0) {
      window.alert("포인트를 1P 이상 입력해 주세요.");
      return;
    }

    setIsSubmittingPoint(true);

    try {
      const response = await authFetch("/api/admin/point-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: requester.id,
          amount,
          action: "add",
          reason,
        }),
      });
      const payload = (await response.json()) as { error?: string; balanceAfter?: number };

      if (!response.ok) {
        throw new Error(payload.error || "포인트 지급 중 오류가 발생했습니다.");
      }

      const balanceAfter = Number(payload.balanceAfter || 0);
      setWallets((prev) => {
        const next = [...prev];
        const index = next.findIndex((wallet) => wallet.user_id === requester.id);

        if (index >= 0) {
          next[index] = { ...next[index], balance: balanceAfter };
          return next;
        }

        next.push({ user_id: requester.id, balance: balanceAfter });
        return next;
      });
      setSelectedRequester((prev) => (prev?.id === requester.id ? { ...prev, points: balanceAfter } : prev));
      setPointAmountInput("");
      setPointReasonInput("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "포인트 지급 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingPoint(false);
    }
  };

  const filteredRequesters = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return requesters.filter((requester) => {
      if (activeFilter === "active" && requester.status !== "활성") return false;
      if (!normalizedSearch) return true;
      return [requester.name, requester.email, requester.partnerName].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [activeFilter, requesters, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequesters.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedRequesters = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return filteredRequesters.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRequesters, visiblePage]);

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
                : `${formatDate(new Date(Date.now() + (action === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString())}까지 정지`,
            banExpiresAt:
              action === "permanent" ? null : new Date(Date.now() + (action === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            banReason: trimmedReason,
          }
          : prev
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "벤 처리 중 오류가 발생했습니다.");
    } finally {
      setUpdatingBanAction(null);
    }
  };

  const handleMemberGradeChange = async (requesterId: string, memberGrade: "student" | "general") => {
    const { error } = await supabase.from("profiles").update({ member_grade: memberGrade }).eq("id", requesterId).eq("role", "member");

    if (error) {
      window.alert(error.message);
      return;
    }

    setProfiles((prev) => prev.map((profile) => (profile.id === requesterId ? { ...profile, member_grade: memberGrade } : profile)));
    setSelectedRequester((prev) => (prev?.id === requesterId ? { ...prev, memberGrade } : prev));
  };

  const handleStartImpersonation = (requester: RequesterTableRow) => {
    const confirmed = window.confirm(
      [
        "관리자 대행모드를 시작하시겠습니까?",
        "",
        "대행모드 진행 중에는 브라우저 뒤로가기를 사용하지 말고,",
        "작업을 마친 뒤 반드시 종료 버튼으로 대행모드를 종료해 주세요.",
      ].join("\n")
    );

    if (!confirmed) {
      return;
    }

    setStoredImpersonationUserId(requester.id);
    window.location.href = `/my-connect?impersonate=${encodeURIComponent(requester.id)}`;
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#F8FAFC] px-5 py-5">
      <RequesterDashboard
        summary={summary}
        monthlyBars={monthlyBars}
        activeFilter={activeFilter}
        onFilterChange={(value) => {
          setActiveFilter(value);
          setCurrentPage(1);
        }}
        searchTerm={searchTerm}
        onSearchTermChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        loading={loading}
        filteredCount={filteredRequesters.length}
        requesters={paginatedRequesters}
        currentPage={visiblePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onOpenChart={() => setIsChartOpen(true)}
        onSelectRequester={setSelectedRequester}
        onMemberGradeChange={(requesterId, memberGrade) => void handleMemberGradeChange(requesterId, memberGrade)}
      />

      <RequesterChartModal isOpen={isChartOpen} monthlyBars={expandedMonthlyBars} onClose={() => setIsChartOpen(false)} />
      <RequesterDetailModal
        requester={selectedRequester}
        banReasonInput={banReasonInput}
        pointAmountInput={pointAmountInput}
        pointReasonInput={pointReasonInput}
        isSubmittingPoint={isSubmittingPoint}
        updatingBanAction={updatingBanAction}
        onClose={() => setSelectedRequester(null)}
        onBanReasonChange={setBanReasonInput}
        onPointAmountChange={setPointAmountInput}
        onPointReasonChange={setPointReasonInput}
        onAddPoints={(requester) => void handleAddPoints(requester)}
        onBan={(requester, action) => void handleBan(requester, action)}
        onStartImpersonation={handleStartImpersonation}
      />
    </div>
  );
}
