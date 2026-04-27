"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, Loader2, Search, X, ArrowUpDown, Filter } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { MasterLoadingState } from "./MasterLoadingState";

type SupportInquiry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  content: string;
  status: "pending" | "resolved";
  created_at: string;
};

function csvEscape(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

export function SupportInquiryAdmin({ refreshKey = 0 }: { refreshKey?: number }) {
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedInquiry, setSelectedInquiry] = useState<SupportInquiry | null>(null);
  const [savingInquiryId, setSavingInquiryId] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      const response = await authFetch(`/api/admin/support-inquiries?${params.toString()}`);
      const payload = (await response.json()) as { error?: string; inquiries?: SupportInquiry[] };

      if (!response.ok) {
        throw new Error(payload.error || "문의 내역을 불러오는 데 실패했습니다.");
      }

      setInquiries(payload.inquiries || []);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "문의 내역을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    void fetchInquiries();
  }, [fetchInquiries, refreshKey]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleStatusChange = async (id: string, status: SupportInquiry["status"]) => {
    setSavingInquiryId(id);
    try {
      const response = await authFetch("/api/admin/support-inquiries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "문의 상태 변경에 실패했습니다.");
      }

      setInquiries((prev) => prev.map((inquiry) => (inquiry.id === id ? { ...inquiry, status } : inquiry)));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "문의 상태 변경에 실패했습니다.");
    } finally {
      setSavingInquiryId(null);
    }
  };

  const downloadCsv = useCallback(() => {
    if (inquiries.length === 0) return;

    const headers = ["이름", "이메일", "회사", "내용", "상태", "접수 일시"];
    const rows = inquiries.map((inquiry) => [
      csvEscape(inquiry.name),
      csvEscape(inquiry.email),
      csvEscape(inquiry.company),
      csvEscape(inquiry.content),
      csvEscape(inquiry.status === "resolved" ? "읽음" : "미읽음"),
      csvEscape(new Date(inquiry.created_at).toLocaleString("ko-KR")),
    ]);

    const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `일반문의_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [inquiries]);

  const statusBadge = useMemo(
    () => ({
      pending: "bg-amber-50 text-amber-600",
      resolved: "bg-green-50 text-green-600",
    }),
    []
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#F8F9FA]">

      <div className="mt-4 mb-6 flex items-center justify-between gap-4 px-8">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B95A1]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void fetchInquiries()}
              placeholder="이름, 이메일 또는 회사명으로 검색"
              className="h-11 w-full rounded-xl border border-[#E5E8EB] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#0064FF]"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 pl-4 pr-10 appearance-none rounded-xl border border-[#E5E8EB] bg-white text-sm font-semibold text-[#4E5968] outline-none hover:bg-gray-50 cursor-pointer"
            >
              <option value="all">전체 상태</option>
              <option value="pending">미읽음</option>
              <option value="resolved">읽음</option>
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B95A1]" />
          </div>
          <button type="button" onClick={() => void fetchInquiries()} className="h-11 rounded-xl bg-[#0064FF] px-6 text-sm font-bold text-white hover:bg-[#0052D4]">
            검색
          </button>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="flex h-11 items-center gap-2 rounded-xl border border-[#E5E8EB] bg-white px-5 text-sm font-bold text-[#4E5968] shadow-sm hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          엑셀 (CSV)
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden px-8 pb-8">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[14px] border border-[#F2F4F6] bg-white shadow-sm">
          <div className="flex-1 overflow-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-[#F2F4F6] bg-[#F9FAFB]">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#8B95A1] hover:bg-gray-100"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      이름
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === "name" ? "text-[#0064FF]" : "text-gray-300"}`} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#8B95A1] hover:bg-gray-100"
                    onClick={() => toggleSort("email")}
                  >
                    <div className="flex items-center gap-1">
                      이메일
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === "email" ? "text-[#0064FF]" : "text-gray-300"}`} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#8B95A1] hover:bg-gray-100"
                    onClick={() => toggleSort("company")}
                  >
                    <div className="flex items-center gap-1">
                      회사
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === "company" ? "text-[#0064FF]" : "text-gray-300"}`} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#8B95A1] hover:bg-gray-100"
                    onClick={() => toggleSort("created_at")}
                  >
                    <div className="flex items-center gap-1">
                      접수일
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === "created_at" ? "text-[#0064FF]" : "text-gray-300"}`} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#8B95A1] hover:bg-gray-100"
                    onClick={() => toggleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      상태
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === "status" ? "text-[#0064FF]" : "text-gray-300"}`} />
                    </div>
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-[#8B95A1]">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F6]">
                {loading && inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <MasterLoadingState variant="inline" />
                    </td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-[#8B95A1]">
                      접수된 일반 문의가 없습니다.
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-[#191F28]">{inquiry.name}</td>
                      <td className="px-4 py-3 text-[#4E5968]">{inquiry.email}</td>
                      <td className="px-4 py-3 text-[#4E5968]">{inquiry.company || "-"}</td>
                      <td className="px-4 py-3 text-[#4E5968] text-[13px]">{new Date(inquiry.created_at).toLocaleString("ko-KR")}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge[inquiry.status]}`}>
                          {inquiry.status === "resolved" ? "읽음" : "미읽음"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInquiry(inquiry)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0E8] bg-white px-2.5 py-1 text-xs font-bold text-[#4E5968] transition hover:border-[#0064FF] hover:text-[#0064FF]"
                          >
                            <Eye className="h-3 w-3" />
                            보기
                          </button>
                          <button
                            type="button"
                            disabled={savingInquiryId === inquiry.id || inquiry.status === "resolved"}
                            onClick={() => void handleStatusChange(inquiry.id, "resolved")}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0064FF] px-2.5 py-1 text-xs font-bold text-white transition hover:bg-[#0052D4] disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {savingInquiryId === inquiry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
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

      {selectedInquiry ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] px-6 py-5">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">일반 문의 상세</p>
                <h3 className="mt-1 text-[22px] font-bold text-[#191F28]">{selectedInquiry.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="rounded-full p-2 text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#191F28]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: "이름", value: selectedInquiry.name },
                  { label: "이메일", value: selectedInquiry.email },
                  { label: "회사", value: selectedInquiry.company || "-" },
                  { label: "접수 일시", value: new Date(selectedInquiry.created_at).toLocaleString("ko-KR") },
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
                  {selectedInquiry.content.trim() || "제출된 내용이 없습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
