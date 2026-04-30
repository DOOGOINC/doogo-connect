"use client";

import { use, useEffect, useState } from "react";
import { PortalPageHeader } from "@/components/header/PortalPageHeader";
import { ManufacturerAdmin } from "./_components/ManufacturerAdmin";
import { MasterBlockedMembers } from "./_components/MasterBlockedMembers";
import { MasterCommunicationHub } from "./_components/MasterCommunicationHub";
import { MasterDashboard } from "./_components/MasterDashboard";
import { MasterDisputeCenter } from "./_components/MasterDisputeCenter";
import { MasterManufacturingRequests } from "./_components/MasterManufacturingRequests";
import { MasterProductionManagement } from "./_components/MasterProductionManagement";
import { MasterRequesterManagement } from "./_components/MasterRequesterManagement";
import { MasterPartnerManagement } from "./_components/MasterPartnerManagement";
import { MasterSidebar } from "./_components/MasterSidebar";
import { MasterSettingsAdmin } from "./_components/MasterSettingsAdmin";
import { MasterTransactionManagement } from "./_components/MasterTransactionManagement";
import { MemberAdmin } from "./_components/MemberAdmin";
import { PartnerSettlementAdmin } from "./_components/PartnerSettlementAdmin";
import { MasterStatisticsAdmin } from "./_components/MasterStatisticsAdmin";
import { PointSettingsAdmin } from "./_components/PointSettingsAdmin";
import { SupportCenterAdmin } from "./_components/SupportCenterAdmin";


const COPY = {
  servicePreparing: "준비 중인 서비스입니다.",
};

const TAB_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  "manufacturing-requests": "제조 요청",
  "production-management": "생산 관리",
  manufacturers: "제조사 관리",
  members: "전체 회원 관리",
  requesters: "의뢰자 관리",
  "blocked-members": "회원차단 리스트",
  "dispute-center": "분쟁/중재 센터",
  communication: "커뮤니케이션",
  "partner-requests": "파트너 요청",
  "support-inquiries": "고객 문의",
  "point-settings": "포인트",
  "transaction-management": "거래 관리",
  "partner-management": "파트너 관리",
  "partner-settlement": "파트너 정산 관리",
  settings: "설정",
  support: "고객센터",
};

type MasterPageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function MasterDashboardPage({ searchParams }: { searchParams: MasterPageSearchParams }) {
  const resolvedSearchParams = use(searchParams);
  const requestedTab = resolvedSearchParams?.tab;
  const initialTab =
    typeof requestedTab === "string" && requestedTab in TAB_LABELS
      ? requestedTab
      : Array.isArray(requestedTab) && requestedTab[0] && requestedTab[0] in TAB_LABELS
        ? requestedTab[0]
        : "dashboard";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [supportInitialRoomId, setSupportInitialRoomId] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);

    if (activeTab === "dashboard") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeTab]);

  const openSupportRoom = (roomId: string) => {
    setSupportInitialRoomId(roomId);
    setActiveTab("support");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <MasterDashboard onOpenDisputeCenter={() => setActiveTab("dispute-center")} />;
      case "manufacturing-requests":
        return <MasterManufacturingRequests />;
      case "production-management":
        return <MasterProductionManagement />;
      case "manufacturers":
        return <ManufacturerAdmin />;
      case "members":
        return <MemberAdmin />;
      case "requesters":
        return <MasterRequesterManagement />;
      case "blocked-members":
        return <MasterBlockedMembers />;
      case "dispute-center":
        return <MasterDisputeCenter onOpenSupportRoom={openSupportRoom} />;
      case "communication":
        return <MasterCommunicationHub />;
      case "partner-requests":
        return <MasterCommunicationHub initialSection="partner-requests" />;
      case "support-inquiries":
        return <MasterCommunicationHub initialSection="support-inquiries" />;
      case "point-settings":
        return <PointSettingsAdmin />;
      case "transaction-management":
        return <MasterTransactionManagement />;
      case "partner-management":
        return <MasterPartnerManagement />;
      case "partner-settlement":
        return <PartnerSettlementAdmin />;
      case "statistics":
        return <MasterStatisticsAdmin />;
      case "settings":
        return <MasterSettingsAdmin />;
      case "support":
        return <SupportCenterAdmin initialRoomId={supportInitialRoomId} />;
      default:
        return (
          <div className="flex flex-1 items-center justify-center bg-[#F8F9FA] font-medium text-gray-500">
            {COPY.servicePreparing}
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex min-h-screen flex-1 overflow-hidden">
        <MasterSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <PortalPageHeader portalLabel="마스터 대시보드" sectionLabel={TAB_LABELS[activeTab] || "대시보드"} displayName="DOGO CONNECT" />
          <div className="min-h-0 flex-1 overflow-hidden bg-[#F8F9FA]">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
}


