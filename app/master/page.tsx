"use client";

import { useState } from "react";
import { ManufacturerAdmin } from "./_components/ManufacturerAdmin";
import { MasterBlockedMembers } from "./_components/MasterBlockedMembers";
import { MasterCommunicationHub } from "./_components/MasterCommunicationHub";
import { MasterDashboard } from "./_components/MasterDashboard";
import { MasterManufacturingRequests } from "./_components/MasterManufacturingRequests";
import { MasterProductionManagement } from "./_components/MasterProductionManagement";
import { MasterRequesterManagement } from "./_components/MasterRequesterManagement";
import { MasterSidebar } from "./_components/MasterSidebar";
import { MemberAdmin } from "./_components/MemberAdmin";
import { PointSettingsAdmin } from "./_components/PointSettingsAdmin";
import { SupportCenterAdmin } from "./_components/SupportCenterAdmin";

const COPY = {
  manufacturingRequests: "\uC81C\uC870 \uC694\uCCAD",
  productionManagement: "\uC0DD\uC0B0 \uAD00\uB9AC",
  comingSoon:
    "\uD574\uB2F9 \uAE30\uB2A5\uC740 \uD604\uC7AC \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4. \uC6B4\uC601 \uD654\uBA74 \uAD6C\uC131\uC740 \uC21C\uCC28\uC801\uC73C\uB85C \uD655\uC7A5\uB429\uB2C8\uB2E4.",
  servicePreparing: "\uC900\uBE44 \uC911\uC778 \uC11C\uBE44\uC2A4\uC785\uB2C8\uB2E4.",
};

export default function MasterDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <MasterDashboard />;
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
      case "communication":
        return <MasterCommunicationHub />;
      case "partner-requests":
        return <MasterCommunicationHub initialSection="partner-requests" />;
      case "support-inquiries":
        return <MasterCommunicationHub initialSection="support-inquiries" />;
      case "point-settings":
        return <PointSettingsAdmin />;
      case "support":
        return <SupportCenterAdmin />;
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
      <main className="flex h-screen flex-1 overflow-hidden border-t border-slate-100">
        <MasterSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        {renderContent()}
      </main>
    </div>
  );
}
