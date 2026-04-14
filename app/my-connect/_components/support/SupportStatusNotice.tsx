"use client";

type SupportStatusNoticeProps = {
  requestMessage: string;
  approvalStatus: "pending" | "approved" | "closed";
  isMaster: boolean;
  onCreateNewRequest: () => void;
};

export function SupportStatusNotice({
  requestMessage,
  approvalStatus,
  isMaster,
  onCreateNewRequest,
}: SupportStatusNoticeProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-[#6B7280]">상담 요청 내용</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#111827]">{requestMessage}</p>
      {approvalStatus === "pending" ? (
        <p className="mt-3 text-xs font-medium text-[#B54708]">마스터가 요청을 수락하면 이 방에서 바로 채팅할 수 있습니다.</p>
      ) : null}
      {approvalStatus === "closed" ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-[#667085]">이 고객센터 대화는 종료되었습니다. 새 문의가 필요하면 새 요청을 생성해 주세요.</p>
          {!isMaster ? (
            <button
              type="button"
              onClick={onCreateNewRequest}
              className="shrink-0 rounded-xl bg-[#EEF5FF] px-3 py-2 text-xs font-semibold text-[#175CD3] transition hover:bg-[#DCEBFF]"
            >
              새 문의하기
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
