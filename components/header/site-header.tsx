"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "커넥트 홈", href: "/" },
  { label: "제조 견적", href: "/estimate" },
  { label: "제조사 목록", href: "/manufacturers" },
  { label: "성공 사례", href: "/success-stories" },
  { label: "고객센터", href: "/support" },
];

export function SiteHeader() {
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState("");

  const pathname = usePathname();
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isMainPage = pathname === "/";

  const getDisplayName = (currentSession: Session | null) => {
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
  };

  const syncProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Header profile lookup failed:", error.message);
      return;
    }

    if (data?.full_name && data.full_name.trim()) {
      setSession((prev: Session | null) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                user_metadata: {
                  ...prev.user.user_metadata,
                  full_name: data.full_name,
                },
              },
            }
          : prev
      );
    }

    setUserRole(typeof data?.role === "string" ? data.role : "");
  };

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user?.id) {
        void syncProfile(session.user.id);
      } else {
        const metadataRole = session?.user?.user_metadata?.role;
        setUserRole(typeof metadataRole === "string" ? metadataRole : "");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        void syncProfile(nextSession.user.id);
      } else {
        const metadataRole = nextSession?.user?.user_metadata?.role;
        setUserRole(typeof metadataRole === "string" ? metadataRole : "");
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
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleNavClick = async (href: string) => {
    if (href === "/my-connect") {
      router.push(href);
      return;
    }

    const needAuth = ["/estimate", "/master"].includes(href);
    const {
      data: { session: liveSession },
    } = await supabase.auth.getSession();

    if (liveSession !== session) {
      setSession(liveSession);
    }

    if (needAuth && !liveSession) {
      setAuthMode("login");
      setIsAuthModalOpen(true);
      return;
    }

    router.push(href);
  };

  const isWhiteHeader = !isMainPage || isScrolledPastHero;

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          isWhiteHeader ? "h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm" : "h-20 bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image
              src={isWhiteHeader ? "/image/doogo_logo_full.png" : "/image/doogo_logo_white.png"}
              alt="DOGO CONNECT"
              width={140}
              height={40}
              priority
            />
          </Link>

          <nav
            className={`hidden items-center gap-10 text-[14px] font-semibold transition-colors duration-500 lg:flex ${
              isWhiteHeader ? "text-slate-700" : "text-white/95"
            }`}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href && item.href !== "/";

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={`cursor-pointer text-left transition-colors duration-300 ${
                    isActive ? "text-[#0064FF]" : ""
                  } ${isWhiteHeader ? "hover:text-[#0064FF]" : "hover:text-white"} ${!isWhiteHeader && !isActive ? "opacity-90" : ""}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                {userRole === "master" ? (
                  <button
                    type="button"
                    onClick={() => handleNavClick("/master")}
                    className={`mr-2 flex cursor-pointer items-center gap-1.5 text-sm font-semibold transition-colors duration-300 ${
                      isWhiteHeader ? "text-slate-700 hover:text-[#0064FF]" : "text-white/90 hover:text-white"
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>마스터</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleNavClick("/my-connect")}
                  className={`mr-2 flex cursor-pointer items-center gap-1.5 text-sm font-semibold transition-colors duration-300 ${
                    isWhiteHeader ? "text-slate-700 hover:text-[#0064FF]" : "text-white/90 hover:text-white"
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>마이커넥트</span>
                </button>

                <span className={`text-sm font-medium ${isWhiteHeader ? "text-slate-600" : "text-white/80"}`}>
                  {getDisplayName(session)}님
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className={`inline-flex cursor-pointer items-center rounded-full px-5 text-sm font-semibold transition-all duration-500 ${
                    isWhiteHeader ? "h-10 bg-slate-950 text-white" : "h-10 bg-white text-slate-950"
                  }`}
                >
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
                  className={`hidden cursor-pointer text-base font-medium transition-colors duration-500 md:inline-flex ${
                    isWhiteHeader ? "text-slate-600" : "text-white/80"
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
                  className={`inline-flex cursor-pointer items-center rounded-full px-5 text-sm font-semibold transition-all duration-500 ${
                    isWhiteHeader ? "h-10 bg-slate-950 text-white" : "h-10 bg-white text-slate-950"
                  }`}
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authMode} />
    </>
  );
}
