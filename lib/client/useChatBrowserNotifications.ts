"use client";

import { useEffect } from "react";
import { authFetch } from "@/lib/client/auth-fetch";

type NotificationItem = {
  key: string;
  title: string;
  message: string;
  linkUrl: string | null;
  createdAt: string;
  isRead: boolean;
};

type NotificationResponse = {
  chat?: NotificationItem[];
  unreadCount?: number;
  error?: string;
};

const POLL_INTERVAL_MS = 30000;
let pollingSubscriberCount = 0;
let pollingIntervalId: number | null = null;
let pollingInFlight: Promise<void> | null = null;
let knownNotificationKeys = new Set<string>();
let hasBootstrappedNotifications = false;

function getCurrentRelativeUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

async function fetchSharedChatNotifications(isActive: () => boolean) {
  if (pollingInFlight) {
    return pollingInFlight;
  }

  pollingInFlight = (async () => {
    try {
      const response = await authFetch("/api/notifications");
      const payload = (await response.json()) as NotificationResponse;

      if (!response.ok || !isActive()) {
        return;
      }

      const chatItems = (payload.chat || []).filter((item) => item.key && !item.isRead);

      if (!hasBootstrappedNotifications) {
        knownNotificationKeys = new Set(chatItems.map((item) => item.key));
        hasBootstrappedNotifications = true;
        return;
      }

      const nextKeys = new Set(knownNotificationKeys);
      const currentRelativeUrl = getCurrentRelativeUrl();
      const canNotify = Notification.permission === "granted";

      for (const item of chatItems) {
        if (nextKeys.has(item.key)) {
          continue;
        }

        nextKeys.add(item.key);

        const isViewingSameChat = Boolean(item.linkUrl) && item.linkUrl === currentRelativeUrl;
        if (!canNotify || isViewingSameChat) {
          continue;
        }

        const notification = new Notification(item.title || "梨꾪똿 ?뚮┝", {
          body: item.message,
          tag: item.key,
        });

        notification.onclick = () => {
          window.focus();
          if (item.linkUrl) {
            window.location.href = item.linkUrl;
          }
          notification.close();
        };
      }

      knownNotificationKeys = nextKeys;
    } catch {
      return;
    } finally {
      pollingInFlight = null;
    }
  })();

  return pollingInFlight;
}

export function useChatBrowserNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    let active = true;
    pollingSubscriberCount += 1;

    if (pollingSubscriberCount === 1) {
      void fetchSharedChatNotifications(() => active && pollingSubscriberCount > 0);
      pollingIntervalId = window.setInterval(() => {
        void fetchSharedChatNotifications(() => active && pollingSubscriberCount > 0);
      }, POLL_INTERVAL_MS);
    }

    return () => {
      active = false;
      pollingSubscriberCount = Math.max(0, pollingSubscriberCount - 1);
      if (pollingSubscriberCount === 0 && pollingIntervalId !== null) {
        window.clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
    };
  }, [enabled]);
}
