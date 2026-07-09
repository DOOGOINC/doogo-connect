"use client";

import type { MonthlyBar, ProfileRow, RequesterTableRow } from "./types";

export const FILTERS = [
  { id: "all", label: "전체" },
  { id: "active", label: "활성 회원(거래완료)" },
] as const;

export const PAGE_SIZE = 10;

export function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatPoints(value: number) {
  return `${value.toLocaleString("ko-KR")}P`;
}

function getMonthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

function getRecentMonthSeeds(baseDate: Date, count: number) {
  return Array.from({ length: count }, (_, index) => new Date(baseDate.getFullYear(), baseDate.getMonth() - (count - 1 - index), 1));
}

export function buildMonthlyBars(requesters: RequesterTableRow[], baseDate: Date, count: number): MonthlyBar[] {
  const seeds = getRecentMonthSeeds(baseDate, count);
  const counts = seeds.map((seed) =>
    requesters.filter((requester) => {
      const createdAt = new Date(requester.createdAt);
      return createdAt.getFullYear() === seed.getFullYear() && createdAt.getMonth() === seed.getMonth();
    }).length
  );
  const max = Math.max(...counts, 1);

  return seeds.map((seed, index) => ({
    label: index === seeds.length - 1 ? `${getMonthLabel(seed)}(현재)` : getMonthLabel(seed),
    count: counts[index],
    height: counts[index] > 0 ? Math.max(12, Math.round((counts[index] / max) * 58)) : 0,
  }));
}

export function isRequesterBanned(profile: Pick<ProfileRow, "ban_type" | "ban_expires_at">) {
  if (profile.ban_type === "permanent") return true;
  if (profile.ban_type === "temporary" && profile.ban_expires_at) {
    return new Date(profile.ban_expires_at).getTime() > Date.now();
  }
  return false;
}

export function getBanLabel(profile: Pick<ProfileRow, "ban_type" | "ban_expires_at">) {
  if (profile.ban_type === "permanent") {
    return "영구 차단";
  }

  if (profile.ban_type === "temporary" && profile.ban_expires_at) {
    const expiresAt = new Date(profile.ban_expires_at);
    if (expiresAt.getTime() > Date.now()) {
      return `${formatDate(profile.ban_expires_at)}까지 정지`;
    }
  }

  return null;
}
