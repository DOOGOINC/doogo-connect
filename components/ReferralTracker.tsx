"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureReferralFromLocation } from "@/utils/referral";

export function ReferralTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureReferralFromLocation(searchParams.toString() ? `?${searchParams.toString()}` : "");
  }, [pathname, searchParams]);

  return null;
}
