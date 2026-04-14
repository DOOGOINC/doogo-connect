"use client";

import { useEffect, useState } from "react";
import { SupportChatSystem } from "@/app/my-connect/_components/SupportChatSystem";
import { supabase } from "@/lib/supabase";

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
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8F9FA]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0064FF] border-t-transparent" />
      </div>
    );
  }

  return <SupportChatSystem userId={userId} isMaster />;
}
