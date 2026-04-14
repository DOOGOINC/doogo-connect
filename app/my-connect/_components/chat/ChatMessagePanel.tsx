"use client";

import type { ReactNode, RefObject } from "react";
import Image from "next/image";
import { FileText, Paperclip, Send } from "lucide-react";
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
  inputPlaceholder = "메시지를 입력해 주세요...",
  composerHint = "Shift + Enter로 줄바꿈",
  hideFileButton = false,
}: ChatMessagePanelProps) {
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
            <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50">
              <FileText className="h-3.5 w-3.5 text-gray-400" />
              파일
            </button>
          ) : null}
        </div>
      </div>

      <div ref={messageListRef} className="min-h-0 flex-1 overflow-y-auto bg-[#F2F4F7]/40 p-4 md:p-6">
        <div className="mx-auto flex max-w-[800px] flex-col space-y-6">
          {statusNotice ? <div>{statusNotice}</div> : null}
          {messages.map((msg, idx) => {
            const prev = messages[idx - 1];
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
                          href={msg.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 font-bold underline-offset-4 hover:underline"
                        >
                          <FileText className="h-4 w-4 shrink-0 opacity-70" />
                          <span className="max-w-[200px] truncate">{msg.file_name || "첨부 파일"}</span>
                        </a>
                      ) : (
                        msg.content
                      )}
                    </div>
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
            {isUploading ? <p className="animate-pulse text-[11px] font-bold text-[#3182f6]">파일 업로드 중...</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
