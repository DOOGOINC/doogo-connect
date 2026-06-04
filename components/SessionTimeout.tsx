"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AUTO_LOGOUT_EVENT_NAME,
  AUTO_LOGOUT_TIMEOUT_MS,
  readAutoLogoutEnabled,
} from "@/lib/client/auto-logout";

export function SessionTimeout() {
  const [enabled, setEnabled] = useState(() => readAutoLogoutEnabled());
  const timeoutRef = useRef<number | null>(null);
  const signedOutRef = useRef(false);

  useEffect(() => {
    const handleStorageSync = () => {
      setEnabled(readAutoLogoutEnabled());
    };

    const handleCustomSync = () => {
      setEnabled(readAutoLogoutEnabled());
    };

    window.addEventListener("storage", handleStorageSync);
    window.addEventListener(AUTO_LOGOUT_EVENT_NAME, handleCustomSync);

    return () => {
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener(AUTO_LOGOUT_EVENT_NAME, handleCustomSync);
    };
  }, []);

  useEffect(() => {
    let isDisposed = false;

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const startTimer = async () => {
      clearTimer();

      if (!enabled || signedOutRef.current) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isDisposed || !session) {
        return;
      }

      timeoutRef.current = window.setTimeout(async () => {
        if (signedOutRef.current) {
          return;
        }

        signedOutRef.current = true;
        clearTimer();
        await supabase.auth.signOut();
        window.alert("세션이 만료되어 자동 로그아웃되었습니다.");
        window.location.href = "/?auth=login";
      }, AUTO_LOGOUT_TIMEOUT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => {
      void startTimer();
    };

    void startTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        signedOutRef.current = false;
        clearTimer();
        return;
      }

      signedOutRef.current = false;
      void startTimer();
    });

    return () => {
      isDisposed = true;
      clearTimer();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      subscription.unsubscribe();
    };
  }, [enabled]);

  return null;
}
