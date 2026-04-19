"use client";

import { useEffect, useState } from "react";
import { Mail, MessageSquareMore } from "lucide-react";
import { PartnerRequestAdmin } from "./PartnerRequestAdmin";
import { SupportInquiryAdmin } from "./SupportInquiryAdmin";

type CommunicationSection = "partner-requests" | "support-inquiries";

interface MasterCommunicationHubProps {
  initialSection?: CommunicationSection;
}

const TAB_ITEMS: Array<{
  id: CommunicationSection;
  label: string;
  description: string;
  icon: typeof Mail;
}> = [
    {
      id: "partner-requests",
      label: "제조사 입점 문의",
      description: "제조사 입점 문의를 검토하고 상태를 관리합니다.",
      icon: MessageSquareMore,
    },
    {
      id: "support-inquiries",
      label: "1:1 문의",
      description: "고객센터를 통해 접수된 일반 문의를 확인합니다.",
      icon: Mail,
    },
  ];

export function MasterCommunicationHub({ initialSection = "partner-requests" }: MasterCommunicationHubProps) {
  const [activeSection, setActiveSection] = useState<CommunicationSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-[#f6f8fc]">
      <div className="border-b border-[#e8edf5] bg-[radial-gradient(circle_at_top_left,_rgba(103,80,164,0.10),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-8 pb-6 pt-8">
        <div className="max-w-[1080px]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-[#6b7280] shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <span className="text-[15px]">💬</span>
            <span>커뮤니케이션</span>
          </div>

          <h1 className="mt-4 text-[28px] font-bold tracking-[-0.03em] text-[#1f2937]">문의와 입점 요청을 한 곳에서 관리합니다.</h1>
          <p className="mt-2 text-[15px] leading-7 text-[#64748b]">기존 운영 기능은 유지하고, 문의성 업무만 별도 허브로 묶었습니다.</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {TAB_ITEMS.map((tab) => {
              const isActive = tab.id === activeSection;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`group min-w-[220px] rounded-[28px] border px-5 py-4 text-left transition ${isActive
                    ? "border-[#d7dff0] bg-white text-[#1d4ed8] shadow-[0_16px_36px_rgba(37,99,235,0.12)]"
                    : "border-transparent bg-[#eef2f8] text-[#667085] hover:border-[#d9e2f1] hover:bg-white"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${isActive ? "bg-[#eef4ff] text-[#2563eb]" : "bg-white text-[#94a3b8] group-hover:bg-[#f8fafc]"
                        }`}
                    >
                      <tab.icon className="h-4 w-4" />
                    </div>
                    <span className="text-[15px] font-bold">{tab.label}</span>
                  </div>
                  <p className={`mt-3 text-[12px] leading-5 ${isActive ? "text-[#64748b]" : "text-[#8b95a1]"}`}>{tab.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeSection === "partner-requests" ? <PartnerRequestAdmin /> : <SupportInquiryAdmin />}
      </div>
    </div>
  );
}
