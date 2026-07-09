"use client";

const IMPERSONATION_STORAGE_KEY = "master_impersonation_user_id";

function normalizeUserId(value: string | null | undefined) {
  const trimmed = value?.trim() || "";
  return trimmed || null;
}

export function getStoredImpersonationUserId() {
  if (typeof window === "undefined") return null;
  return normalizeUserId(window.sessionStorage.getItem(IMPERSONATION_STORAGE_KEY));
}

export function setStoredImpersonationUserId(userId: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeUserId(userId);
  if (!normalized) {
    window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, normalized);
}

export function clearStoredImpersonationUserId() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
}
