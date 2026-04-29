"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { ChevronRight } from 'lucide-react';

type PointSummaryResponse = {
  wallet?: {
    balance?: number;
  } | null;
};

interface PortalPageHeaderProps {
  portalLabel: string;
  sectionLabel: string;
  displayName?: string;
  showPoints?: boolean;
}

function getAvatarInitial(displayName: string | undefined, portalLabel: string) {
  const source = (displayName || portalLabel).trim();
  return source ? source.charAt(0).toUpperCase() : "D";
}

export function PortalPageHeader({
  portalLabel,
  sectionLabel,
  displayName,
  showPoints = false,
}: PortalPageHeaderProps) {
  const [pointBalance, setPointBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!showPoints) {
      setPointBalance(null);
      return;
    }

    let active = true;

    const fetchPointBalance = async () => {
      try {
        const response = await authFetch("/api/points/summary");
        const payload = (await response.json()) as PointSummaryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "failed_to_load_points");
        }

        if (!active) {
          return;
        }

        setPointBalance(payload.wallet?.balance ?? 0);
      } catch (error) {
        console.error("Failed to load portal point balance:", error);
      }
    };

    void fetchPointBalance();

    return () => {
      active = false;
    };
  }, [showPoints]);

  const avatarInitial = useMemo(() => getAvatarInitial(displayName, portalLabel), [displayName, portalLabel]);

  return (
    <header className="flex h-[68px] flex-shrink-0 items-center justify-between border-b border-[#edf0f4] bg-white px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-3 text-[13px] font-semibold text-[#8b95a1]">
          <span className="truncate text-[#2f6bff]">{portalLabel}</span>
          <ChevronRight size={14} className="text-[#c2c8d0]" strokeWidth={3} />
          <span className="truncate text-[#4b5563]">{sectionLabel}</span>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {showPoints ? (
          <div className="hidden items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-2 sm:flex">
            <span className="text-blue-600 text-sm">⚡</span>
            <span className="text-[13px] font-bold text-[#1d4ed8]">{(pointBalance ?? 0).toLocaleString()}P</span>
          </div>
        ) : null}

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#4b5563] transition hover:bg-[#f6f8fb]"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[10px] font-bold leading-none text-white">
            3
          </span>
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f6bff] text-[18px] font-bold text-white">
          {avatarInitial}
        </div>
      </div>
    </header>
  );
}
