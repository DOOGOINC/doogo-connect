"use client";

import { ArrowUpDown, Loader2 } from "lucide-react";
import { Member } from "./index";

interface Props {
  members: Member[];
  loading: boolean;
  savingMemberId: string | null;
  onRoleChange: (id: string, role: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (val: "asc" | "desc") => void;
}

function SortHeader({
  field,
  label,
  sortBy,
  onToggleSort,
}: {
  field: string;
  label: string;
  sortBy: string;
  onToggleSort: (field: string) => void;
}) {
  return (
    <th
      className="cursor-pointer px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#8B95A1] hover:bg-gray-50"
      onClick={() => onToggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortBy === field ? "text-[#0064FF]" : "text-gray-300"}`} />
      </div>
    </th>
  );
}

export function MemberTable({
  members,
  loading,
  savingMemberId,
  onRoleChange,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}: Props) {
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 border-b border-[#F2F4F6] bg-[#F9FAFB]">
          <tr>
            <SortHeader field="full_name" label="이름" sortBy={sortBy} onToggleSort={toggleSort} />
            <SortHeader field="email" label="이메일" sortBy={sortBy} onToggleSort={toggleSort} />
            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#8B95A1]">연락처</th>
            <SortHeader field="role" label="권한" sortBy={sortBy} onToggleSort={toggleSort} />
            <SortHeader field="created_at" label="가입일" sortBy={sortBy} onToggleSort={toggleSort} />
            <SortHeader field="updated_at" label="최근 수정" sortBy={sortBy} onToggleSort={toggleSort} />
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[#8B95A1]">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2F4F6]">
          {members.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-20 text-center text-[#8B95A1]">
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : (
            members.map((member) => {
              const isSaving = savingMemberId === member.id;

              return (
                <tr key={member.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-[#191F28]">{member.full_name || "이름 없음"}</td>
                  <td className="px-6 py-4 text-[#4E5968]">{member.email}</td>
                  <td className="px-6 py-4 text-[#4E5968]">{member.phone_number || "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        member.role === "master"
                          ? "bg-purple-100 text-purple-600"
                          : member.role === "manufacturer"
                            ? "bg-blue-100 text-[#0064FF]"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {member.role === "master" ? "마스터" : member.role === "manufacturer" ? "제조사" : "일반 회원"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#8B95A1]">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 text-[#8B95A1]">
                    {new Date(member.updated_at).toLocaleDateString()}{" "}
                    {new Date(member.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-[#0064FF]" /> : null}
                      <select
                        value={member.role}
                        disabled={isSaving}
                        onChange={(e) => onRoleChange(member.id, e.target.value)}
                        className="cursor-pointer rounded-lg border border-[#E5E8EB] bg-white px-2 py-1.5 text-xs font-bold outline-none hover:border-[#0064FF] disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="member">회원</option>
                        <option value="manufacturer">제조사</option>
                        <option value="master">마스터</option>
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
