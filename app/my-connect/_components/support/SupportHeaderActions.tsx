"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { ChatRoomView } from "../chat/types";

type SupportHeaderActionsProps = {
  isMaster: boolean;
  selectedRoom: ChatRoomView | null;
  isApprovingRoom: boolean;
  isClosingRoom: boolean;
  onApprove: () => void;
  onClose: () => void;
  onCreateNewRequest: () => void;
};

export function SupportHeaderActions({
  isMaster,
  selectedRoom,
  isApprovingRoom,
  isClosingRoom,
  onApprove,
  onClose,
  onCreateNewRequest,
}: SupportHeaderActionsProps) {
  if (isMaster) {
    return (
      <div className="flex gap-2">
        {selectedRoom?.approvalStatus === "pending" ? (
          <button
            type="button"
            onClick={onApprove}
            disabled={isApprovingRoom}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isApprovingRoom ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            요청 수락
          </button>
        ) : null}
        {selectedRoom?.approvalStatus === "approved" ? (
          <button
            type="button"
            onClick={onClose}
            disabled={isClosingRoom}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#B42318] transition hover:bg-[#FEE4E2] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isClosingRoom ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            대화 종료
          </button>
        ) : null}
      </div>
    );
  }

  if (selectedRoom?.approvalStatus === "closed") {
    return (
      <button
        type="button"
        onClick={onCreateNewRequest}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
      >
        새 문의하기
      </button>
    );
  }

  return null;
}
