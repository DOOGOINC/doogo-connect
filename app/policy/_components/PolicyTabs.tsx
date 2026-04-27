"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "이용약관", href: "/policy/terms" },
  { label: "개인정보 처리방침", href: "/policy/privacy" },
];

export function PolicyTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-10 mb-12 border-b border-gray-100">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative pb-4 text-[18px] font-bold transition-colors ${isActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              }`}
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#0064FF]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
