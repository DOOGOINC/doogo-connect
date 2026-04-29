"use client";

import { ArrowUpDown, Loader2, Pencil } from "lucide-react";
import { PARTNER_REQUEST_BUCKET, buildStorageObjectUrl } from "@/lib/storage";
import { Member } from "./index";
import { MasterLoadingState } from "../MasterLoadingState";

interface Props {
  members: Member[];
  loading: boolean;
  savingMemberId: string | null;
  onRoleChange: (id: string, role: string) => void;
  onEditMember: (member: Member) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (val: "asc" | "desc") => void;
}

function KakaoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE500] px-2.5 py-0.5 text-[11px] font-bold text-[#3B1E1E]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3C6.477 3 2 6.48 2 10.79c0 2.72 1.8 5.12 4.54 6.51-.18.66-.65 2.37-.74 2.74-.11.45.16.44.34.33.14-.09 2.27-1.54 3.19-2.17.89.12 1.8.19 2.73.19 5.52 0 10-3.48 10-7.79S17.52 3 12 3z" />
      </svg>
      카카오
    </span>
  );
}

function EmailBadge() {
  return <span className="inline-flex items-center rounded-full bg-[#EEF5FF] px-2.5 py-0.5 text-[11px] font-bold text-[#0064FF]">이메일</span>;
}

function getRoleLabel(role: Member["role"]) {
  if (role === "master") return "마스터";
  if (role === "manufacturer") return "제조사";
  if (role === "partner") return "파트너";
  return "의뢰자";
}

function getRoleBadgeClass(role: Member["role"]) {
  if (role === "master") return "bg-purple-100 text-purple-600";
  if (role === "manufacturer") return "bg-blue-100 text-[#0064FF]";
  if (role === "partner") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-600";
}

function SortIcon({
  field,
  sortBy,
}: {
  field: string;
  sortBy: string;
}) {
  if (sortBy !== field) {
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
  }
  return <ArrowUpDown className="ml-1 h-3 w-3 text-[#0064FF]" />;
}

