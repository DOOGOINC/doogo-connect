import type { Profile } from "./types";

interface ReferralSectionProps {
  handleApplyReferral: () => void;
  handleCopyReferralLink: () => void;
  isApplyingReferral: boolean;
  isCopyingReferralLink: boolean;
  profile: Profile | null;
  referralCount: number;
  referralError: string;
  referralInput: string;
  referralMessage: string;
  setReferralError: (value: string) => void;
  setReferralInput: (value: string) => void;
  setReferralMessage: (value: string) => void;
  text: {
    copyLink: string;
    copying: string;
    generating: string;
    manualReferral: string;
    manualReferralHint: string;
    myCode: string;
    referral: string;
    referralDesc: string;
    referralInput: string;
    referralOnlyOnce: string;
    referralRegister: string;
    referralRegistered?: string;
    referralRegistering: string;
    registeredReferrer: string;
  };
}

export function ReferralSection({
  handleApplyReferral,
  handleCopyReferralLink,
  isApplyingReferral,
  isCopyingReferralLink,
  profile,
  referralCount,
  referralError,
  referralInput,
  referralMessage,
  setReferralError,
  setReferralInput,
  setReferralMessage,
  text,
}: ReferralSectionProps) {
  return (
    <section className="mt-6 rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-lg font-bold text-[#191F28]">{text.referral}</h2>
      <p className="mb-6 text-sm text-[#667085]">{text.referralDesc}</p>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium text-[#4E5968]">{text.myCode}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex h-14 flex-1 items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-semibold text-[#191F28]">
              {profile?.referral_code || text.generating}
            </div>
            <button
              type="button"
              onClick={() => void handleCopyReferralLink()}
              disabled={!profile?.referral_code || isCopyingReferralLink}
              className="h-14 rounded-2xl border border-[#E5E8EB] px-5 text-sm font-semibold text-[#4E5968] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCopyingReferralLink ? text.copying : text.copyLink}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#98A2B3]">나를 추천인으로 가입한 회원: {referralCount.toLocaleString()}명</p>
        </div>

        {profile?.referred_by_code ? (
          <div className="rounded-2xl bg-[#F8FAFC] px-5 py-4">
            <p className="text-sm font-semibold text-[#344054]">{text.registeredReferrer}</p>
            <p className="mt-1 text-[15px] font-bold text-[#191F28]">{profile.referred_by_code}</p>
            <p className="mt-2 text-xs text-[#98A2B3]">{text.referralOnlyOnce}</p>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm font-medium text-[#4E5968]">{text.manualReferral}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={referralInput}
                onChange={(event) => {
                  setReferralInput(event.target.value.toUpperCase());
                  setReferralError("");
                  setReferralMessage("");
                }}
                placeholder={text.referralInput}
                className="h-14 flex-1 rounded-2xl border border-[#E5E8EB] px-5 text-[15px] font-medium text-[#191F28] outline-none transition focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/10"
              />
              <button
                type="button"
                onClick={() => void handleApplyReferral()}
                disabled={isApplyingReferral}
                className="h-14 rounded-2xl bg-[#0064FF] px-5 text-sm font-semibold text-white transition hover:bg-[#0052D4] disabled:bg-[#AAB4C8]"
              >
                {isApplyingReferral ? text.referralRegistering : text.referralRegister}
              </button>
            </div>
            <p className="mt-2 text-xs text-[#98A2B3]">{text.manualReferralHint}</p>
          </div>
        )}

        {referralError ? <p className="text-sm font-medium text-[#E5484D]">{referralError}</p> : null}
        {referralMessage ? <p className="text-sm font-medium text-[#00A86B]">{referralMessage}</p> : null}
      </div>
    </section>
  );
}
