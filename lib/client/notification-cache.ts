"use client";

import { authFetch } from "@/lib/client/auth-fetch";

export type NotificationCategory = "trade" | "chat";

export type NotificationItem = {
  key: string;
  category: NotificationCategory;
  title: string;
  message: string;
  linkUrl: string | null;
  createdAt: string;
  isRead: boolean;
  avatarInitial?: string | null;
};

export type NotificationResponse = {
  trade?: NotificationItem[];
  chat?: NotificationItem[];
  unreadCount?: number;
  error?: string;
};

type NotificationSummaryResponse = {
  unreadCount?: number;
  error?: string;
};

const SUMMARY_TTL_MS = 15000;
const FULL_TTL_MS = 10000;

let summaryCache: { value: number; fetchedAt: number } | null = null;
let fullCache: { value: NotificationResponse; fetchedAt: number } | null = null;
let summaryInFlight: Promise<number> | null = null;
let fullInFlight: Promise<NotificationResponse> | null = null;

function isFresh(timestamp: number, ttlMs: number) {
  return Date.now() - timestamp < ttlMs;
}

export function invalidateNotificationCache() {
  summaryCache = null;
  fullCache = null;
}

export function primeNotificationCache(payload: NotificationResponse) {
  const normalized = {
    trade: payload.trade || [],
    chat: payload.chat || [],
    unreadCount: Number(payload.unreadCount || 0),
  };

  fullCache = {
    value: normalized,
    fetchedAt: Date.now(),
  };
  summaryCache = {
    value: normalized.unreadCount || 0,
    fetchedAt: Date.now(),
  };
}

export async function fetchNotificationSummaryCached(force = false) {
  if (!force && summaryCache && isFresh(summaryCache.fetchedAt, SUMMARY_TTL_MS)) {
    return summaryCache.value;
  }

  if (summaryInFlight) {
    return summaryInFlight;
  }

  summaryInFlight = (async () => {
    try {
      const response = await authFetch("/api/notifications?mode=summary");
      const payload = (await response.json()) as NotificationSummaryResponse;

      if (!response.ok) {
        throw new Error(payload.error || "failed_to_load_notifications");
      }

      const unreadCount = Number(payload.unreadCount || 0);
      summaryCache = {
        value: unreadCount,
        fetchedAt: Date.now(),
      };

      if (fullCache) {
        fullCache = {
          value: { ...fullCache.value, unreadCount },
          fetchedAt: fullCache.fetchedAt,
        };
      }

      return unreadCount;
    } finally {
      summaryInFlight = null;
    }
  })();

  return summaryInFlight;
}

export async function fetchNotificationsCached(force = false) {
  if (!force && fullCache && isFresh(fullCache.fetchedAt, FULL_TTL_MS)) {
    return fullCache.value;
  }

  if (fullInFlight) {
    return fullInFlight;
  }

  fullInFlight = (async () => {
    try {
      const response = await authFetch("/api/notifications");
      const payload = (await response.json()) as NotificationResponse;

      if (!response.ok) {
        throw new Error(payload.error || "failed_to_load_notifications");
      }

      const normalized: NotificationResponse = {
        trade: payload.trade || [],
        chat: payload.chat || [],
        unreadCount: Number(payload.unreadCount || 0),
      };

      primeNotificationCache(normalized);
      return normalized;
    } finally {
      fullInFlight = null;
    }
  })();

  return fullInFlight;
}
