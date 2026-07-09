"use client";

import { getStoredImpersonationUserId } from "@/lib/client/impersonation";
import { supabase } from "@/lib/supabase";

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const impersonationUserId = getStoredImpersonationUserId();
  if (impersonationUserId) {
    headers.set("X-Impersonate-User-Id", impersonationUserId);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
