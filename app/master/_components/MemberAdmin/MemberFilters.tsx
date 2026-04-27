"use client";

import { Download, Filter, Search } from "lucide-react";
import { Member } from "./index";

interface Props {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  onSearch: () => void;
  members: Member[];
}

function csvEscape(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

export function MemberFilters({ searchTerm, setSearchTerm, roleFilter, setRoleFilter, onSearch, members }: Props) {
  const getRoleLabel = (role: Member["role"]) => {
    if (role === "master") return "마스터";
    if (role === "manufacturer") return "제조사";
    if (role === "partner") return "파트너";
    return "의뢰자";
  };

  const downloadCSV = () => {
    if (members.length === 0) return;

    const headers = ["이름", "이메일", "전화번호", "권한", "가입방식", "가입일", "수정일"];
    const rows = members.map((member) => [
      csvEscape(member.full_name || "이름 없음"),
      csvEscape(member.email),
      csvEscape(member.phone_number || "-"),
      csvEscape(getRoleLabel(member.role)),
      csvEscape(member.is_kakao ? "카카오" : "이메일"),
      csvEscape(member.created_at ? new Date(member.created_at).toLocaleDateString() : "-"),
      csvEscape(new Date(member.updated_at).toLocaleDateString()),
    ]);

    const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `회원목록_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-4 md:mb-6 flex flex-wrap items-center justify-between gap-3 px-4 md:px-8">
      <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:flex-1">
        <div className="relative min-w-[200px] flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B95A1]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onSearch()}
            placeholder="이름 또는 이메일 검색"
            className="h-11 w-full rounded-xl border border-[#E5E8EB] bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-[#0064FF]"
          />
        </div>

        <div className="relative w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-[#E5E8EB] bg-white pl-4 pr-10 text-sm font-semibold text-[#4E5968] outline-none hover:bg-gray-50 sm:w-auto"
          >
            <option value="all">전체</option>
            <option value="member">의뢰자</option>
            <option value="manufacturer">제조사</option>
            <option value="partner">파트너</option>
            <option value="master">마스터</option>
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B95A1]" />
        </div>

        <button type="button" onClick={onSearch} className="h-11 w-full rounded-xl bg-[#0064FF] px-6 text-sm font-bold text-white transition-all hover:bg-[#0052D4] sm:w-auto">
          검색
        </button>
      </div>

      <button
        type="button"
        onClick={downloadCSV}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E8EB] bg-white px-5 text-sm font-bold text-[#4E5968] shadow-sm transition-all hover:bg-gray-50 sm:w-auto"
      >
        <Download className="h-4 w-4" />
        엑셀 (CSV)
      </button>
    </div>
  );
}
