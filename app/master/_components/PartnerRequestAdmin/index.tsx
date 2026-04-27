"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { Download, Search, FileText, CheckCircle2, Eye, X, Filter, Loader2 } from "lucide-react";
import { buildStorageObjectUrl, PARTNER_REQUEST_BUCKET } from "@/lib/storage";
import { MasterLoadingState } from "../MasterLoadingState";

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

interface PartnerRequestAdminProps {
  refreshKey?: number;
  onUnreadCountChange?: (updater: (prev: number) => number) => void;
}

export function PartnerRequestAdmin({ refreshKey = 0, onUnreadCountChange }: PartnerRequestAdminProps) {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<PartnerRequest | null>(null);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("partner_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter === "unread") {
        query = query.eq("status", "pending");
      }

      if (statusFilter === "read") {
        query = query.neq("status", "pending");
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
  }, [fetchRequests, refreshKey]);

  const handleMarkRead = async (requestId: string) => {
    setSavingRequestId(requestId);

    try {
      const response = await authFetch(`/api/partner-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "reviewing" }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "상태 변경에 실패했습니다.");
      }

      setRequests((prev) => prev.map((request) => (request.id === requestId ? { ...request, status: "reviewing" } : request)));
      onUnreadCountChange?.((prev) => Math.max(0, prev - 1));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    } finally {
      setSavingRequestId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "pending") {
      return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">미읽음</span>;
    }

    return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-600">읽음</span>;
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
      r.status === "pending" ? "미읽음" : "읽음"
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

  const buildAttachmentDownloadUrl = (pathOrUrl: string) => {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

    const params = new URLSearchParams({
      bucket: PARTNER_REQUEST_BUCKET,
      path: pathOrUrl,
      fileName: pathOrUrl.split("/").pop() || "partner-request-file",
    });

    return `/api/storage/download?${params.toString()}`;
  };

  return (
    <div className="mt-4 flex-1 flex flex-col bg-[#F8F9FA] overflow-hidden">
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
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 pl-4 pr-10 appearance-none bg-white border border-[#E5E8EB] rounded-xl text-sm font-semibold text-[#4E5968] outline-none cursor-pointer hover:bg-gray-50"
            >
              <option value="all">전체 상태</option>
              <option value="unread">미읽음</option>
              <option value="read">읽음</option>
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B95A1]" />
          </div>
          <button onClick={fetchRequests} className="h-11 px-6 bg-[#0064FF] text-white rounded-xl text-sm font-bold hover:bg-[#0052D4]">검색</button>
        </div>
        <button onClick={downloadCSV} className="flex items-center gap-2 h-11 px-5 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-xl text-sm font-bold hover:bg-gray-50 shadow-sm">
          <Download className="w-4 h-4" />엑셀 (CSV)
        </button>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="bg-white rounded-[14px] border border-[#F2F4F6] shadow-sm overflow-hidden flex flex-col h-full">
          <div className="overflow-auto flex-1">
            <table className="min-w-[1120px] w-full text-sm text-left">
              <thead className="bg-[#F9FAFB] border-b border-[#F2F4F6] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider">회사 정보</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider">담당자</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider">연락처</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider">이메일</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider">문의일시</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider">상태</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider">첨부파일</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-[#8B95A1] uppercase tracking-wider text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F6]">
                {loading && requests.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center"><MasterLoadingState variant="inline" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-[#8B95A1]">문의 내역이 없습니다.</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#191F28] truncate max-w-[180px]">{req.company_name}</div>
                        <div className="text-[11px] text-[#8B95A1] mt-0.5">사업자: {req.business_number}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#4E5968]">{req.manager_name}</td>
                      <td className="px-4 py-3 text-[#4E5968]">{req.manager_phone}</td>
                      <td className="px-4 py-3 text-[#4E5968]">{req.manager_email}</td>
                      <td className="px-4 py-3 text-[13px] text-[#4E5968]">{new Date(req.created_at).toLocaleString("ko-KR")}</td>
                      <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                      <td className="px-4 py-3">
                        {req.attachment_url ? (
                          <a
                            href={buildAttachmentDownloadUrl(req.attachment_url)}
                            download
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#0064FF] hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> 다운
                          </a>
                        ) : <span className="text-[#ADB5BD]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(req)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0E8] bg-white px-2 py-1 text-xs font-bold text-[#4E5968] transition hover:border-[#0064FF] hover:text-[#0064FF]"
                          >
                            <Eye className="h-3 w-3" />
                            상세
                          </button>
                          <button
                            type="button"
                            disabled={savingRequestId === req.id || req.status !== "pending"}
                            onClick={() => void handleMarkRead(req.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0064FF] px-2.5 py-1 text-xs font-bold text-white transition hover:bg-[#0052D4] disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {savingRequestId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            읽음
                          </button>
                        </div>
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
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[820px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
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
                      href={buildAttachmentDownloadUrl(selectedRequest.attachment_url)}
                      download
                      className="inline-flex items-center gap-2 rounded-[12px] bg-[#EFF6FF] px-4 py-2.5 text-[13px] font-bold text-[#2563EB] transition hover:bg-[#DBEAFE]"
                    >
                      <FileText className="h-4 w-4" />
                      첨부파일 다운
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
