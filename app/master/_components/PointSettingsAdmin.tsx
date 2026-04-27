"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { MasterLoadingState } from "./MasterLoadingState";

type PointTransaction = {
  id: string;
  userId: string;
  memberName: string;
  email: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  category: string;
  createdAt: string;
};

type PointMember = {
  id: string;
  memberName: string;
  email: string;
  balance: number;
};

type PointSettingsResponse = {
  stats: {
    totalCharged: number;
    totalSpent: number;
    totalBalance: number;
    monthlyPurchaseCount: number;
  };
  transactions: PointTransaction[];
  members: PointMember[];
};

type FilterType = "all" | "charge" | "use" | "refund";
type AdjustmentAction = "add" | "subtract";

const FILTERS: Array<{ id: FilterType; label: string }> = [
  { id: "all", label: "전체" },
  { id: "charge", label: "충전" },
  { id: "use", label: "사용" },
  { id: "refund", label: "환불" },
];
const PAGE_SIZE = 10;

function formatPoints(value: number) {
  return `${Number(value || 0).toLocaleString()}P`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTransactionKind(transaction: PointTransaction): FilterType {
  const category = transaction.category || "";
  if (category.includes("refund")) return "refund";
  if (transaction.amount < 0) return "use";
  return "charge";
}

function getKindLabel(kind: FilterType) {
  if (kind === "charge") return "충전";
  if (kind === "use") return "사용";
  if (kind === "refund") return "환불";
  return "전체";
}

function getKindClass(kind: FilterType) {
  if (kind === "charge") return "bg-[#DCFCE7] text-[#16A34A]";
  if (kind === "use") return "bg-[#FEE2E2] text-[#DC2626]";
  if (kind === "refund") return "bg-[#DBEAFE] text-[#2563EB]";
  return "bg-[#F2F4F7] text-[#4B5563]";
}

export function PointSettingsAdmin({ refreshKey = 0 }: { refreshKey?: number }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<PointSettingsResponse["stats"]>({
    totalCharged: 0,
    totalSpent: 0,
    totalBalance: 0,
    monthlyPurchaseCount: 0,
  });
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [members, setMembers] = useState<PointMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<PointMember | null>(null);
  const [adjustmentAction, setAdjustmentAction] = useState<AdjustmentAction>("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const fetchData = async () => {
    try {
      const response = await authFetch("/api/admin/point-settings");
      const payload = (await response.json()) as PointSettingsResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "포인트 정보를 불러오지 못했습니다.");
      }

      setStats(payload.stats);
      setTransactions(payload.transactions || []);
      setMembers(payload.members || []);
      setSelectedMember((prev) => {
        if (!prev) return prev;
        return (payload.members || []).find((member) => member.id === prev.id) || prev;
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "포인트 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [refreshKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const kind = getTransactionKind(transaction);
      if (activeFilter !== "all" && kind !== activeFilter) return false;

      if (!normalizedSearch) return true;

      return [transaction.memberName, transaction.email, transaction.reason]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [activeFilter, searchTerm, transactions]);
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredTransactions, totalPages]);
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closeModal = () => {
    setSelectedMember(null);
    setAdjustmentAction("add");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setError("");
  };

  const openMemberModal = (memberId: string) => {
    const member = memberMap.get(memberId);
    if (!member) return;
    setSelectedMember(member);
    setAdjustmentAction("add");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setError("");
  };

  const handleApply = async () => {
    if (!selectedMember) return;

    const amount = Math.max(0, Math.floor(Number(adjustmentAmount || 0)));
    if (amount <= 0) {
      setError("포인트를 1P 이상 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await authFetch("/api/admin/point-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedMember.id,
          amount,
          action: adjustmentAction,
          reason: adjustmentReason.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "포인트 조정에 실패했습니다.");
      }

      await fetchData();
      setAdjustmentAmount("");
      setAdjustmentReason("");
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "포인트 조정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <MasterLoadingState />;
  }

  return (
    <div className="flex flex-1 overflow-y-auto bg-[#F7F8FA] px-6 py-5">
      <div className="w-full">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-[#1F2937]">
            <span>⚡</span>
            포인트
          </h1>
          <p className="mt-1 text-[12px] font-medium text-[#6B7280]">두고커넥트 운영 관리 시스템</p>
        </header>

        <section className="grid gap-3 lg:grid-cols-4">
          {[
            { icon: "💰", label: "총 충전금액", value: formatPoints(stats.totalCharged), className: "text-[#2563EB]" },
            { icon: "⚡", label: "총 사용금액", value: formatPoints(stats.totalSpent), className: "text-[#E11D48]" },
            { icon: "💎", label: "총 잔여포인트", value: formatPoints(stats.totalBalance), className: "text-[#D97706]" },
            { icon: "📅", label: "이번달 충전건수", value: `${stats.monthlyPurchaseCount.toLocaleString()}건`, className: "text-[#16A34A]" },
          ].map((card) => (
            <article key={card.label} className="rounded-[10px] border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
              <p className="flex items-center gap-2 text-[12px]  text-[#6B7280]">
                <span className="text-[16px]">{card.icon}</span>
                {card.label}
              </p>
              <p className={`mt-2 text-[24px] font-bold ${card.className}`}>{card.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-[10px] border border-[#E5E7EB] bg-white p-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`h-8 rounded-full px-4 text-[12px] font-bold transition ${active ? "bg-[#2563EB] text-white" : "bg-white text-[#4B5563] hover:bg-[#F3F4F6]"
                    }`}
                >
                  {filter.label}
                </button>
              );
            })}
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="회원명·이메일·사유 검색..."
              className="h-8 min-w-[240px] flex-1 rounded-full border border-[#E5E7EB] px-4 text-[12px] font-medium text-[#374151] outline-none focus:border-[#2563EB]"
            />
          </div>
        </section>

        <section className="mt-3 overflow-hidden rounded-[10px] border border-[#E5E7EB] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-[#F9FAFB]">
                <tr className="text-[12px] font-bold text-[#6B7280]">
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3">회원명</th>
                  <th className="px-4 py-3">이메일</th>
                  <th className="px-4 py-3">구분</th>
                  <th className="px-4 py-3">포인트</th>
                  <th className="px-4 py-3">사유</th>
                  <th className="px-4 py-3">잔액</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {paginatedTransactions.length ? (
                  paginatedTransactions.map((transaction) => {
                    const kind = getTransactionKind(transaction);
                    const isMinus = transaction.amount < 0;

                    return (
                      <tr key={transaction.id} className="text-[12px] text-[#4B5563]">
                        <td className="px-4 py-3 font-semibold">{formatDate(transaction.createdAt)}</td>
                        <td className="px-4 py-3 font-bold text-[#374151]">{transaction.memberName}</td>
                        <td className="px-4 py-3">{transaction.email}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getKindClass(kind)}`}>
                            {getKindLabel(kind)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-bold ${isMinus ? "text-[#E11D48]" : "text-[#16A34A]"}`}>
                          {isMinus ? "-" : "+"}
                          {formatPoints(Math.abs(transaction.amount))}
                        </td>
                        <td className="px-4 py-3 font-medium">{transaction.reason || "-"}</td>
                        <td className="px-4 py-3 font-bold text-[#374151]">{formatPoints(transaction.balanceAfter)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openMemberModal(transaction.userId)}
                            className="rounded-full bg-[#EFF6FF] px-3 py-1 text-[12px] font-bold text-[#2563EB] hover:bg-[#DBEAFE]"
                          >
                            관리
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-[13px] font-semibold text-[#9CA3AF]">
                      조회된 포인트 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length ? (
            <div className="flex flex-col gap-3 border-t border-[#F2F4F7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] font-semibold text-[#6B7280]">
                총 {filteredTransactions.length.toLocaleString()}건 · {currentPage}/{totalPages}페이지
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="h-8 rounded-full border border-[#E5E7EB] px-3 text-[12px] font-bold text-[#4B5563] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이전
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-8 rounded-full px-3 text-[12px] font-bold transition ${
                      currentPage === page ? "bg-[#2563EB] text-white" : "border border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="h-8 rounded-full border border-[#E5E7EB] px-3 text-[12px] font-bold text-[#4B5563] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {selectedMember ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[380px] overflow-hidden rounded-[14px] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between bg-[#1E49D8] px-3 py-2 text-white">
              <h2 className="flex items-center gap-2 text-[16px] font-bold">
                <span>⚡</span>
                포인트 관리
              </h2>
              <button type="button" onClick={closeModal} className="rounded-full p-1 hover:bg-white/10" aria-label="닫기">
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="rounded-[14px] bg-[#f9fafb] px-5 py-3">
                <div className="grid grid-cols-[90px_1fr] gap-y-2 text-[14px]">
                  <span className="font-semibold text-[#6B7280]">회원</span>
                  <span className="text-right font-bold text-[#111827]">{selectedMember.memberName}</span>
                  <span className="font-semibold text-[#6B7280]">이메일</span>
                  <span className="text-right font-medium text-[#111827]">{selectedMember.email}</span>
                  <span className="font-semibold text-[#6B7280]">현재 잔액</span>
                  <span className="text-right text-[14px] font-bold text-[#2563EB]">{formatPoints(selectedMember.balance)}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 rounded-full bg-[#F3F4F6] p-1">
                {[
                  { id: "add", label: "포인트 추가 (+)" },
                  { id: "subtract", label: "포인트 차감 (-)" },
                ].map((tab) => {
                  const active = adjustmentAction === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAdjustmentAction(tab.id as AdjustmentAction)}
                      className={`h-8 rounded-full text-[14px] font-bold transition ${active ? "bg-white text-[#1E49D8] shadow-sm" : "text-[#6B7280]"
                        }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="group mt-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={adjustmentAmount}
                  onChange={(event) => setAdjustmentAmount(event.target.value)}
                  placeholder="포인트 입력 (숫자만)"
                  className="h-8 w-full rounded-full border border-[#E5E7EB] bg-white px-6 text-[14px] font-bold text-[#111827] outline-none transition-all placeholder:font-medium placeholder:text-[#9ca3af] focus:border-[#2563EB] focus:ring-[2px] focus:ring-[#2563EB] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <textarea
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                placeholder="사유 입력 (예: 이벤트 지급, 오입력 정정 등)"
                rows={3}
                className="mt-3 w-full resize-none rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-3 text-[13px] font-bold leading-relaxed text-[#111827] outline-none transition-all placeholder:font-medium placeholder:text-[#9ca3af] focus:border-[#2563EB] focus:ring-[2px] focus:ring-[#2563EB]"
              />

              {error ? <p className="mt-3 text-[12px] font-bold text-[#E11D48]">{error}</p> : null}

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleApply()}
                className="mt-5 flex h-9 w-full items-center justify-center rounded-[18px] bg-[#2563EB] text-[14px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "적용하기"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="mt-4 h-9 w-full rounded-[18px] bg-[#F3F4F6] text-[14px] font-medium text-[#4B5563] transition hover:bg-[#E5E7EB]"
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
