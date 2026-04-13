"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { Loader2, Download, Search, FileText, CheckCircle2, Clock, XCircle, Eye, X } from "lucide-react";
import { buildStorageObjectUrl, PARTNER_REQUEST_BUCKET } from "@/lib/storage";

interface PartnerRequest {
  id: string;
  company_name: string;
  business_number: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  company_description: string;
  attachment_url: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  created_at: string;
  source_ip?: string | null;
}

export function PartnerRequestAdmin() {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<PartnerRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("partner_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,manager_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    if (!window.confirm(`상태를 ${newStatus}(으)로 변경하시겠습니까?`)) return;

    const response = await authFetch(`/api/partner-requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) alert("상태 변경 실패: " + (result.error || "unknown_error"));
    else {
      alert("변경되었습니다.");
      fetchRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> 승인됨</span>;
      case 'rejected': return <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full"><XCircle className="w-3 h-3" /> 거절됨</span>;
      case 'reviewing': return <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full"><Clock className="w-3 h-3" /> 검토중</span>;
      default: return <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full"><Clock className="w-3 h-3" /> 대기중</span>;
    }
  };

  const downloadCSV = () => {
    if (requests.length === 0) return;
    const headers = ["회사명", "사업자번호", "담당자", "연락처", "이메일", "문의일시", "상태"];
    const rows = requests.map(r => [
      r.company_name,
      r.business_number,
      r.manager_name,
      r.manager_phone,
      r.manager_email,
      new Date(r.created_at).toLocaleString(),
      r.status
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `partner_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const selectedAttachmentUrl = selectedRequest?.attachment_url
    ? buildStorageObjectUrl(PARTNER_REQUEST_BUCKET, selectedRequest.attachment_url)
    : null;

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9FA] overflow-hidden">
      <div className="p-8 pb-4">
        <h1 className="text-2xl font-bold text-[#191F28]">입점 문의 내역</h1>
        <p className="text-sm text-[#4E5968] mt-1">제조사 파트너로 신청한 회사들의 리스트를 관리합니다.</p>
      </div>

      {/* 필터 영역 */}
      <div className="px-8 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A1]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRequests()}
              placeholder="회사명 또는 담당자 검색..."
              className="w-full h-11 pl-10 pr-4 bg-white border border-[#E5E8EB] rounded-xl text-sm outline-none focus:border-[#0064FF]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-4 bg-white border border-[#E5E8EB] rounded-xl text-sm font-semibold text-[#4E5968] outline-none cursor-pointer"
          >
            <option value="all">전체 상태 </option>
            <option value="pending">대기 중</option>
            <option value="reviewing">검토 중</option>
            <option value="approved">승인 완료</option>
            <option value="rejected">거절됨</option>
          </select>
          <button onClick={fetchRequests} className="h-11 px-6 bg-[#0064FF] text-white rounded-xl text-sm font-bold hover:bg-[#0052D4]">검색</button>
        </div>
        <button onClick={downloadCSV} className="flex items-center gap-2 h-11 px-5 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-xl text-sm font-bold hover:bg-gray-50 shadow-sm">
          <Download className="w-4 h-4" />엑셀(CSV)
        </button>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="bg-white rounded-2xl border border-[#F2F4F6] shadow-sm overflow-hidden flex flex-col h-full">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9FAFB] border-b border-[#F2F4F6] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold text-[#8B95A1] uppercase tracking-wider">회사 정보</th>
                  <th className="px-6 py-4 font-bold text-[#8B95A1] uppercase tracking-wider">담당자 명</th>
                  <th className="px-6 py-4 font-bold text-[#8B95A1] uppercase tracking-wider">연락처</th>
                  <th className="px-6 py-4 font-bold text-[#8B95A1] uppercase tracking-wider">이메일</th>
                  <th className="px-6 py-4 font-bold text-[#8B95A1] uppercase tracking-wider">상태</th>
                  <th className="px-6 py-4 font-bold text-[#8B95A1] uppercase tracking-wider">첨부파일</th>
                  <th className="px-6 py-4 font-bold text-[#8B95A1] uppercase tracking-wider text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F6]">
                {loading && requests.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0064FF]" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-[#8B95A1]">문의 내역이 없습니다.</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#191F28]">{req.company_name}</div>
                        <div className="text-xs text-[#8B95A1] mt-0.5">사업자: {req.business_number}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#4E5968]">{req.manager_name}</td>
                      <td className="px-6 py-4 text-[#4E5968]">{req.manager_phone}</td>
                      <td className="px-6 py-4 text-[#4E5968]">{req.manager_email}</td>
                      <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {req.attachment_url ? (
                            <a href={buildStorageObjectUrl(PARTNER_REQUEST_BUCKET, req.attachment_url)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#0064FF] font-bold hover:underline">
                              <FileText className="w-4 h-4" /> 다운로드
                            </a>
                          ) : <span className="text-[#ADB5BD]">-</span>}
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(req)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E0E8] bg-white px-3 py-1.5 text-xs font-bold text-[#4E5968] transition hover:border-[#0064FF] hover:text-[#0064FF]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            상세보기
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value)}
                          className="text-xs font-bold bg-white border border-[#E5E8EB] rounded-lg px-2 py-1.5 outline-none hover:border-[#0064FF] cursor-pointer"
                        >
                          <option value="pending">대기 중</option>
                          <option value="reviewing">검토 중</option>
                          <option value="approved">승인 완료</option>
                          <option value="rejected">거절됨</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[820px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] px-6 py-5">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Partner Request</p>
                <h3 className="mt-1 text-[22px] font-bold text-[#191F28]">{selectedRequest.company_name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-full p-2 text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#191F28]"
                aria-label="상세 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: "회사명", value: selectedRequest.company_name },
                  { label: "사업자번호", value: selectedRequest.business_number },
                  { label: "담당자명", value: selectedRequest.manager_name },
                  { label: "연락처", value: selectedRequest.manager_phone },
                  { label: "이메일", value: selectedRequest.manager_email },
                  { label: "문의일시", value: new Date(selectedRequest.created_at).toLocaleString("ko-KR") },
                ].map((item) => (
                  <div key={item.label} className="rounded-[16px] border border-[#E7ECF3] bg-[#FCFDFE] p-4">
                    <p className="text-[12px] font-semibold text-[#98A2B3]">{item.label}</p>
                    <p className="mt-2 break-all text-[15px] font-bold text-[#191F28]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[16px] border border-[#E7ECF3] bg-white p-5">
                <p className="text-[12px] font-semibold text-[#98A2B3]">문의 내용</p>
                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-[#344054]">
                  {selectedRequest.company_description?.trim() || "입력된 문의 내용이 없습니다."}
                </p>
              </div>

              <div className="mt-5 rounded-[16px] border border-[#E7ECF3] bg-white p-5">
                <p className="text-[12px] font-semibold text-[#98A2B3]">첨부파일</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {selectedAttachmentUrl ? (
                    <a
                      href={selectedAttachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-[12px] bg-[#EFF6FF] px-4 py-2.5 text-[13px] font-bold text-[#2563EB] transition hover:bg-[#DBEAFE]"
                    >
                      <FileText className="h-4 w-4" />
                      첨부파일 열기
                    </a>
                  ) : (
                    <span className="text-[14px] text-[#98A2B3]">첨부파일 없음</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
