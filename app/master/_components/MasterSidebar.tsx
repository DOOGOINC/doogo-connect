"use client";

import NextLink from "next/link";
import {
  ShieldCheck,
  Settings
} from "lucide-react";

interface MasterSidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

type SidebarItem = {
  id: string;
  label: string;
  icon: string;
};

type SidebarGroup = {
  id: string;
  label: string;
  emoji: string;
  colorClass: string;
  items: SidebarItem[];
};

const MASTER_GROUPS: SidebarGroup[] = [
  {
    id: "operations",
    label: "운영",
    emoji: "⚙️",
    colorClass: "bg-[#2f6bff]",
    items: [
      { id: "dashboard", label: "대시보드", icon: "🏠" },
      { id: "manufacturing-requests", label: "제조 요청", icon: "📋" },
      { id: "production-management", label: "생산 관리", icon: "🏭" },
    ],
  },
  {
    id: "control",
    label: "통제",
    emoji: "🛡",
    colorClass: "bg-[#f43f5e]",
    items: [
      { id: "manufacturers", label: "제조사 관리", icon: "🏢" },
      { id: "members", label: "전체 회원 관리", icon: "👥" },
      { id: "requesters", label: "의뢰자 관리", icon: "👤" },
      { id: "blocked-members", label: "회원차단 리스트", icon: "🚫" },
      { id: "communication", label: "커뮤니케이션", icon: "💬" },
      { id: "support", label: "고객센터", icon: "🎧" },
    ],
  },
  {
    id: "revenue",
    label: "수익",
    emoji: "💳",
    colorClass: "bg-[#f59e0b]",
    items: [{ id: "point-settings", label: "포인트 설정", icon: "⚡" }],
  },
];

function getActiveGroupId(activeTab: string) {
  return MASTER_GROUPS.find((group) => group.items.some((item) => item.id === activeTab))?.id ?? MASTER_GROUPS[0].id;
}

export function MasterSidebar({ activeTab, onTabChange }: MasterSidebarProps) {
  const activeGroupId = getActiveGroupId(activeTab);

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] flex-shrink-0 flex-col border-r border-[#edf0f4] bg-[#fff]">
      <div className="flex-shrink-0 border-b border-[#edf0f4] bg-white px-5 py-6">
        <NextLink href="/" className="flex flex-col gap-3 group">
          <div className="flex h-16 items-center">
            <img src="/image/doogo_logo_full.png" className="w-60" alt="Logo" />
          </div>
          <p className="text-[11px] font-extrabold tracking-widest text-[#7b8597] group-hover:text-[#2f6bff] transition-colors">총괄 관리자 센터</p>
        </NextLink>
      </div>

      <div className="flex-shrink-0 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#155dfc] to-[#1652b2] text-white shadow-sm">
            <span className="text-lg font-black">A</span>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-[12px] font-medium leading-tight text-[#8b95a1]">총괄 관리자</p>
            <p className="truncate text-[16px] font-bold leading-tight text-[#1e293b]">두고커넥트</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-[#155dfc] px-3 py-1.5 text-[11px] font-bold leading-none text-white">관리자</span>
          <span className="flex items-center gap-1 rounded-full bg-[#dbfce7] px-3 py-1.5 text-[11px] font-bold leading-none text-[#2d9d78]">
            <ShieldCheck className="h-3 w-3" />
            인증됨
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
        {MASTER_GROUPS.map((group) => {
          const isGroupActive = group.id === activeGroupId;

          return (
            <section key={group.id} className="mb-5">
              <div className={`mb-2 flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold text-white ${group.colorClass}`}>
                <span>{group.emoji}</span>
                <span>{group.label}</span>
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = item.id === activeTab;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-semibold transition ${isActive
                        ? `${group.colorClass} text-white`
                        : isGroupActive
                          ? "text-[#23314f] hover:bg-[#f9fafb]"
                          : "text-[#5b6577] hover:bg-[#f9fafb]"
                        }`}
                    >
                      <span className="text-[16px]">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="mt-6 border-t border-[#edf0f4] pt-4">
          <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-semibold text-[#667085] transition hover:bg-white">
            <Settings className="h-4 w-4 text-[#94a3b8]" />
            <span>설정</span>
          </button>
        </div>
      </nav>

      <div className="border-t border-[#edf0f4] px-4 py-4">
        <p className="text-[11px] font-medium text-[#98a2b3]">마스터 포털 전용</p>
      </div>
    </aside>
  );
}
