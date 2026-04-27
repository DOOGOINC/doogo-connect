"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { AuthModal } from "@/components/AuthModal";
import { getPortalHomeByRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { LogOut, X, Check } from "lucide-react";
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

  const pathname = usePathname();
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isMainPage = pathname === "/";
  const isMasterPage = pathname?.startsWith("/master");
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

    const metadataRole = nextSession.user?.user_metadata?.role;
    setUserRole((prev) => (typeof metadataRole === "string" && metadataRole.trim() ? metadataRole : prev));
  }, [getDisplayName]);

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
      if (nextSession?.user?.id) {
        void syncProfile(nextSession.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySessionState(nextSession);
      if (nextSession?.user?.id) {
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
  }, [applySessionState, syncProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
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
      if (liveSession?.user?.id) {
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

  if (isMasterPage || isPartnerDashboardPage) {
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

                  <button
                    type="button"
                    className={`cursor-pointer relative p-2 rounded-md transition-colors ${isWhiteHeader
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
                      className="lucide lucide-bell w-4 h-4"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                    </svg>

                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>

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

                    <span className={`text-sm font-medium transition-colors duration-300 ${isWhiteHeader
                      ? "text-slate-600 group-hover:text-slate-900"
                      : "text-white/80 group-hover:text-white"
                      }`}>
                      {displayName || getDisplayName(session)}님
                    </span>
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
