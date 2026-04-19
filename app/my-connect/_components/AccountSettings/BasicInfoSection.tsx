import type { Profile } from "./types";

interface BasicInfoSectionProps {
  profile: Profile | null;
  text: {
    basicInfo: string;
    infoReadonly: string;
    name: string;
    noName: string;
    noPhone: string;
    phone: string;
  };
}

export function BasicInfoSection({ profile, text }: BasicInfoSectionProps) {
  return (
    <section className="rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-lg font-bold text-[#191F28]">{text.basicInfo}</h2>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium text-[#4E5968]">{text.name}</p>
          <div className="flex h-14 w-full cursor-not-allowed items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-medium text-[#8B95A1]">
            {profile?.full_name || text.noName}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[#4E5968]">{text.phone}</p>
          <div className="flex h-14 w-full cursor-not-allowed items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-medium text-[#8B95A1]">
            {profile?.phone_number || text.noPhone}
          </div>
        </div>

        <p className="pt-2 text-[13px] text-[#8B95A1]">{text.infoReadonly}</p>
      </div>
    </section>
  );
}
