"use client";

import { DEFAULT_REFEREE_REWARD_POINTS } from "@/lib/points/constants";

export function formatRewardPoints(value: number) {
  return `${Number(value || 0).toLocaleString()}P`;
}

export async function fetchRefereeRewardPoints(signal?: AbortSignal) {
  try {
    const response = await fetch("/api/point-settings/public", {
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      return DEFAULT_REFEREE_REWARD_POINTS;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return DEFAULT_REFEREE_REWARD_POINTS;
    }

    const payload = (await response.json()) as { refereeRewardPoints?: number };
    const points = Number(payload.refereeRewardPoints);

    if (!Number.isFinite(points) || points < 0) {
      return DEFAULT_REFEREE_REWARD_POINTS;
    }

    return Math.floor(points);
  } catch {
    return DEFAULT_REFEREE_REWARD_POINTS;
  }
}
