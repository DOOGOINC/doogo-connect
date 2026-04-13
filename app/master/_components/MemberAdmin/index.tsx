"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MemberFilters } from "./MemberFilters";
import { MemberPagination } from "./MemberPagination";
import { MemberTable } from "./MemberTable";

export interface Member {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: "master" | "manufacturer" | "member";
  created_at: string;
  updated_at: string;
}

export function MemberAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("profiles").select("*", { count: "exact" });

      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;
      setMembers((data || []) as Member[]);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, roleFilter, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const currentMember = members.find((member) => member.id === userId);
    if (!currentMember || currentMember.role === newRole) return;

    if (!window.confirm(`사용자의 권한을 ${newRole}(으)로 변경하시겠습니까?`)) return;

    setSavingMemberId(userId);
    const { error } = await supabase.rpc("admin_update_profile_role", {
      p_user_id: userId,
      p_role: newRole,
    });
    setSavingMemberId(null);

    if (error) {
      alert("권한 변경 실패: " + error.message);
      return;
    }

    if (newRole !== "manufacturer") {
      const { error: manufacturerLinkError } = await supabase
        .from("manufacturers")
        .update({ owner_id: null })
        .eq("owner_id", userId);

      if (manufacturerLinkError) {
        alert("권한은 변경됐지만 제조사 계정 연결 해제에 실패했습니다: " + manufacturerLinkError.message);
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

    alert("변경되었습니다.");
    void fetchMembers();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
      <div className="p-8 pb-4">
        <h1 className="text-2xl font-bold text-[#191F28]">전체 회원 관리</h1>
        <p className="mt-1 text-sm text-[#4E5968]">서비스의 모든 회원을 조회하고 권한을 설정합니다.</p>
      </div>

      <MemberFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        onSearch={fetchMembers}
        members={members}
      />

      <div className="flex flex-1 flex-col overflow-hidden px-8">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#F2F4F6] bg-white shadow-sm">
          <MemberTable
            members={members}
            loading={loading}
            savingMemberId={savingMemberId}
            onRoleChange={handleRoleChange}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />

          <MemberPagination
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
