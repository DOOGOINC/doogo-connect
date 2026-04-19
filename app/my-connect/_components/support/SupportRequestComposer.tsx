"use client";

import { CheckCircle2, Headset, Loader2 } from "lucide-react";

type SupportRequestComposerProps = {
  hasExistingRooms: boolean;
  requestInput: string;
  isCreatingRoom: boolean;
  onRequestInputChange: (value: string) => void;
  onSubmit: () => void;
  onBackToRoom: () => void;
};

export function SupportRequestComposer({
  hasExistingRooms,
  requestInput,
  isCreatingRoom,
  onRequestInputChange,
  onSubmit,
  onBackToRoom,
}: SupportRequestComposerProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#F8F9FA] p-6">
      <div className="mx-auto flex w-full flex-col ">

        <h2 className="mt-6 text-2xl font-bold text-[#111827]">고객센터 상담 요청</h2>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          문의 내용을 남겨주시면 관리자가 확인 후 상담 요청을 수락합니다. 수락 이후에는 기존 1:1 상담과 같은 방식으로 채팅할 수 있습니다.
        </p>

        <div className="mt-6  p-4">
          <label className="mb-3 block text-sm font-semibold text-[#111827]">요청 내용</label>
          <textarea
            value={requestInput}
            onChange={(event) => onRequestInputChange(event.target.value)}
            rows={7}
            placeholder="문의하실 내용을 자세히 적어 주세요."
            className="w-full resize-none rounded-[14px] border border-[#D0D5DD] bg-white px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition focus:border-[#3182F6]"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <div className="flex gap-3">
            {hasExistingRooms ? (
              <button
                type="button"
                onClick={onBackToRoom}
                className="inline-flex items-center gap-2 rounded-[14px] border border-[#D0D5DD] bg-white px-5 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
              >
                이전 대화 보기
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSubmit}
              disabled={isCreatingRoom}
              className="inline-flex items-center gap-2 rounded-[14px] bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1F6FE5] disabled:cursor-not-allowed disabled:bg-[#AFCBFA]"
            >
              {isCreatingRoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              상담 요청 보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
