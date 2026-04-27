"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/client/auth-fetch";
import { MasterLoadingState } from "./MasterLoadingState";

type NoticeRow = {
  id: string;
  title: string;
  content: string;
  author_name: string | null;
  view_count: number | null;
  created_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MasterNoticeAdmin({ refreshKey = 0 }: { refreshKey?: number }) {
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<NoticeRow | null>(null);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/admin/notices");
      const payload = (await response.json()) as { error?: string; notices?: NoticeRow[] };

      if (!response.ok) {
        throw new Error(payload.error || "공지사항을 불러오는 데 실패했습니다.");
      }

      setNotices(payload.notices || []);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "공지사항을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotices();
  }, [fetchNotices, refreshKey]);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      window.alert("제목을 입력해 주세요.");
      return;
    }

    if (!trimmedContent) {
      window.alert("내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await authFetch("/api/admin/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmedTitle, content: trimmedContent }),
      });
      const payload = (await response.json()) as { error?: string; notice?: NoticeRow };

      if (!response.ok) {
        throw new Error(payload.error || "공지사항 등록에 실패했습니다.");
      }

      if (payload.notice) {
        setNotices((prev) => [payload.notice as NoticeRow, ...prev]);
      } else {
        await fetchNotices();
      }

      setTitle("");
      setContent("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "공지사항 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (notice: NoticeRow) => {
    if (!window.confirm(`"${notice.title}" 공지사항을 삭제하시겠습니까?`)) return;

    setDeletingNoticeId(notice.id);

    try {
      const params = new URLSearchParams({ id: notice.id });
      const response = await authFetch(`/api/admin/notices?${params.toString()}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "공지사항 삭제에 실패했습니다.");
      }

      setNotices((prev) => prev.filter((item) => item.id !== notice.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "공지사항 삭제에 실패했습니다.");
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const noticeRows = useMemo(() => notices, [notices]);

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#f5f6f8] px-6 pb-8">
      <section className="rounded-[14px] border border-[#e7e9ee] bg-white px-6 py-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-[#111827]">
          <span className="text-[16px]">📝</span>
          공지사항 작성
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="제목 입력"
            className="h-11 w-full rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-[15px] font-medium text-[#111827] outline-none placeholder:text-[#8b95a1] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="내용 입력"
            className="h-[92px] w-full resize-none rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] font-medium text-[#111827] outline-none placeholder:text-[#8b95a1] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
          />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleSubmit()}
          className="mt-4 h-11 rounded-[16px] bg-[#155dfc] px-7 text-[15px] font-bold text-white shadow-sm transition hover:bg-[#0f4fd8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </section>

      <section className="mt-5 rounded-[14px] border border-[#e7e9ee] bg-white px-5 py-5 shadow-sm">
        <h2 className="text-[16px] font-bold text-[#111827]">공지사항 목록</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[860px] w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-[#eef0f3] text-[13px] font-bold text-[#5f6775]">
                <th className="w-[40%] px-3 py-3">제목</th>
                <th className="w-[14%] px-3 py-3">작성자</th>
                <th className="w-[18%] px-3 py-3">날짜</th>
                <th className="w-[12%] px-3 py-3">조회</th>
                <th className="w-[16%] px-3 py-3">삭제</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-16 text-center">
                    <MasterLoadingState variant="inline" />
                  </td>
                </tr>
              ) : noticeRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-16 text-center text-[14px] font-semibold text-[#98a2b3]">
                    등록된 공지사항이 없습니다.
                  </td>
                </tr>
              ) : (
                noticeRows.map((notice) => (
                  <tr key={notice.id} className="border-b border-[#f1f3f5] last:border-b-0">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedNotice(notice)}
                        className="block max-w-full truncate text-left text-[15px] font-semibold text-[#2563eb] transition hover:text-[#1d4ed8] hover:underline"
                        title={notice.title}
                      >
                        {notice.title}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-[15px] font-medium text-[#374151]">{notice.author_name || "관리자"}</td>
                    <td className="px-3 py-3 text-[15px] font-medium text-[#4b5563]">{formatDate(notice.created_at)}</td>
                    <td className="px-3 py-3 text-[15px] font-medium text-[#4b5563]">{Number(notice.view_count || 0).toLocaleString("ko-KR")}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={deletingNoticeId === notice.id}
                        onClick={() => void handleDelete(notice)}
                        className="text-[14px] font-semibold text-[#ef4444] transition hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingNoticeId === notice.id ? "삭제 중..." : "삭제"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedNotice ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[16px] bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-[#eef0f3] px-6 py-5">
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase text-[#8b95a1]">공지사항 상세</p>
                <h3 className="mt-2 break-words text-[22px] font-bold leading-8 text-[#111827]">{selectedNotice.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[20px] font-medium leading-none text-[#6b7280] transition hover:bg-[#f2f4f7] hover:text-[#111827]"
                aria-label="공지사항 상세 닫기"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[12px] bg-[#f7f8fa] px-4 py-3">
                  <p className="text-[12px] font-bold text-[#8b95a1]">작성자</p>
                  <p className="mt-1 text-[14px] font-bold text-[#111827]">{selectedNotice.author_name || "관리자"}</p>
                </div>
                <div className="rounded-[12px] bg-[#f7f8fa] px-4 py-3">
                  <p className="text-[12px] font-bold text-[#8b95a1]">날짜</p>
                  <p className="mt-1 text-[14px] font-bold text-[#111827]">{formatDate(selectedNotice.created_at)}</p>
                </div>
                <div className="rounded-[12px] bg-[#f7f8fa] px-4 py-3">
                  <p className="text-[12px] font-bold text-[#8b95a1]">조회</p>
                  <p className="mt-1 text-[14px] font-bold text-[#111827]">{Number(selectedNotice.view_count || 0).toLocaleString("ko-KR")}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[14px] border border-[#e7e9ee] bg-white px-5 py-5">
                <p className="text-[12px] font-bold text-[#8b95a1]">내용</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] font-medium leading-7 text-[#374151]">
                  {selectedNotice.content.trim() || "내용이 없습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
