"use client";

import { Search, Download, Filter } from "lucide-react";
import { Member } from "./index";

interface Props {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  onSearch: () => void;
  members: Member[];
}

export function MemberFilters({ searchTerm, setSearchTerm, roleFilter, setRoleFilter, onSearch, members }: Props) {
  
  const downloadCSV = () => {
    if (members.length === 0) return;
    
    // CSV 헤더
    const headers = ["이름", "이메일", "연락처", "권한", "가입일", "최근업데이트"];
    
    // 데이터 추출
    const rows = members.map(m => [
      m.full_name || "이름없음",
      m.email,
      m.phone_number || "-",
      m.role,
      m.created_at ? new Date(m.created_at).toLocaleDateString() : "-",
      new Date(m.updated_at).toLocaleDateString()
    ]);
    
    // CSV 문자열 생성 (BOM 추가로 한글 깨짐 방지)
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    // 다운로드 실행
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `member_list_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-8 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-[300px]">
        {/* 검색창 */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A1]" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="이름 또는 이메일로 검색..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-[#E5E8EB] rounded-xl text-sm outline-none focus:border-[#0064FF] transition-all"
          />
        </div>

        {/* 역할 필터 */}
        <div className="relative">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none h-11 pl-4 pr-10 bg-white border border-[#E5E8EB] rounded-xl text-sm font-semibold text-[#4E5968] outline-none hover:bg-gray-50 cursor-pointer"
          >
            <option value="all">전체 권한</option>
            <option value="member">일반 회원</option>
            <option value="manufacturer">제조사</option>
            <option value="master">마스터</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A1] pointer-events-none" />
        </div>
        
        <button 
          onClick={onSearch}
          className="h-11 px-6 bg-[#0064FF] text-white rounded-xl text-sm font-bold hover:bg-[#0052D4] transition-all"
        >
          검색
        </button>
      </div>

      <button 
        onClick={downloadCSV}
        className="flex items-center gap-2 h-11 px-5 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
      >
        <Download className="w-4 h-4" />
        엑셀(CSV)
      </button>
    </div>
  );
}
