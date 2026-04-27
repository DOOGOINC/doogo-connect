import type { Profile } from "./types";

interface ReferralSectionProps {
  profile: Profile | null;
  text: {
    referral: string;
    referralDesc: string;
    referralEmpty: string;
    referralOnlyOnce: string;
    registeredReferrer: string;
  };
}

export function ReferralSection({
  profile,
  text,
}: ReferralSectionProps) {
  return (
    <section className="mt-6 rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-lg font-bold text-[#191F28]">{text.referral}</h2>
      <p className="mb-6 text-sm text-[#667085]">{text.referralDesc}</p>

      <div className="rounded-2xl bg-[#F8FAFC] px-5 py-4">
        <p className="text-sm font-semibold text-[#344054]">{text.registeredReferrer}</p>
        <p className="mt-1 text-[15px] font-bold text-[#191F28]">{profile?.referred_by_code || text.referralEmpty}</p>
        <p className="mt-2 text-xs text-[#98A2B3]">{text.referralOnlyOnce}</p>
      </div>
    </section>
  );
}
