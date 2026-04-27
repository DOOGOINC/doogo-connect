"use client";

import {
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  Factory,
  FileText,
  FolderKanban,
  Headphones,
  LayoutDashboard,
  MessageSquareText,
  PackageCheck,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";

type ConnectViewMode = "client" | "manufacturer";

interface SidebarLeafItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: SidebarLeafItem[];
  defaultOpen?: boolean;
}
const Emoji02 = () => <span>📝</span>;
const Emoji03 = () => <span>🏭</span>;
const Emoji04 = () => <span>💬</span>;
const Emoji05 = () => <span>💰</span>;
const Emoji06 = () => <span>⚡</span>;
const Emoji07 = () => <span>⚙️</span>;


const CLIENT_GROUPS: SidebarGroup[] = [
  {
    id: "quotes",
    label: "견적 진행",
    icon: Emoji02,
    defaultOpen: true,
    children: [
      { id: "quote-request", label: "제조사 견적요청", icon: LayoutDashboard },
      { id: "manufacturer-list", label: "제조사 목록", icon: Factory },
      { id: "project", label: "프로젝트", icon: FileText },
    ],
  },
  {
    id: "production",
    label: "생산 진행",
    icon: Emoji03,
    defaultOpen: true,
    children: [
      { id: "delivery", label: "생산", icon: PackageCheck },
    ],
  },
  {
    id: "communication",
    label: "커뮤니케이션",
    icon: Emoji04,
    defaultOpen: true,
    children: [
      { id: "chat", label: "1:1 대화", icon: MessageSquareText },
      { id: "support", label: "고객센터", icon: Headphones },
    ],
  },
  {
    id: "transaction",
    label: "거래 관리",
    icon: Emoji05,
    defaultOpen: true,
    children: [
      { id: "payment", label: "결제 내역", icon: Banknote },
      { id: "refund-disputes", label: "환불/취소/분쟁", icon: ShieldCheck },
    ],
  },
];

const MANUFACTURER_GROUPS: SidebarGroup[] = [
  {
    id: "quotes",
    label: "견적 진행",
    icon: ClipboardList,
    defaultOpen: true,
    children: [
      { id: "rfq-inbox", label: "제조사 견적함", icon: FileText },
      { id: "orders", label: "수주 관리", icon: BriefcaseBusiness },
    ],
  },
  {
    id: "production",
    label: "생산 진행",
    icon: Factory,
    defaultOpen: true,
    children: [{ id: "production", label: "생산 진행", icon: Factory }],
  },
  {
    id: "catalog",
    label: "OEM 상품 관리",
    icon: FolderKanban,
    defaultOpen: true,
    children: [
      { id: "product-list", label: "상품 리스트", icon: FolderKanban },
      { id: "product-create", label: "상품 등록", icon: FolderKanban },
    ],
  },
  {
    id: "communication",
    label: "커뮤니케이션",
    icon: MessageSquareText,
    defaultOpen: true,
    children: [
      { id: "chat", label: "1:1 대화", icon: MessageSquareText },
      { id: "support", label: "고객센터", icon: Headphones },
    ],
  },
  {
    id: "transaction",
    label: "거래 관리",
    icon: Banknote,
    defaultOpen: true,
    children: [
      { id: "transactions", label: "거래 통계", icon: Banknote },
      { id: "trade-support", label: "거래 지원", icon: ShieldCheck },
    ],
  },
];

const UTILITY_ITEMS_BY_MODE: Record<ConnectViewMode, SidebarLeafItem[]> = {
  client: [
    { id: "points", label: "포인트 관리", icon: Emoji06 },
    { id: "settings", label: "설정", icon: Emoji07 },
  ],
  manufacturer: [{ id: "settings", label: "설정", icon: Settings }],
};

interface SidebarProps {
  activeTab: string;
  displayName?: string;
  isManufacturer: boolean;
  onTabChange: (id: string) => void;
  viewMode: "client" | "manufacturer";
  manufacturerName?: string;
}

