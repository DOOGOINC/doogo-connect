"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import type { ChatRoomView } from "./types";

interface ChatRoomSidebarProps {
  rooms: ChatRoomView[];
  roomFilter: "all" | "unread" | "active";
  searchQuery: string;
  selectedRoomId: string;
  onFilterChange: (filter: "all" | "unread" | "active") => void;
  onSearchChange: (value: string) => void;
  onRoomSelect: (roomId: string) => void;
  title?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  showActiveFilter?: boolean;
}

export function ChatRoomSidebar({
  rooms,
  roomFilter,
  searchQuery,
  selectedRoomId,
  onFilterChange,
  onSearchChange,
  onRoomSelect,
  title = "제조사 채팅",
  searchPlaceholder = "채팅 검색...",
  emptyLabel = "표시할 채팅방이 없습니다.",
  showActiveFilter = false,
}: ChatRoomSidebarProps) {
  const renderAvatar = (avatar: string, name: string) => {
    if (avatar.startsWith("initial:")) {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF2FF] text-[16px] font-bold text-[#2563EB]">
          {avatar.replace("initial:", "")}
        </div>
      );
    }

    return <Image src={avatar} alt={name} width={48} height={48} className="h-full w-full object-cover" />;
  };

  return (
    <div className="flex h-full min-h-0 w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="sticky top-0 z-10 shrink-0 border-b border-gray-100 bg-white p-5">
        <h3 className="mb-4 text-lg font-bold text-gray-900">{title}</h3>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => onFilterChange("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              roomFilter === "all" ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => onFilterChange("unread")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              roomFilter === "unread" ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            읽지 않음
          </button>
          {showActiveFilter ? (
            <button
              onClick={() => onFilterChange("active")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                roomFilter === "active" ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              접속 중
            </button>
          ) : null}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-transparent bg-gray-50 py-2 pl-9 pr-3 text-sm transition-all focus:border-gray-200 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!rooms.length ? <div className="px-5 py-8 text-sm text-gray-400">{emptyLabel}</div> : null}
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room.id)}
            className={`flex w-full items-center gap-3 border-b border-gray-50 px-5 py-4 transition-colors ${
              selectedRoomId === room.id ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="relative shrink-0">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                {renderAvatar(room.avatar, room.counterpartName)}
              </div>
              {room.isOnline ? <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" /> : null}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-bold text-gray-900">{room.counterpartName}</span>
                  {room.approvalStatus === "pending" ? (
                    <span className="shrink-0 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-semibold text-[#B54708]">
                      대기
                    </span>
                  ) : null}
                </div>
                <span className="whitespace-nowrap text-[10px] text-gray-400">{room.lastTime}</span>
              </div>
              <p className="truncate text-[11px] font-medium text-gray-400">{room.lastSeenLabel}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-gray-500">{room.lastMessage}</p>
                {room.unreadCount > 0 ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                    {room.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
