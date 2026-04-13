"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const TIMEOUT_DURATION = 3 * 60 * 60 * 1000; // 3 hours

export function SessionTimeout() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, TIMEOUT_DURATION);
  };

  const handleLogout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  useEffect(() => {
    // Initial timer set
    resetTimer();

    // Events to track activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    
    const activityHandler = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, activityHandler);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }, []);

  return null;
}
