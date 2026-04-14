"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  Coins,
  CreditCard,
  Factory,
  FileText,
  LayoutDashboard,
  Map,
  PackagePlus,
  Receipt,
  Send,
  Settings,
} from "lucide-react";
import { useState } from "react";

const CLIENT_SIDEBAR_ITEMS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "project", label: "프로젝트", icon: FileText },
  { id: "delivery", label: "제조 진행", icon: Map },
  { id: "activity", label: "활동 로그", icon: BarChart3 },
  { id: "chat", label: "1:1 상담", icon: Send },
];

const MANUFACTURER_SIDEBAR_ITEMS = [
  { id: "rfq-inbox", label: "견적 요청", icon: FileText },
  { id: "orders", label: "수주 관리", icon: BriefcaseBusiness },
  { id: "production", label: "제조 관리", icon: Factory },
  { id: "product-registration", label: "제조사 카탈로그", icon: PackagePlus },
  { id: "chat", label: "1:1 상담", icon: Send },
  { id: "transactions", label: "거래/정산", icon: Receipt },
];

interface SidebarProps {
  activeTab: string;
  isManufacturer: boolean;
  onTabChange: (id: string) => void;
  viewMode: "client" | "manufacturer";
  manufacturerName?: string;
}

export function Sidebar({ activeTab, isManufacturer, onTabChange, viewMode, manufacturerName }: SidebarProps) {
  const [isQuotesOpen, setIsQuotesOpen] = useState(true);

  const sidebarItems = viewMode === "manufacturer" ? MANUFACTURER_SIDEBAR_ITEMS : CLIENT_SIDEBAR_ITEMS;
  const sectionTitle = viewMode === "manufacturer" ? "제조 운영" : "의뢰 관리";
  const roleLabel = viewMode === "manufacturer" ? manufacturerName?.trim() || "제조사" : "의뢰자";
  const roleBadgeLabel = isManufacturer ? "제조사" : "의뢰자";

  return (
    <aside className="flex min-h-screen w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5">
        <h2 className="text-base font-bold text-gray-900">마이커넥트</h2>
      </div>

      <div className="border-b border-gray-100 px-4 py-3">
        <div className="rounded-xl bg-gray-100 p-0.5">
          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-gray-900">{roleLabel}</span>
              <span className="rounded-md bg-[#EEF5FF] px-2 py-1 text-[11px] font-semibold text-[#0064FF]">{roleBadgeLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <button
          onClick={() => setIsQuotesOpen(!isQuotesOpen)}
          className="flex w-full items-center justify-between px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <span>{sectionTitle}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isQuotesOpen ? "rotate-180" : "rotate-0"}`} />
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isQuotesOpen ? "mb-4 max-h-[500px] opacity-100" : "mb-0 max-h-0 opacity-0"}`}>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-2.5 px-6 py-2 text-sm transition-colors ${activeTab === item.id ? "bg-blue-50 font-semibold text-[#0064FF]" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <item.icon className={`h-3.5 w-3.5 ${activeTab === item.id ? "text-[#0064FF]" : "text-gray-400"}`} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-2 border-t border-gray-50 pt-2">
          <button
            onClick={() => onTabChange("settings")}
            className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-sm font-semibold transition-colors ${activeTab === "settings" ? "bg-blue-50 font-semibold text-[#0064FF]" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <Settings className={`h-4 w-4 ${activeTab === "settings" ? "text-[#0064FF]" : "text-gray-400"}`} />
            계정 설정
          </button>
          {viewMode === "client" ? (
            <button
              onClick={() => onTabChange("points")}
              className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-sm font-semibold transition-colors ${activeTab === "points" ? "bg-blue-50 font-semibold text-[#0064FF]" : "text-gray-700 hover:bg-gray-50"}`}
            >
              <Coins className={`h-4 w-4 ${activeTab === "points" ? "text-[#0064FF]" : "text-gray-400"}`} />
              내 포인트
            </button>
          ) : null}
          <button
            onClick={() => onTabChange("payment")}
            className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-sm font-semibold transition-colors ${activeTab === "payment" ? "bg-blue-50 font-semibold text-[#0064FF]" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <CreditCard className={`h-4 w-4 ${activeTab === "payment" ? "text-[#0064FF]" : "text-gray-400"}`} />
            결제 관리
          </button>
        </div>
      </nav>
    </aside>
  );
}
