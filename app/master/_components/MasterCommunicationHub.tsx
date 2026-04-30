"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MasterNoticeAdmin } from "./MasterNoticeAdmin";
import { PartnerRequestAdmin } from "./PartnerRequestAdmin";
import { SupportInquiryAdmin } from "./SupportInquiryAdmin";

type CommunicationSection = "notices" | "partner-requests" | "support-inquiries";

interface MasterCommunicationHubProps {
  initialSection?: CommunicationSection;
  refreshKey?: number;
}

const TAB_ITEMS: Array<{
  id: CommunicationSection;
  label: string;
}> = [
    {
      id: "notices",
      label: "공지사항",
    },
    {
      id: "partner-requests",
      label: "제조사 입점 문의",
    },
    {
      id: "support-inquiries",
      label: "1:1 문의",
    },
  ];

export function MasterCommunicationHub({ initialSection = "notices", refreshKey = 0 }: MasterCommunicationHubProps) {
  const [activeSection, setActiveSection] = useState<CommunicationSection>(initialSection);
  const [partnerUnreadCount, setPartnerUnreadCount] = useState(0);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const fetchPartnerUnreadCount = async () => {
      const { count, error } = await supabase
        .from("partner_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (!error) {
        setPartnerUnreadCount(count || 0);
      }
    };

    void fetchPartnerUnreadCount();

    const channel = supabase
      .channel("master-partner-requests-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_requests" }, () => {
        void fetchPartnerUnreadCount();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshKey]);

  const renderSection = () => {
    if (activeSection === "notices") return <MasterNoticeAdmin refreshKey={refreshKey} />;
    if (activeSection === "partner-requests") return <PartnerRequestAdmin refreshKey={refreshKey} onUnreadCountChange={setPartnerUnreadCount} />;
    return <SupportInquiryAdmin refreshKey={refreshKey} />;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f6f8]">
      <div className="px-6 pb-5 pt-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[22px] font-bold text-[#1f2937]">
            <span className="text-[18px] leading-none">💬</span>
            <h1>커뮤니케이션</h1>
          </div>
          <p className="text-[14px] font-medium text-[#6b7280]">두고커넥트 운영 관리 시스템</p>
        </div>

        <div className="mt-8 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[#eef0f4] p-1">
          {TAB_ITEMS.map((tab) => {
            const isActive = tab.id === activeSection;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-[14px] font-bold transition ${isActive
                  ? "bg-white text-[#1d4ed8]"
                  : "text-[#6b7280] hover:bg-white/70 hover:text-[#344054]"
                  }`}
              >
                {tab.id === "support-inquiries" ? <span className="text-[13px] leading-none text-[#a78bfa]">💬</span> : null}
                <span>{tab.label}</span>
                {tab.id === "partner-requests" ? <span className="text-[13px] font-bold">{partnerUnreadCount}건 미읽음</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{renderSection()}</div>
    </div>
  );
}
