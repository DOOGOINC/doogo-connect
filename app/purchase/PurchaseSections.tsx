import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { formatPoints, formatWon, type PointPackage } from "./purchaseShared";

type PurchaseMainSectionProps = {
  pointPackages: PointPackage[];
  selectedPackage: PointPackage;
  agreedToPolicy: boolean;
  completed: boolean;
  submitting: boolean;
  pendingPaymentId: string;
  errorMessage: string;
  onSelectPackage: (packageId: string) => void;
  onAgreeChange: (checked: boolean) => void;
  onSubmit: () => void;
  onViewHistory: () => void;
};

export function PurchaseMainSection({
  pointPackages,
  selectedPackage,
  agreedToPolicy,
  completed,
  submitting,
  pendingPaymentId,
  errorMessage,
  onSelectPackage,
  onAgreeChange,
  onSubmit,
  onViewHistory,
}: PurchaseMainSectionProps) {
  return (
    <section className="rounded-[18px] border border-[#E6E8EC] bg-white p-5 shadow-sm md:p-7">
      <div className="border-b border-[#EEF1F4] pb-5">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#202632]">포인트 충전</h1>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#6B7280]">
          필요한 포인트 상품을 선택하고 결제 정보를 확인한 뒤 충전을 진행해 주세요.
        </p>
      </div>

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#202632]">1. 포인트 선택</h2>
            <p className="mt-1 text-[12px] font-semibold text-[#6B7280]">충전할 포인트 상품을 선택해 주세요.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {pointPackages.map((item) => {
            const selected = selectedPackage.id === item.id;
            const packagePoints = item.points + item.bonusPoints;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPackage(item.id)}
                className={`rounded-[14px] border px-4 py-5 text-left transition ${selected ? "border-[#1E49D8] bg-[#F5F8FF] ring-2 ring-[#1E49D8]/15" : "border-[#DDE2EA] bg-white hover:border-[#9FB5F7]"}`}
              >
                <p className="text-[12px] font-extrabold text-[#6B7280]">{item.label}</p>
                <p className="mt-3 text-[22px] font-bold tracking-[-0.03em] text-[#2864F0]">{formatPoints(packagePoints)}</p>
                {item.bonusPoints ? <p className="mt-1 text-[12px] font-extrabold text-[#10A25F]">+ {formatPoints(item.bonusPoints)} 보너스</p> : null}
                <p className="mt-4 text-[13px] font-bold text-[#6B7280]">{formatWon(item.amountKrw)}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[12px] border border-[#E7ECF3] bg-[#F8FAFD] px-4 py-4">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#202632]">
            <CreditCard className="h-4 w-4 text-[#1E49D8]" />
            결제 수단 (신용카드 전용)
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-[16px] font-bold text-[#202632]">2. 결제 동의 및 충전</h2>
        <div className="mt-4 rounded-[14px] border border-[#E7ECF3] bg-[#F8FAFD] px-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2 text-[13px] font-semibold leading-6 text-[#334155]">
              <p>
                <span className="mr-2 inline-block h-[8px] w-[8px] rounded-full bg-[#2563EB] align-middle" />
                충전 포인트의 유효기간은 결제일로부터 <span className="font-bold text-[#2563EB]">1년</span>입니다.
              </p>
              <p>
                <span className="mr-2 inline-block h-[8px] w-[8px] rounded-full bg-[#2563EB] align-middle" />
                포인트 결제는 <span className="font-bold text-[#2563EB]">신용카드</span> 방식으로만 진행됩니다.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={agreedToPolicy}
                onChange={(event) => onAgreeChange(event.target.checked)}
                className="peer sr-only"
              />
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border border-[#D6DEEB] bg-white text-white transition peer-checked:border-[#2563EB] peer-checked:bg-[#2563EB]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold leading-7 text-[#334155]">
                  주문 내용 및 포인트 이용 약관을 확인했으며, 결제에 동의합니다.
                </span>
                <span className="mt-2 block text-[13px] font-semibold leading-8 text-[#94A3B8]">
                  구매한 포인트는 결제 완료 후 즉시 충전되며, 실제 결제 결과는 포트원과 이니시스 승인 결과를 기준으로 처리됩니다.
                </span>
              </span>
            </label>
          </div>
        </div>

        {completed ? (
          <div className="mt-5 rounded-[14px] p-4">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#10a25f]">
              <CheckCircle2 className="h-5 w-5" />
              포인트 충전이 완료되었습니다.
            </div>
            <button
              type="button"
              onClick={onViewHistory}
              className="mt-4 h-11 w-full rounded-[10px] bg-[#1E49D8] text-[14px] font-extrabold text-white transition hover:bg-[#173DB8]"
            >
              구매 내역 확인하기
            </button>
          </div>
        ) : (
          <>
            {errorMessage ? (
              <p className="mt-4 rounded-[10px] bg-[#FFF1F1] px-4 py-3 text-[13px] font-bold text-[#D92D20]">{errorMessage}</p>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="mt-5 h-12 w-full rounded-[10px] bg-[#1E49D8] text-[14px] font-extrabold text-white transition hover:bg-[#173DB8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "충전 처리 중..." : pendingPaymentId ? "결제 검증 다시 시도" : "충전하기"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

type PurchaseSummarySectionProps = {
  selectedPackage: PointPackage;
  totalPoints: number;
};

export function PurchaseSummarySection({ selectedPackage, totalPoints }: PurchaseSummarySectionProps) {
  return (
    <aside className="rounded-[18px] border border-[#E6E8EC] bg-white p-5 shadow-sm lg:sticky lg:top-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#1E49D8]" />
        <h2 className="text-[18px] font-bold text-[#202632]">주문 요약</h2>
      </div>

      <div className="mt-5 rounded-[14px] bg-[#F7F8FA] p-4">
        <p className="text-[12px] font-extrabold text-[#6B7280]">선택 상품</p>
        <p className="mt-2 text-[18px] font-bold text-[#202632]">{selectedPackage.label}</p>
        <p className="mt-1 text-[13px] font-bold text-[#6B7280]">{formatPoints(totalPoints)}</p>
      </div>

      <div className="mt-5 space-y-3 rounded-[14px] border border-[#EEF1F4] bg-white p-4">
        <div className="flex items-center justify-between text-[14px] font-bold text-[#4B5563]">
          <span>충전 포인트</span>
          <span className="text-[#202632]">{formatPoints(selectedPackage.points)}</span>
        </div>
        <div className="flex items-center justify-between text-[14px] font-bold text-[#4B5563]">
          <span>보너스 포인트</span>
          <span className="text-[#10A25F]">+{formatPoints(selectedPackage.bonusPoints)}</span>
        </div>
        <div className="h-px bg-[#E6E8EC]" />
        <div className="flex items-center justify-between text-[18px] font-bold text-[#202632]">
          <span>총 결제 금액</span>
          <span>{formatWon(selectedPackage.amountKrw)}</span>
        </div>
      </div>

      <div className="mt-5 rounded-[14px] border border-[#E7ECF3] bg-[#F8FAFD] px-4 py-4">
        <p className="text-[12px] font-extrabold text-[#6B7280]">결제 안내</p>
        <div className="mt-3 space-y-2 text-[13px] font-semibold leading-6 text-[#6B7280]">
          <p>- 결제 완료 후 포인트가 즉시 충전됩니다.</p>
          <p>- 충전 내역은 마이페이지 포인트 탭에서 바로 확인할 수 있습니다.</p>
          <p>- 신용카드 결제만 지원합니다.</p>
        </div>
      </div>
    </aside>
  );
}

export function PurchaseFooterNotice() {
  return (
    <div className="mt-6 px-1">
      <div className="space-y-2 text-[13px] font-semibold leading-6 text-[#6B7280]">
        <p>결제 완료 후 즉시 포인트가 반영되며, 충전 내역은 마이페이지에서 확인할 수 있습니다.</p>
        <p>결제 과정에서 문제가 발생한 경우 고객센터로 문의해 주세요.</p>
        <p>- 모든 거래는 포트원과 이니시스 승인 결과를 기준으로 처리됩니다.</p>
        <p>- 문의 채널: 고객센터</p>
        <p>- 연락처: 070-7174-2186</p>
      </div>
    </div>
  );
}