function getInitialOpenState(groups: SidebarGroup[]) {
  return groups.reduce<Record<string, boolean>>((acc, group) => {
    acc[group.id] = group.defaultOpen ?? true;
    return acc;
  }, {});
}

export function Sidebar({ activeTab, displayName, isManufacturer, onTabChange, viewMode, manufacturerName }: SidebarProps) {
  const groups = viewMode === "manufacturer" ? MANUFACTURER_GROUPS : CLIENT_GROUPS;
  const utilityItems = UTILITY_ITEMS_BY_MODE[viewMode];
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => getInitialOpenState(groups));

  const profileName = viewMode === "manufacturer" ? manufacturerName?.trim() || "제조사 계정" : `${displayName?.trim() || "고객"} 고객님`;
  const profileTypeLabel = isManufacturer ? "제조사" : "의뢰자";
  const profileDescription = isManufacturer ? "제조사 계정" : "의뢰자 계정";
  const connectLabel = viewMode === "manufacturer" ? "마이커넥트(제조사)" : "마이커넥트(의뢰자)";
  const homeTab = viewMode === "manufacturer" ? "rfq-inbox" : "dashboard";

  return (
    <aside className="flex h-full min-h-0 w-[248px] flex-shrink-0 flex-col border-r border-[#edf0f4] bg-white">
      <div className="flex-shrink-0 border-b border-[#edf0f4] bg-[#edf3ff] px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2f6bff] text-white">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#7b8597]">{profileDescription}</p>
            <p className="mt-1 truncate text-[14px] font-bold leading-6 text-[#2a3550]">{profileName}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#2f6bff] px-3 py-1 text-[11px] font-semibold text-white">{profileTypeLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ddf7e8] px-3 py-1 text-[11px] font-semibold text-[#14904c]">
            <BadgeCheck className="h-3.5 w-3.5" />
            인증됨
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => onTabChange(homeTab)}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold transition ${activeTab === homeTab ? "bg-[#2f6bff] text-white" : "bg-[#fff] text-[#37507d] hover:bg-[#f7f9fc]"
            }`}
        >
          🏠
          <span className="truncate">{connectLabel}</span>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => {
          const hasActiveChild = group.children.some((child) => child.id === activeTab);
          const isOpen = openGroups[group.id] ?? (hasActiveChild || group.defaultOpen === true);

          return (
            <div key={group.id} className="mb-2">
              <button
                type="button"
                onClick={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-[#f7f9fc]"
              >
                <span className="flex items-center gap-3">
                  <group.icon className={`h-4 w-4 ${hasActiveChild ? "text-[#2f6bff]" : "text-[#f18b46]"}`} />
                  <span className={`text-[15px] font-semibold ${hasActiveChild ? "text-[#23314f]" : "text-[#43506a]"}`}>{group.label}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-[#98a2b3] transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="ml-6 border-[#eef1f5] py-1">
                  {group.children.map((item) => {
                    const isActive = item.id === activeTab;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onTabChange(item.id)}
                        className={`relative flex w-full items-center gap-3 rounded-xl py-2.5 pl-5 pr-3 text-left text-[14px] transition ${isActive ? "bg-[#eef4ff] font-semibold text-[#2f6bff]" : "text-[#7f8898] hover:bg-[#f8fafc] hover:text-[#3c4a63]"
                          }`}
                      >
                        <span className={`absolute left-[-5px] h-2 w-2 rounded-full ${isActive ? "bg-[#2f6bff]" : "bg-[#d7dde6]"}`} />

                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-4 space-y-1 border-t border-[#eef1f5] pt-4">
          {utilityItems.map((item) => {
            const isActive = item.id === activeTab;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold transition ${isActive ? "bg-[#eef4ff] text-[#2f6bff]" : "text-[#43506a] hover:bg-[#f7f9fc]"
                  }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-[#2f6bff]" : item.id === "points" ? "text-[#f08a47]" : "text-[#b09ad8]"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
