"use client";

import { useEffect, useMemo, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import { Download, FileText, Paperclip, Send, X } from "lucide-react";
import type { ChatMessageView, ChatRoomView } from "./types";

interface ChatMessagePanelProps {
  selectedRoom: ChatRoomView | null;
  messages: ChatMessageView[];
  messageInput: string;
  isSending: boolean;
  isUploading: boolean;
  messageListRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onFileClick: () => void;
  title?: string;
  headerAction?: ReactNode;
  statusNotice?: ReactNode;
  inputDisabled?: boolean;
  inputPlaceholder?: string;
  composerHint?: string;
  hideFileButton?: boolean;
}

const INITIAL_VISIBLE_MESSAGE_COUNT = 21;
const MESSAGE_PAGE_SIZE = 21;
const FILE_EXPIRY_DAYS = 7;
const FILE_EXPIRY_MS = FILE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function formatSharedFileDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRemainingDaysLabel(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "";

  const expiresAt = created + FILE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "만료됨";

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return `${days}일 후 만료`;
}

function isExpiredFile(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() > created + FILE_EXPIRY_MS;
}

function buildDownloadUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) return "#";

  try {
    const base = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
    const url = new URL(fileUrl, base);
    url.searchParams.set("download", "1");
    return url.pathname + url.search;
  } catch {
    return fileUrl;
  }
}

