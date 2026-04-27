"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PartnerDashboardPanel } from "./_components/PartnerDashboardPanel";
import { PartnerMonthlySettlementPanel } from "./_components/PartnerMonthlySettlementPanel";
import { PartnerReferralsPanel } from "./_components/PartnerReferralsPanel";
import { PartnerSalesOrdersPanel } from "./_components/PartnerSalesOrdersPanel";
import { PartnerSettingsPanel } from "./_components/PartnerSettingsPanel";
import { PartnerSettlementHistoryPanel } from "./_components/PartnerSettlementHistoryPanel";
import { PartnerSidebar } from "./_components/PartnerSidebar";

function getDisplayName(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || "파트너";
}

export default function PartnerDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
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
      <main className="flex h-[calc(100vh-64px)] flex-1 overflow-hidden border-t border-slate-100">
        <PartnerSidebar activeTab={activeTab} onTabChange={setActiveTab} displayName={displayName} />
        {renderContent()}
      </main>
    </div>
  );
}
