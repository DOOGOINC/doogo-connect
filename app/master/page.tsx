"use client";

import { useState } from "react";
import { ManufacturerAdmin } from "./_components/ManufacturerAdmin";
import { MasterSidebar } from "./_components/MasterSidebar";
import { MemberAdmin } from "./_components/MemberAdmin";
import { PointSettingsAdmin } from "./_components/PointSettingsAdmin";
import { PartnerRequestAdmin } from "./_components/PartnerRequestAdmin";

export default function MasterDashboardPage() {
  const [activeTab, setActiveTab] = useState("manufacturers");

  const renderContent = () => {
    switch (activeTab) {
      case "manufacturers":
        return <ManufacturerAdmin />;
      case "members":
        return <MemberAdmin />;
      case "partner-requests":
        return <PartnerRequestAdmin />;
      case "point-settings":
        return <PointSettingsAdmin />;
      default:
        return (
          <div className="flex flex-1 items-center justify-center bg-[#F8F9FA] font-medium text-gray-500">
            준비 중인 서비스입니다.
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white pt-16">
      <main className="flex h-[calc(100vh-64px)] flex-1 overflow-hidden border-t border-slate-100">
        <MasterSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        {renderContent()}
      </main>
    </div>
  );
}