export function ChatMessagePanel({
  selectedRoom,
  messages,
  messageInput,
  isSending,
  isUploading,
  messageListRef,
  messagesEndRef,
  onInputChange,
  onSend,
  onFileClick,
  title,
  headerAction,
  statusNotice,
  inputDisabled = false,
  inputPlaceholder = "메시지를 입력해 주세요.",
  composerHint = "Shift + Enter로 줄바꿈",
  hideFileButton = false,
}: ChatMessagePanelProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MESSAGE_COUNT);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_MESSAGE_COUNT);
    setIsFileModalOpen(false);
  }, [selectedRoom?.id]);

  const hiddenMessageCount = Math.max(messages.length - visibleCount, 0);
  const visibleMessages = useMemo(
    () => (hiddenMessageCount > 0 ? messages.slice(-visibleCount) : messages),
    [hiddenMessageCount, messages, visibleCount]
  );

  const sharedFiles = useMemo(
    () =>
      messages
        .filter((message) => message.message_type === "file" && message.file_url && !isExpiredFile(message.created_at))
        .slice()
        .reverse(),
    [messages]
  );

  const renderAvatar = (avatar: string, name: string, compact = false) => {
    if (avatar.startsWith("initial:")) {
      return (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full bg-[#EAF2FF] font-bold text-[#2563EB] ${
            compact ? "text-[13px]" : "text-[14px]"
          }`}
        >
          {avatar.replace("initial:", "")}
        </div>
      );
    }

    return <Image src={avatar} alt={name} fill className="object-cover" />;
  };

  if (!selectedRoom) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8F9FA] text-gray-400">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <Send className="h-8 w-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">채팅방을 선택하면 대화를 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-100 bg-gray-50">
              {renderAvatar(selectedRoom.avatar, selectedRoom.counterpartName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="truncate font-bold text-gray-900">{title || selectedRoom.counterpartName}</h4>
                {selectedRoom.isOnline ? <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> : null}
              </div>
              <p className="text-[11px] font-medium text-gray-400">{selectedRoom.lastSeenLabel}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {headerAction}
            {!hideFileButton ? (
              <button
                type="button"
                onClick={() => setIsFileModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                파일
              </button>
            ) : null}
          </div>
        </div>

        <div ref={messageListRef} className="min-h-0 flex-1 overflow-y-auto bg-[#F2F4F7]/40 p-4 md:p-6">
          <div className="mx-auto flex max-w-[800px] flex-col space-y-6">
            {statusNotice ? <div>{statusNotice}</div> : null}
            {hiddenMessageCount > 0 ? (
              <div className="sticky top-0 z-10 flex justify-center pb-2 pt-1">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + MESSAGE_PAGE_SIZE)}
                  className="rounded-full border border-[#D6E4FF] bg-white px-4 py-2 text-[12px] font-bold text-[#2563EB] shadow-sm transition hover:bg-[#F8FBFF]"
                >
                  채팅내역 더보기 ({hiddenMessageCount}개 이전 메시지)
                </button>
              </div>
            ) : null}
            {visibleMessages.map((msg, idx) => {
              const prev = visibleMessages[idx - 1];
              const showAvatar = !msg.isMine && (!prev || prev.sender_id !== msg.sender_id);

              return (
                <div key={msg.id} className={`flex gap-3 ${msg.isMine ? "justify-end" : "justify-start"}`}>
                  {!msg.isMine ? (
                    <div className="w-9 shrink-0">
                      {showAvatar ? (
                        <div className="relative mt-0.5 h-9 w-9 overflow-hidden rounded-full border border-gray-100 bg-white shadow-sm">
                          {renderAvatar(selectedRoom.avatar, selectedRoom.counterpartName, true)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className={`flex max-w-[75%] flex-col ${msg.isMine ? "items-end" : "items-start"}`}>
                    {!msg.isMine && showAvatar ? (
                      <span className="mb-1 ml-1 text-[11px] font-bold text-gray-500">{selectedRoom.counterpartName}</span>
                    ) : null}
                    <div className={`flex items-end gap-2 ${msg.isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${
                        msg.isMine
                          ? "rounded-tr-sm bg-[#3182f6] font-medium text-white"
                          : "rounded-tl-sm border border-gray-100 bg-white text-gray-800"
                        }`}
                      >
                      {msg.message_type === "file" && msg.file_url ? (
                        <a
                          href={buildDownloadUrl(msg.file_url)}
                          download={msg.file_name || true}
                          className="flex items-center gap-2 font-bold underline-offset-4 hover:underline"
                        >
                          <FileText className="h-4 w-4 shrink-0 opacity-70" />
                            <span className="max-w-[200px] truncate">{msg.file_name || "첨부 파일"}</span>
                          </a>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                      )}
                    </div>
                    {msg.isMine && !msg.is_read ? (
                      <span className="mb-0.5 shrink-0 text-[11px] font-bold text-[#2563EB]">1</span>
                    ) : null}
                    <span className="mb-0.5 shrink-0 text-[10px] font-medium text-gray-400">{msg.timeLabel}</span>
                  </div>
                </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white p-4 md:px-6 md:pb-6">
          <div className="mx-auto max-w-[800px]">
            <div className="relative flex items-end gap-2 rounded-2xl border border-gray-200 bg-[#F9FAFB] p-2 pr-3 transition-all focus-within:border-[#3182f6] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3182f6]/5">
              {!hideFileButton ? (
                <button
                  onClick={onFileClick}
                  disabled={inputDisabled}
                  className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title="파일 첨부"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              ) : null}

              <textarea
                value={messageInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !inputDisabled) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder={inputPlaceholder}
                disabled={inputDisabled}
                className="max-h-32 min-h-[36px] flex-1 resize-none border-none bg-transparent py-2 text-[14px] leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-400"
                rows={1}
              />

              <button
                onClick={onSend}
                disabled={inputDisabled || !messageInput.trim() || isSending || isUploading}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                  !inputDisabled && messageInput.trim() && !isSending && !isUploading
                    ? "bg-[#3182f6] text-white shadow-md shadow-blue-500/20 active:scale-95"
                    : "cursor-not-allowed bg-gray-200 text-white"
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex justify-between px-1">
              <p className="text-[11px] text-gray-400">{composerHint}</p>
              {isUploading ? <p className="animate-pulse text-[11px] font-bold text-[#3182f6]">파일 업로드 중..</p> : null}
            </div>
          </div>
        </div>
      </div>

      {isFileModalOpen ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
              <div>
                <h3 className="text-[18px] font-bold text-[#111827]">공유 파일</h3>
                <p className="mt-1 text-[12px] text-[#6B7280]">현재 대화방에서 주고받은 파일만 표시됩니다. 파일은 7일 후 만료됩니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFileModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] text-[#6B7280] transition hover:bg-[#F9FAFB]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {sharedFiles.length ? (
                <div className="space-y-3">
                  {sharedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-4 rounded-[18px] border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-[#2563EB]" />
                          <p className="truncate text-[14px] font-bold text-[#111827]">{file.file_name || "첨부 파일"}</p>
                        </div>
                        <p className="mt-2 text-[12px] text-[#6B7280]">{formatSharedFileDate(file.created_at)}</p>
                        <p className="mt-1 text-[12px] font-semibold text-[#D97706]">{getRemainingDaysLabel(file.created_at)}</p>
                      </div>
                      <a
                        href={buildDownloadUrl(file.file_url)}
                        download={file.file_name || true}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-[#D6E4FF] bg-white px-4 text-[12px] font-bold text-[#2563EB] transition hover:bg-[#F8FBFF]"
                      >
                        <Download className="h-4 w-4" />
                        다운로드
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#D1D5DB] bg-[#FAFBFC] px-6 py-12 text-center">
                  <p className="text-[14px] font-semibold text-[#4B5563]">공유된 파일이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
