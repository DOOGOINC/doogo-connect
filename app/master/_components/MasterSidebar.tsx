"use client";

import { Coins, Factory, MessageSquare, Settings, ShieldCheck, Users } from "lucide-react";

interface MasterSidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

const MASTER_MENU = [
  { id: "manufacturers", label: "제조사 관리", icon: Factory },
  { id: "partner-requests", label: "입점 문의 내역", icon: MessageSquare },
  { id: "members", label: "전체 회원 관리", icon: Users },
  { id: "point-settings", label: "포인트 설정", icon: Coins },
];

export function MasterSidebar({ activeTab, onTabChange }: MasterSidebarProps) {
  return (
    <aside className="flex min-h-screen w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5">
        <h2 className="text-base font-bold text-gray-900">마스터 관리</h2>
      </div>

      <div className="border-b border-gray-100 px-4 py-3">
        <div className="rounded-xl bg-gray-100 p-0.5">
          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-gray-900">MASTER ADMIN</span>
              <span className="rounded-md bg-[#EEF5FF] px-2 py-1 text-[11px] font-semibold text-[#0064FF]">마스터</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <button type="button" className="flex w-full items-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-gray-700">
          <ShieldCheck className="h-4 w-4 text-[#0064FF]" />
          관리자 메뉴
        </button>

        <div className="mb-4">
          {MASTER_MENU.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-2.5 px-6 py-2 text-sm transition-colors ${
                activeTab === item.id ? "bg-blue-50 font-semibold text-[#0064FF]" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className={`h-3.5 w-3.5 ${activeTab === item.id ? "text-[#0064FF]" : "text-gray-400"}`} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-2 border-t border-gray-50 pt-2">
          <button className="flex w-full items-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
            <Settings className="h-4 w-4 text-gray-400" />
            시스템 설정
          </button>
        </div>
      </nav>
    </aside>
  );
}
