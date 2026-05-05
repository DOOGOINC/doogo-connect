"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { AuthModal } from "@/components/AuthModal";
import { getPortalHomeByRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { Bell, Check, LogOut, X } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

const navItems = [
  { label: "커넥트란?", href: "/guide" },
  { label: "제조 견적", href: "/estimate" },
  { label: "제조사 목록", href: "/manufacturers" },
  { label: "성공사례", href: "/success-stories" },
  { label: "고객센터", href: "/support" },
];

type PointPackage = {
  id: string;
  label: string;
  points: number;
  bonusPoints: number;
  amountKrw: number;
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

const DEFAULT_POINT_PACKAGES: PointPackage[] = [
  { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
  { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
  { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 5000, amountKrw: 50000 },
];

function formatPointValue(value: number) {
  return `${Number(value || 0).toLocaleString()}P`;
}

function formatWonValue(value: number) {
  return `${Number(value || 0).toLocaleString()}원`;
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

export function SiteHeader() {
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [pointPackages, setPointPackages] = useState<PointPackage[]>(DEFAULT_POINT_PACKAGES);
  const [selectedPointPackageId, setSelectedPointPackageId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] = useState<NotificationCategory>("trade");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Record<NotificationCategory, NotificationItem[]>>({
    trade: [],
    chat: [],
  });

  const pathname = usePathname();
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const isMainPage = pathname === "/";
  const isMasterPage = pathname?.startsWith("/master");
  const isMyConnectPage = pathname?.startsWith("/my-connect");
  const isPartnerDashboardPage = pathname?.startsWith("/partner/dashboard");

  const getDisplayName = useCallback((currentSession: Session | null) => {
    const metadataName =
      currentSession?.user?.user_metadata?.full_name ||
      currentSession?.user?.user_metadata?.name ||
      currentSession?.user?.identities?.[0]?.identity_data?.full_name ||
      currentSession?.user?.identities?.[0]?.identity_data?.name ||
      "";

    if (typeof metadataName === "string" && metadataName.trim()) {
      return metadataName.trim();
    }

    const email = currentSession?.user?.email || "";
    return typeof email === "string" && email.includes("@") ? email.split("@")[0] : email;
  }, []);

  const getMetadataRole = useCallback((currentSession: Session | null) => {
    const metadataRole = currentSession?.user?.user_metadata?.role;
    return typeof metadataRole === "string" && metadataRole.trim() ? metadataRole : "";
  }, []);

  const fetchPoints = useCallback(async () => {
    try {
      const res = await authFetch("/api/points/summary");
      if (res.ok) {
        const data = (await res.json()) as { wallet?: { balance?: number }; pointPurchasePackages?: PointPackage[] };
        setUserPoints(Number(data.wallet?.balance || 0));
        if (data.pointPurchasePackages?.length) {
          setPointPackages(data.pointPurchasePackages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch points:", error);
    }
  }, []);

  const applySessionState = useCallback((nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession) {
      setDisplayName("");
      setUserRole("");
      setUserPoints(null);
      setSelectedPointPackageId(null);
      setIsPointModalOpen(false);
      return;
    }

    const fallbackName = getDisplayName(nextSession);
    if (fallbackName) {
      setDisplayName((prev) => prev || fallbackName);
    }

    setUserRole((prev) => getMetadataRole(nextSession) || prev);
  }, [getDisplayName, getMetadataRole]);

  const syncProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("full_name, role").eq("id", userId).maybeSingle();

    if (error) {
      console.warn("Header profile lookup failed:", error.message);
      return;
    }

    if (data?.full_name && data.full_name.trim()) {
      setDisplayName(data.full_name.trim());
    }

    setUserRole(typeof data?.role === "string" ? data.role : "");
  }, []);

  const shouldSyncProfile = useCallback((currentSession: Session | null) => Boolean(currentSession?.user?.id) && !getMetadataRole(currentSession), [getMetadataRole]);
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (session?.user?.id && userRole === "member") {
        void fetchPoints();
      } else if (userRole && userRole !== "member") {
        setUserPoints(null);
        setSelectedPointPackageId(null);
        setIsPointModalOpen(false);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [session, userRole, fetchPoints]);

  useEffect(() => {
    if (!session?.user?.id) {
      setUnreadCount(0);
      setNotifications({ trade: [], chat: [] });
      setNotificationOpen(false);
      return;
    }

    let active = true;

    const fetchUnreadNotificationCount = async () => {
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

    void fetchUnreadNotificationCount();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

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

  useEffect(() => {
    const checkHeaderStatus = () => {
      if (!isMainPage) {
        setIsScrolledPastHero(true);
        return;
      }

      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      setIsScrolledPastHero(currentScrollY > 80);
    };

    const disconnectObserver = () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };

    const setupObserver = () => {
      disconnectObserver();
      if (!isMainPage) return;

      const hero = document.getElementById("hero-section");
      if (!hero) {
        checkHeaderStatus();
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsScrolledPastHero(!entry.isIntersecting);
        },
        {
          rootMargin: "-80px 0px 0px 0px",
          threshold: 0,
        }
      );
      observerRef.current.observe(hero);
    };

    const handlePageShow = () => {
      checkHeaderStatus();
      requestAnimationFrame(() => setupObserver());
    };

    const handleScroll = () => checkHeaderStatus();
    const handleResize = () => {
      checkHeaderStatus();
      setupObserver();
    };

    checkHeaderStatus();
    requestAnimationFrame(() => setupObserver());

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      disconnectObserver();
    };
  }, [isMainPage, pathname]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      if (!mounted) return;
      applySessionState(nextSession);
      if (shouldSyncProfile(nextSession) && nextSession?.user?.id) {
        void syncProfile(nextSession.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySessionState(nextSession);
      if (shouldSyncProfile(nextSession) && nextSession?.user?.id) {
        void syncProfile(nextSession.user.id);
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "login") {
      window.history.replaceState({}, "", window.location.pathname);
      queueMicrotask(() => {
        setAuthMode("login");
        setIsAuthModalOpen(true);
      });
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySessionState, shouldSyncProfile, syncProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

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

  const openPointPage = () => {
    setIsPointModalOpen(false);
    setIsMobileMenuOpen(false);
    router.push(`/my-connect?tab=points${selectedPointPackage ? `&package=${encodeURIComponent(selectedPointPackage.id)}` : ""}`);
  };

  const selectedPointPackage = pointPackages.find((item) => item.id === selectedPointPackageId) || null;

  const handleNavClick = async (href: string) => {
    setIsMobileMenuOpen(false);
    if (href === "/my-connect") {
      router.push(getPortalHomeByRole(userRole === "master" || userRole === "partner" ? userRole : "member"));
      return;
    }

    if (href === "/master") {
      router.push(href);
      return;
    }

    const needAuth = ["/estimate"].includes(href);
    const {
      data: { session: liveSession },
    } = await supabase.auth.getSession();

    if (liveSession !== session) {
      applySessionState(liveSession);
      if (shouldSyncProfile(liveSession) && liveSession?.user?.id) {
        void syncProfile(liveSession.user.id);
      }
    }

    if (needAuth && !liveSession) {
      setAuthMode("login");
      setIsAuthModalOpen(true);
      return;
    }

    router.push(href);
  };

  const isWhiteHeader = !isMainPage || isScrolledPastHero;

  if (isMasterPage || isMyConnectPage || isPartnerDashboardPage) {
    return null;
  }

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${isWhiteHeader || isMobileMenuOpen ? "h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm" : "h-20 bg-transparent"
          }`}
      >
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image
              src={isWhiteHeader || isMobileMenuOpen ? "/image/doogo_logo_full.png" : "/image/doogo_logo_white.png"}
              alt="DOGO CONNECT"
              width={120}
              height={28}
              className="h-[30px] w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav
            className={`hidden items-center gap-10 text-[14px] font-semibold transition-colors duration-500 lg:flex ${isWhiteHeader ? "text-slate-600" : "text-white/85"
              }`}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href && item.href !== "/";

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={`cursor-pointer text-left transition-colors duration-300 ${isActive ? "text-[#0064FF]" : ""
                    } ${isWhiteHeader ? "hover:text-[#0064FF]" : "hover:text-white"} ${!isWhiteHeader && !isActive ? "opacity-90" : ""}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-4 lg:flex">
              {session ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavClick("/my-connect")}
                    className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isWhiteHeader
                      ? "text-slate-600 text-slate/70 hover:text-foreground hover:bg-gray-50"
                      : "text-white/70 text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    마이커넥트
                  </button>

                  <div className="relative" ref={notificationPanelRef}>
                    <button
                      type="button"
                      onClick={() => {
                        void handleNotificationToggle();
                      }}
                      className={`cursor-pointer relative p-2 rounded-md transition-colors ${isWhiteHeader
                        ? "text-slate-600 text-slate/70 hover:text-foreground hover:bg-gray-50"
                        : "text-white/70 text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      aria-label="알림"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 ? (
                        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[10px] font-bold leading-none text-white">
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
                                className={`relative min-w-[150px] px-3 pb-4 text-[17px] font-bold transition ${isActive ? "text-[#111827]" : "text-[#98a2b3]"}`}
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
                                        className={`flex w-full items-start gap-4 rounded-[18px] px-2 py-2 text-left transition ${item.isRead ? "opacity-80" : "bg-[#f8fbff]"}`}
                                      >
                                        <div
                                          className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[24px] font-bold text-white ${item.category === "trade" ? "bg-[#2f6bff]" : "bg-[#61c46e]"}`}
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

                  {userRole === "member" ? (
                    <button type="button" onClick={() => setIsPointModalOpen(true)} className="contents">
                      <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer">
                        <span className="text-blue-600 text-sm">⚡</span>

                        <span className="text-blue-700 text-xs font-bold">
                          {(userPoints ?? 0).toLocaleString()}P
                        </span>
                      </div>
                    </button>
                  ) : null}

                  <div
                    className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 rounded-md transition-colors duration-300 ${isWhiteHeader
                      ? "text-slate-600 text-slate/70 hover:text-foreground hover:bg-gray-50 group"
                      : "text-white/70 text-white/70 hover:text-white hover:bg-white/10 group"
                      }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0062df] text-[11px] font-semibold text-white">
                      {(displayName || getDisplayName(session))[0]}
                    </div>

                    <Link href="/my-connect">
                      <span className={`text-sm font-medium transition-colors duration-300 ${isWhiteHeader
                        ? "text-slate-600 group-hover:text-slate-900"
                        : "text-white/80 group-hover:text-white"
                        }`}>
                        {displayName || getDisplayName(session)}님
                      </span>
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isWhiteHeader
                      ? "text-slate-600 text-slate/70 hover:text-foreground hover:bg-gray-50"
                      : "text-white/70 text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setIsAuthModalOpen(true);
                    }}
                    className={`hidden cursor-pointer text-base font-medium transition-all duration-300 md:inline-flex px-4 py-2 rounded-lg 
                      ${isWhiteHeader
                        ? "text-slate-600 text-slate/70 hover:text-foreground hover:bg-gray-50"
                        : "text-white/70 text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                  >
                    로그인
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setIsAuthModalOpen(true);
                    }}
                    className="inline-flex h-10 cursor-pointer items-center rounded-[12px] px-5 text-sm font-semibold text-white bg-[#165cf9] hover:bg-[#165cf9]/80 transition-all duration-500"
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>

            {/* Hamburger Button */}
            <button
              type="button"
              className="lg:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="w-6 flex flex-col gap-1.5">
                <span className={`block h-0.5 w-full transition-all duration-300 ${isWhiteHeader || isMobileMenuOpen ? "bg-slate-900" : "bg-white"} ${isMobileMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
                <span className={`block h-0.5 w-full transition-all duration-300 ${isWhiteHeader || isMobileMenuOpen ? "bg-slate-900" : "bg-white"} ${isMobileMenuOpen ? "opacity-0" : ""}`} />
                <span className={`block h-0.5 w-full transition-all duration-300 ${isWhiteHeader || isMobileMenuOpen ? "bg-slate-900" : "bg-white"} ${isMobileMenuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`fixed inset-x-0 top-16 bottom-0 z-[49] bg-white transition-all duration-300 lg:hidden ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none -translate-y-4"
            }`}
        >
          <div className="flex flex-col p-6 gap-8 bg-white">
            <nav className="flex flex-col gap-6">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={`text-left text-lg font-semibold ${pathname === item.href ? "text-[#0064FF]" : "text-slate-800"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="h-px bg-slate-100" />
            <div className="flex flex-col gap-4">
              {session ? (
                <>
                  <div className="text-sm font-medium text-slate-500 mb-2">
                    {displayName || getDisplayName(session)}님 환영합니다
                  </div>
                  <button onClick={() => handleNavClick("/my-connect")} className="text-left text-base font-semibold text-slate-700">마이커넥트</button>
                  {userRole === "master" && <button onClick={() => handleNavClick("/master")} className="text-left text-base font-semibold text-slate-700">마스터 관리</button>}
                  <button onClick={handleLogout} className="mt-4 h-12 rounded-xl bg-[#0064FF] text-[#fff] font-semibold">로그아웃</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setAuthMode("login"); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="h-12 rounded-xl border border-slate-400 text-slate-900 font-semibold">로그인</button>
                  <button onClick={() => { setAuthMode("signup"); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="h-12 rounded-xl bg-[#0064FF] text-white font-semibold">회원가입</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {isPointModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 px-4" onClick={() => setIsPointModalOpen(false)}>
          <div
            className="w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#f1f3f5] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px]">⚡</span>
                  <h2 className="text-[18px] font-bold text-[#1f2937]">포인트 관리</h2>
                </div>
                <p className="mt-1 text-[14px] font-medium text-[#8a94a6]">포인트를 충전하거나 사용 내역을 확인하세요</p>
              </div>
              <button type="button" onClick={() => setIsPointModalOpen(false)} className="rounded-full p-1 text-[#98a2b3] transition hover:bg-gray-100 hover:text-[#4b5563]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-5 mt-5 rounded-[14px] border border-[#f3ecd1] bg-[#fffdf0] px-3 py-3">
              <p className="text-[12px] font-semibold text-[#2563eb]">현재 보유 포인트</p>
              <p className="mt-1 text-[28px] font-bold tracking-[0.04em] text-[#2563eb]">{(userPoints ?? 0).toLocaleString()}P</p>
              <p className="mt-1 text-[12px] font-medium text-[#60a5fa]">포인트 유효기간: 적립일로부터 1년</p>
            </div>

            <div className="mx-5 mt-5">
              <p className="text-[14px] font-semibold text-[#374151]">충전 패키지 선택</p>
              <div className="mt-3 space-y-3">
                {pointPackages.map((item, index) => {
                  const totalPoints = item.points + item.bonusPoints;
                  const isSelected = selectedPointPackageId === item.id;
                  const badge = index === 1 ? "BEST" : index === 2 ? "VIP" : "";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPointPackageId(item.id)}
                      className={`flex h-[68px] w-full items-center justify-between rounded-[14px] border-2 px-4 text-left transition hover:border-[#bfdbfe] ${isSelected ? "border-[#2563eb] bg-[#eff6ff]" : "border-[#eef0f3] bg-white"
                        }`}
                    >
                      <span className="flex items-center gap-3">
                        {isSelected ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563eb]">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-[#d1d5db]" />
                        )}
                        <span>
                          <span className="flex items-center gap-2">
                            <span className="text-[16px] font-bold text-[#374151]">{formatWonValue(item.amountKrw)}</span>
                            {badge ? (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge === "BEST" ? "bg-[#dbeafe] text-[#2563eb]" : "bg-[#f1e6ff] text-[#7c3aed]"
                                }`}>
                                {badge}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block text-[12px] font-medium text-[#8a94a6]">
                            {formatPointValue(totalPoints)} 충전 {item.bonusPoints ? <span className="font-bold text-[#16a34a]">(+{formatPointValue(item.bonusPoints)} 보너스!)</span> : null}
                          </span>
                        </span>
                      </span>
                      <span className="text-[14px] font-bold text-[#2563eb]">{formatPointValue(totalPoints)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-4 mt-4 rounded-[14px] bg-[#eef4ff] px-3 py-2">
              <p className="text-[12px] font-bold text-[#2563eb]">💡 포인트 안내</p>
              <ul className="mt-1.5 space-y-1 text-[12px] font-medium text-[#2563eb] list-disc ml-4">
                <li>제조 견적 의뢰 1건당 5,000P 차감</li>
                <li>추천 코드 입력 시 10,000P 무료 지급</li>
                <li>제조사 취소 시 포인트 자동 환불</li>
              </ul>
            </div>

            <button
              type="button"
              disabled={!selectedPointPackage}
              onClick={openPointPage}
              className={`mx-5 mb-5 mt-5 h-11 w-[calc(100%-2.5rem)] rounded-[14px] text-[14px] font-bold transition duration-300 disabled:cursor-not-allowed ${selectedPointPackage
                ? "bg-[#165cf9] text-white hover:bg-[#165cf9]/90"
                : "bg-[#f3f4f6] text-[#9ca3af]"
                }`}
            >
              {selectedPointPackage ? "선택한 패키지로 이동" : "패키지를 선택하세요"}
            </button>
          </div>
        </div>
      ) : null}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authMode} />
    </>
  );
}
