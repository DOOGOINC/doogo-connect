"use client";

export const REFERRAL_COOKIE_KEY = "dg_referral_code";
export const REFERRAL_STORAGE_KEY = "dg_referral_code";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const REFERRAL_PARAM_KEYS = ["ref", "referral", "referralCode"] as const;

export function sanitizeReferralCode(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return normalized || null;
}

export function getReferralCodeFromSearch(search: string) {
  const searchParams = new URLSearchParams(search);

  for (const key of REFERRAL_PARAM_KEYS) {
    const value = sanitizeReferralCode(searchParams.get(key));
    if (value) return value;
  }

  return null;
}

export function persistReferralCode(code: string) {
  const normalized = sanitizeReferralCode(code);
  if (!normalized || typeof document === "undefined") return null;

  const expires = new Date(Date.now() + REFERRAL_COOKIE_MAX_AGE * 1000).toUTCString();
  document.cookie = `${REFERRAL_COOKIE_KEY}=${encodeURIComponent(normalized)}; expires=${expires}; path=/; samesite=lax`;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
  }

  return normalized;
}

export function captureReferralFromLocation(search = typeof window !== "undefined" ? window.location.search : "") {
  const referralCode = getReferralCodeFromSearch(search);
  if (!referralCode) return null;
  return persistReferralCode(referralCode);
}

export function getStoredReferralCode() {
  if (typeof document === "undefined") return null;

  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE_KEY}=([^;]+)`));
  const cookieValue = sanitizeReferralCode(cookieMatch ? decodeURIComponent(cookieMatch[1]) : null);
  if (cookieValue) return cookieValue;

  if (typeof window === "undefined") return null;
  return sanitizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY));
}

export function clearStoredReferralCode() {
  if (typeof document !== "undefined") {
    document.cookie = `${REFERRAL_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax`;
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
  }
}

export function buildReferralLink(referralCode: string, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const normalized = sanitizeReferralCode(referralCode);
  if (!normalized || !origin) return "";
  return `${origin}/?ref=${encodeURIComponent(normalized)}`;
}
