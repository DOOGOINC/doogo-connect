"use client";

import type { SettingsTab } from "./types";

type SettingsTabBarProps = {
  tabs: Array<{ id: SettingsTab; label: string; icon: string }>;
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsTabBar({ tabs, activeTab, onChange }: SettingsTabBarProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`h-9 rounded-full px-4 text-[13px] font-bold transition ${active ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-[#E5E7EB]" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-white"}`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
