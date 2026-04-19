"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { MemberFilters } from "./MemberFilters";
import { MemberPagination } from "./MemberPagination";
import { MemberTable } from "./MemberTable";

export interface Member {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  business_registration_number?: string | null;
  business_attachment_url?: string | null;
  business_attachment_name?: string | null;
  role: "master" | "manufacturer" | "member";
  created_at: string;
  updated_at: string;
  is_kakao: boolean;
  auth_provider: string;
}

type MemberResponse = {
  members?: Member[];
  totalCount?: number;
  error?: string;
};

type EditableMember = {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  is_kakao: boolean;
};

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function MemberAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editingMember, setEditingMember] = useState<EditableMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        search: searchTerm,
        roleFilter,
        sortBy,
        sortOrder,
      });

      const response = await authFetch(`/api/admin/members?${params.toString()}`);
      const payload = (await response.json()) as MemberResponse;

      if (!response.ok) {
        throw new Error(payload.error || "회원 목록을 불러오는 데 실패했습니다.");
      }

      setMembers(payload.members || []);
      setTotalCount(payload.totalCount || 0);
    } catch (err) {
      console.error("Error fetching members:", err);
      window.alert(err instanceof Error ? err.message : "회원 목록을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, roleFilter, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const currentMember = members.find((member) => member.id === userId);
    if (!currentMember || currentMember.role === newRole) return;

    const roleMap: Record<string, string> = {
      master: "마스터",
      manufacturer: "제조사",
      member: "의뢰자",
    };

    if (!window.confirm(`사용자의 권한을 ${roleMap[newRole] || newRole}(으)로 변경하시겠습니까?`)) return;

    setSavingMemberId(userId);
    const { error } = await supabase.rpc("admin_update_profile_role", {
      p_user_id: userId,
      p_role: newRole,
    });
    setSavingMemberId(null);

    if (error) {
      window.alert("권한 변경 실패: " + error.message);
      return;
    }

    if (newRole !== "manufacturer") {
      const { error: manufacturerLinkError } = await supabase.from("manufacturers").update({ owner_id: null }).eq("owner_id", userId);

      if (manufacturerLinkError) {
        window.alert("권한은 변경되었으나 제조사 소유권 정리에 실패했습니다: " + manufacturerLinkError.message);
        return;
      }
    }

    setMembers((prev) =>
      prev.map((member) =>
        member.id === userId
          ? {
            ...member,
            role: newRole as Member["role"],
            updated_at: new Date().toISOString(),
          }
          : member
      )
    );

    window.alert("권한이 변경되었습니다.");
    void fetchMembers();
  };

  const openEditModal = (member: Member) => {
    setEditingMember({
      id: member.id,
      full_name: member.full_name || "",
      phone_number: member.phone_number || "",
      email: member.email,
      is_kakao: member.is_kakao,
    });
    setEditName(member.full_name || "");
    setEditPhone(member.phone_number || "");
  };

  const closeEditModal = () => {
    setEditingMember(null);
    setEditName("");
    setEditPhone("");
  };

  const handleMemberUpdate = async () => {
    if (!editingMember) return;
    if (editingMember.is_kakao) {
      window.alert("카카오 계정은 여기서 수정할 수 없습니다.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(editPhone);
    if (!editName.trim()) {
      window.alert("이름을 입력해주세요.");
      return;
    }

    if (!normalizedPhone) {
      window.alert("전화번호를 입력해주세요.");
      return;
    }

    setSavingMemberId(editingMember.id);
    try {
      const response = await authFetch("/api/admin/members", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: editingMember.id,
          fullName: editName,
          phoneNumber: normalizedPhone,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "회원 정보 수정에 실패했습니다.");
      }

      setMembers((prev) =>
        prev.map((member) =>
          member.id === editingMember.id
            ? {
              ...member,
              full_name: editName.trim(),
              phone_number: normalizedPhone,
              updated_at: new Date().toISOString(),
            }
            : member
        )
      );

      closeEditModal();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "회원 정보 수정에 실패했습니다.");
    } finally {
      setSavingMemberId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
      <div className="px-8 py-6">
        <h1 className="text-[20px] font-bold text-[#191F28]">전체 회원 관리</h1>
      </div>

      <MemberFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        onSearch={fetchMembers}
        members={members}
      />

      <div className="flex flex-1 flex-col overflow-hidden px-4 md:px-8">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#F2F4F6] bg-white shadow-sm mb-4 md:mb-0">
          <MemberTable
            members={members}
            loading={loading}
            savingMemberId={savingMemberId}
            onRoleChange={handleRoleChange}
            onEditMember={openEditModal}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />

          <MemberPagination currentPage={currentPage} totalCount={totalCount} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </div>

      {editingMember ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[460px] rounded-[16px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] px-6 py-5">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">회원 정보 수정</p>
                <h3 className="mt-1 text-[22px] font-bold text-[#191F28]">회원 정보 수정</h3>
              </div>
              <button type="button" onClick={closeEditModal} className="rounded-full p-2 text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#191F28]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-2xl border border-[#E7ECF3] bg-[#FCFDFE] p-4 text-sm text-[#4E5968]">
                <p>
                  현재 이메일: <span className="font-semibold text-[#191F28]">{editingMember.email}</span>
                </p>
                {editingMember.is_kakao ? <p className="mt-2 font-semibold text-[#D97706]">카카오 계정입니다. 정보 수정이 불가능합니다.</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">이름</label>
                <input
                  type="text"
                  value={editName}
                  disabled={editingMember.is_kakao}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0064FF] disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">전화번호</label>
                <input
                  type="tel"
                  value={editPhone}
                  disabled={editingMember.is_kakao}
                  onChange={(event) => setEditPhone(normalizePhoneNumber(event.target.value))}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0064FF] disabled:bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeEditModal} className="h-11 rounded-xl border border-[#D0D5DD] px-5 text-sm font-bold text-[#4E5968]">
                  취소
                </button>
                <button
                  type="button"
                  disabled={savingMemberId === editingMember.id || editingMember.is_kakao}
                  onClick={() => void handleMemberUpdate()}
                  className="h-11 rounded-xl bg-[#0064FF] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
