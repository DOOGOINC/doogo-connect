"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatRoomMemoValue, ChatRoomView } from "./types";

const MEMO_COLORS = ["#4f8df6", "#f6c445", "#f97316", "#22c55e", "#ef4444"];

interface ChatRoomMemoPanelProps {
  room: ChatRoomView | null;
  memoItem?: ChatRoomMemoValue | null;
  onSave: (roomId: string, memo: string, color: string) => Promise<void> | void;
  onDelete: (roomId: string) => Promise<void> | void;
}

export function ChatRoomMemoPanel({ room, memoItem, onSave, onDelete }: ChatRoomMemoPanelProps) {
  const [memoDraft, setMemoDraft] = useState("");
  const [selectedColor, setSelectedColor] = useState(MEMO_COLORS[0]);
  const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMemoDraft(memoItem?.memo || "");
    setSelectedColor(memoItem?.color || MEMO_COLORS[0]);
    setIsColorPaletteOpen(false);
  }, [memoItem, room?.id]);

  const trimmedMemoDraft = useMemo(() => memoDraft.trim(), [memoDraft]);

  const handleSave = async () => {
    if (!room || !trimmedMemoDraft) return;
    setIsSaving(true);
    try {
      await onSave(room.id, trimmedMemoDraft.slice(0, 50), selectedColor);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!room) return;
    setIsSaving(true);
    try {
      await onDelete(room.id);
      setMemoDraft("");
    } finally {
      setIsSaving(false);
    }
  };

  if (!room) {
    return (
      <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-gray-200 bg-white">
        <div className="flex flex-1 items-center justify-center px-8 text-center text-[14px] text-[#9ca3af]">
          채팅방을 선택하면 메모를 확인할 수 있습니다.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-[14px] border border-[#dfe5ee] px-5 py-6">
          <h4 className="text-[18px] font-bold text-[#111827]">메모</h4>
          <div className="mt-4 rounded-[12px] border border-[#d9dee7] p-3">
            <textarea
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value.slice(0, 50))}
              placeholder="메모를 입력해주세요."
              className="min-h-[180px] w-full resize-none border-none bg-transparent text-[15px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColorPaletteOpen((prev) => !prev)}
                  className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#d1d7e0] bg-white"
                  aria-label="메모 색상 선택"
                >
                  <span className="block h-6 w-6 rounded-[8px]" style={{ backgroundColor: selectedColor }} />
                </button>
                {isColorPaletteOpen ? (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 flex items-center gap-2 rounded-[12px] border border-[#d1d7e0] bg-white px-3 py-2 shadow-sm">
                    {MEMO_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          setIsColorPaletteOpen(false);
                        }}
                        className={`h-8 w-8 rounded-[8px] border ${selectedColor === color ? "border-[#111827]" : "border-transparent"}`}
                        aria-label={`메모 색상 ${color}`}
                      >
                        <span className="block h-full w-full rounded-[6px]" style={{ backgroundColor: color }} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!trimmedMemoDraft || isSaving}
                className="inline-flex h-12 items-center justify-center rounded-[12px] border border-[#cfd6e2] bg-white px-5 text-[14px] font-semibold text-[#111827] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9ca3af]"
              >
                {memoItem?.memo ? "수정" : "저장"}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={!memoItem?.memo || isSaving}
                className="inline-flex h-12 items-center justify-center rounded-[12px] border border-[#cfd6e2] bg-white px-5 text-[14px] font-semibold text-[#111827] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9ca3af]"
              >
                삭제
              </button>
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            <p className="text-[13px] text-[#8a94a6]">{memoDraft.length}/50</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
