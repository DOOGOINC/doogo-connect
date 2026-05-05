"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PortalPageHeader } from "@/components/header/PortalPageHeader";
import { supabase } from "@/lib/supabase";
import { PartnerDashboardPanel } from "./_components/PartnerDashboardPanel";
import { PartnerMonthlySettlementPanel } from "./_components/PartnerMonthlySettlementPanel";
import { PartnerReferralsPanel } from "./_components/PartnerReferralsPanel";
import { PartnerSalesOrdersPanel } from "./_components/PartnerSalesOrdersPanel";
import { PartnerSettingsPanel } from "./_components/PartnerSettingsPanel";
import { PartnerSettlementHistoryPanel } from "./_components/PartnerSettlementHistoryPanel";
import { PartnerSidebar } from "./_components/PartnerSidebar";

const TAB_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  referrals: "추천 회원",
  "sales-orders": "매출/주문",
  "monthly-settlement": "월별 정산",
  "settlement-history": "정산 내역",
  settings: "설정",
};

function getDisplayName(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || "파트너";
}

export default function PartnerDashboardPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab && requestedTab in TAB_LABELS ? requestedTab : "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [displayName, setDisplayName] = useState("파트너");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id || !active) {
        return;
      }

      const { data, error } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle();

      if (error) {
        console.warn("Partner profile lookup failed:", error.message);
        return;
      }

      if (!active) {
        return;
      }

      setDisplayName(
        getDisplayName(data?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || "파트너")
      );
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (activeTab === "dashboard") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeTab]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    const nextTab = requestedTab && requestedTab in TAB_LABELS ? requestedTab : "dashboard";
    const syncTimer = window.setTimeout(() => {
      setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [searchParams]);

  const renderContent = () => {
    if (activeTab === "dashboard") {
      return <PartnerDashboardPanel />;
    }

    if (activeTab === "referrals") {
      return <PartnerReferralsPanel />;
    }

    if (activeTab === "sales-orders") {
      return <PartnerSalesOrdersPanel />;
    }

    if (activeTab === "monthly-settlement") {
      return <PartnerMonthlySettlementPanel />;
    }

    if (activeTab === "settlement-history") {
      return <PartnerSettlementHistoryPanel />;
    }

    if (activeTab === "settings") {
      return <PartnerSettingsPanel onDisplayNameChange={setDisplayName} />;
    }

    return <PartnerDashboardPanel />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex min-h-screen flex-1 overflow-hidden">
        <PartnerSidebar activeTab={activeTab} onTabChange={setActiveTab} displayName={displayName} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <PortalPageHeader portalLabel="파트너 대시보드" sectionLabel={TAB_LABELS[activeTab] || "대시보드"} displayName={displayName} />
          <div className="min-h-0 flex-1 overflow-hidden bg-[#f9fafb]">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
}
