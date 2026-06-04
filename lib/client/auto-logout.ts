export const AUTO_LOGOUT_STORAGE_KEY = "doogo-connect:auto-logout-enabled";
export const AUTO_LOGOUT_EVENT_NAME = "doogo-connect:auto-logout-changed";
export const AUTO_LOGOUT_TIMEOUT_MS = 60 * 60 * 1000;

export function readAutoLogoutEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  const storedValue = window.localStorage.getItem(AUTO_LOGOUT_STORAGE_KEY);
  if (storedValue === null) {
    return true;
  }

  return storedValue !== "0";
}

export function writeAutoLogoutEnabled(nextValue: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTO_LOGOUT_STORAGE_KEY, nextValue ? "1" : "0");
  window.dispatchEvent(new CustomEvent(AUTO_LOGOUT_EVENT_NAME, { detail: nextValue }));
}
