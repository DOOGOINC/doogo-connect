"use client";

import { useEffect, useState } from "react";
import { SupportChatSystem } from "@/app/my-connect/_components/SupportChatSystem";
import { supabase } from "@/lib/supabase";
import { MasterLoadingState } from "./MasterLoadingState";

export function SupportCenterAdmin() {
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };

    void loadSession();
  }, []);

  if (!userId) {
    return <MasterLoadingState />;
  }

  return <SupportChatSystem userId={userId} isMaster />;
}
