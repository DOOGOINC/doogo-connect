"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

type PointSummaryResponse = {
  wallet?: {
    balance?: number;
  } | null;
};

type NotificationCategory = "trade" | "chat";

type NotificationItem = {
  key: string;
  category: NotificationCategory;
  title: string;
  message: string;
  linkUrl: string | null;
  createdAt: string;
  isRead: boolean;
  avatarInitial?: string | null;
};

type NotificationResponse = {
  trade?: NotificationItem[];
  chat?: NotificationItem[];
  unreadCount?: number;
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

function formatNotificationDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date
    .toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
    .replace(". ", ".")
    .replace(/\.$/, "");
}

function formatNotificationTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PortalPageHeader({
  portalLabel,
  sectionLabel,
  displayName,
  showPoints = false,
}: PortalPageHeaderProps) {
  const router = useRouter();
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] = useState<NotificationCategory>("trade");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Record<NotificationCategory, NotificationItem[]>>({
    trade: [],
    chat: [],
  });
  const notificationPanelRef = useRef<HTMLDivElement>(null);

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

        if (active) {
          setPointBalance(payload.wallet?.balance ?? 0);
        }
      } catch (error) {
        console.error("Failed to load portal point balance:", error);
      }
    };

    void fetchPointBalance();

    return () => {
      active = false;
    };
  }, [showPoints]);

  useEffect(() => {
    let active = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await authFetch("/api/notifications?mode=summary");
        const payload = (await response.json()) as NotificationResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "failed_to_load_notifications");
        }

        if (active) {
          setUnreadCount(Number(payload.unreadCount || 0));
        }
      } catch (error) {
        console.error("Failed to load notification summary:", error);
      }
    };

    void fetchUnreadCount();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notificationOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationOpen]);

  const avatarInitial = useMemo(() => getAvatarInitial(displayName, portalLabel), [displayName, portalLabel]);
  const activeNotifications = notifications[activeNotificationTab];
  const activeUnreadCount = activeNotifications.filter((item) => !item.isRead).length;

  const groupedNotifications = useMemo(() => {
    const groups: Array<{ label: string; items: NotificationItem[] }> = [];

    for (const item of activeNotifications) {
      const label = formatNotificationDateLabel(item.createdAt);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.label === label) {
        lastGroup.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
    }

    return groups;
  }, [activeNotifications]);

  const fetchNotifications = async () => {
    setNotificationLoading(true);

    try {
      const response = await authFetch("/api/notifications");
      const payload = (await response.json()) as NotificationResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "failed_to_load_notifications");
      }

      setNotifications({
        trade: payload.trade || [],
        chat: payload.chat || [],
      });
      setUnreadCount(Number(payload.unreadCount || 0));
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setNotificationLoading(false);
    }
  };

  const markNotificationKeysAsRead = async (keys: string[]) => {
    if (keys.length === 0) return;

    try {
      const response = await authFetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keys }),
      });

      if (!response.ok) {
        return;
      }

      setNotifications((prev) => {
        const next = {
          trade: prev.trade.map((item) => (keys.includes(item.key) ? { ...item, isRead: true } : item)),
          chat: prev.chat.map((item) => (keys.includes(item.key) ? { ...item, isRead: true } : item)),
        };
        setUnreadCount([...next.trade, ...next.chat].filter((item) => !item.isRead).length);
        return next;
      });
    } catch (error) {
      console.error("Failed to update notifications:", error);
    }
  };

  const handleNotificationToggle = async () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);

    if (nextOpen) {
      await fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);

    try {
      const response = await authFetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category: activeNotificationTab, markAll: true }),
      });

      if (!response.ok) {
        return;
      }

      setNotifications((prev) => {
        const nextItems = prev[activeNotificationTab].map((item) => ({ ...item, isRead: true }));
        const next = { ...prev, [activeNotificationTab]: nextItems };
        setUnreadCount([...next.trade, ...next.chat].filter((item) => !item.isRead).length);
        return next;
      });
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markNotificationKeysAsRead([item.key]);
    }

    setNotificationOpen(false);

    if (item.linkUrl) {
      router.push(item.linkUrl);
    }
  };

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
            <span className="text-[13px] font-bold text-[#1d4ed8]">⚡{(pointBalance ?? 0).toLocaleString()}P</span>
          </div>
        ) : null}

        <div className="relative" ref={notificationPanelRef}>
          <button
            type="button"
            onClick={() => {
              void handleNotificationToggle();
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#4b5563] transition hover:bg-[#f6f8fb]"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationOpen ? (
            <div className="fixed right-8 top-[84px] z-50 flex h-[min(640px,calc(100vh-112px))] w-[560px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
              <div className="flex items-center border-b border-[#eef2f6] px-6 pt-5">
                {[
                  { id: "trade", label: "거래 알림" },
                  { id: "chat", label: "채팅 알림" },
                ].map((tab) => {
                  const isActive = activeNotificationTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveNotificationTab(tab.id as NotificationCategory)}
                      className={`relative min-w-[150px] px-3 pb-4 text-[17px] font-bold transition ${isActive ? "text-[#111827]" : "text-[#98a2b3]"
                        }`}
                    >
                      {tab.label}
                      {isActive ? <span className="absolute inset-x-0 bottom-0 h-[4px] rounded-full bg-[#111827]" /> : null}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    void handleMarkAllRead();
                  }}
                  disabled={markingAll || activeUnreadCount === 0}
                  className="ml-auto rounded-full border border-[#dbe3ef] px-4 py-2 text-[12px] font-semibold text-[#4b5563] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  모두 읽음 처리
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6">
                {notificationLoading ? (
                  <div className="flex h-full items-center justify-center text-[14px] font-medium text-[#98a2b3]">알림을 불러오는 중입니다.</div>
                ) : groupedNotifications.length ? (
                  <div className="space-y-8">
                    {groupedNotifications.map((group) => (
                      <section key={group.label} className="space-y-4">
                        <h3 className="text-[18px] font-extrabold tracking-[-0.02em] text-[#111827]">{group.label}</h3>
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                void handleNotificationClick(item);
                              }}
                              className={`flex w-full items-start gap-4 rounded-[18px] px-2 py-2 text-left transition ${item.isRead ? "opacity-80" : "bg-[#f8fbff]"
                                }`}
                            >
                              <div
                                className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[24px] font-bold text-white ${item.category === "trade" ? "bg-[#2f6bff]" : "bg-[#61c46e]"
                                  }`}
                              >
                                {item.category === "trade" ? "D" : item.avatarInitial || "C"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold leading-7 text-[#111827]">{item.message}</p>
                                <p className="mt-2 text-[13px] font-medium text-[#98a2b3]">{formatNotificationTimeLabel(item.createdAt)}</p>
                              </div>
                              {!item.isRead ? <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff4d4f]" /> : null}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-[14px] font-medium text-[#98a2b3]">
                    <p>표시할 알림이 없습니다.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[#eef2f6] px-7 py-5 text-center text-[13px] font-medium text-[#b0b8c5]">
                최근 30일 동안의 알림만 보관되며, 이후 자동 삭제됩니다.
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f6bff] text-[18px] font-bold text-white">
          {avatarInitial}
        </div>
      </div>
    </header>
  );
}