export function MemberTable({
  members,
  loading,
  savingMemberId,
  onRoleChange,
  onEditMember,
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

  const handleDownload = async (url: string, fileName?: string | null) => {
    try {
      const objectUrl = new URL(url, window.location.origin);
      const bucket = objectUrl.searchParams.get("bucket");
      const path = objectUrl.searchParams.get("path");

      if (!bucket || !path) {
        throw new Error("download_failed");
      }

      const downloadUrl = `/api/storage/download?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&fileName=${encodeURIComponent(
        fileName || "business-registration"
      )}`;
      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) {
        throw new Error("download_failed");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "business-registration";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.alert("사업자등록증 다운로드에 실패했습니다.");
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-20">
        <MasterLoadingState variant="inline" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1600px] table-fixed border-collapse text-[12px]">
        <thead className="sticky top-0 z-10 bg-[#F9FAFB] shadow-sm">
          <tr className="text-left text-[12px] font-bold uppercase text-[#6a7282]">
            <th className="w-[130px] cursor-pointer px-3 py-3 transition-colors hover:bg-gray-50" onClick={() => toggleSort("full_name")}>
              <div className="flex items-center gap-1">이름 <SortIcon field="full_name" sortBy={sortBy} /></div>
            </th>
            <th className="w-[200px] cursor-pointer px-3 py-3 transition-colors hover:bg-gray-50" onClick={() => toggleSort("email")}>
              <div className="flex items-center gap-1">이메일 <SortIcon field="email" sortBy={sortBy} /></div>
            </th>
            <th className="px-3 py-3">전화번호</th>
            <th className="px-3 py-3">사업자등록번호</th>
            <th className="px-3 py-3">사업자등록증</th>
            <th className="px-3 py-3">가입방식</th>
            <th className="w-[120px] cursor-pointer px-3 py-3 transition-colors hover:bg-gray-50" onClick={() => toggleSort("role")}>
              <div className="flex items-center gap-1">권한 <SortIcon field="role" sortBy={sortBy} /></div>
            </th>
            <th className="w-[120px] cursor-pointer px-3 py-3 transition-colors hover:bg-gray-50" onClick={() => toggleSort("created_at")}>
              <div className="flex items-center gap-1">가입일 <SortIcon field="created_at" sortBy={sortBy} /></div>
            </th>
            <th className="w-[160px] cursor-pointer px-3 py-3 transition-colors hover:bg-gray-50" onClick={() => toggleSort("updated_at")}>
              <div className="flex items-center gap-1">수정일 <SortIcon field="updated_at" sortBy={sortBy} /></div>
            </th>
            <th className="px-3 py-3 text-right">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2F4F6]">
          {members.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-3 py-16 text-center text-[#8B95A1]">
                검색된 회원이 없습니다.
              </td>
            </tr>
          ) : (
            members.map((member) => {
              const isSaving = savingMemberId === member.id;
              const isKakaoAccount = member.is_kakao;
              const canChangeRole = member.role === "member";
              const attachmentUrl = buildStorageObjectUrl(PARTNER_REQUEST_BUCKET, member.business_attachment_url);

              return (
                <tr key={member.id} className="align-middle transition-colors hover:bg-[#FCFDFF]">
                  <td className="px-3 py-2">
                    <span className="block truncate font-bold text-[#191F28]">{member.full_name || "이름 없음"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block truncate text-[#4E5968]">{member.email}</span>
                  </td>
                  <td className="px-3 py-2 text-[#4E5968]">{member.phone_number || "-"}</td>
                  <td className="px-3 py-2 text-[#4E5968]">{member.business_registration_number || "-"}</td>
                  <td className="px-3 py-2">
                    {member.business_attachment_url ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-[#cfe0ff] bg-[#eef5ff] px-2.5 py-0.5 text-[11px] font-bold text-[#0064FF] transition hover:bg-[#e1eeff]"
                        >
                          보기
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleDownload(attachmentUrl, member.business_attachment_name)}
                          className="inline-flex items-center rounded-full border border-[#d8e0e8] bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#4E5968] transition hover:border-[#b9c7d6] hover:bg-[#f8fafc]"
                        >
                          다운
                        </button>
                      </div>
                    ) : (
                      <span className="text-[#8B95A1]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{member.is_kakao ? <KakaoBadge /> : <EmailBadge />}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getRoleBadgeClass(member.role)}`}
                    >
                      {getRoleLabel(member.role)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[12px] font-medium text-[#8B95A1]">{member.created_at ? new Date(member.created_at).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-2 text-[12px] font-medium text-[#8B95A1]">
                    {new Date(member.updated_at).toLocaleDateString()}{" "}
                    {new Date(member.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditMember(member)}
                        disabled={isKakaoAccount}
                        title={isKakaoAccount ? "카카오 계정은 여기에서 수정할 수 없습니다." : "회원 수정"}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0E8] bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#4E5968] transition hover:border-[#0064FF] hover:text-[#0064FF] disabled:cursor-not-allowed disabled:border-[#F2C94C] disabled:bg-[#FFF8D9] disabled:text-[#8A6D1F]"
                      >
                        <Pencil className="h-3 w-3" />
                        {isKakaoAccount ? "카카오" : "수정"}
                      </button>
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0064FF]" /> : null}
                      <select
                        value={member.role}
                        disabled={isSaving || !canChangeRole}
                        onChange={(event) => onRoleChange(member.id, event.target.value)}
                        className="h-7 cursor-pointer rounded-lg border border-[#E5E8EB] bg-white px-2 py-0.5 text-[11px] font-bold outline-none hover:border-[#0064FF] disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="member">의뢰자</option>
                        <option value="manufacturer">제조사</option>
                        <option value="partner">파트너</option>
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
