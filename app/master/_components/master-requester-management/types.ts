"use client";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  referred_by_profile_id?: string | null;
  member_grade?: "student" | "general" | null;
  ban_type: "none" | "temporary" | "permanent" | null;
  ban_expires_at: string | null;
  ban_updated_at: string | null;
  ban_reason?: string | null;
};

export type WalletRow = {
  user_id: string;
  balance: number;
};

export type RequestRow = {
  client_id: string;
};

export type RequesterFilter = "all" | "active";

export type RequesterTableRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  partnerName: string;
  memberGrade: "student" | "general";
  points: number;
  completedCount: number;
  status: "활성" | "휴면" | "벤";
  banLabel: string | null;
  banExpiresAt: string | null;
  banReason: string | null;
};

export type BanAction = "7d" | "30d" | "permanent";

export type MonthlyBar = {
  label: string;
  count: number;
  height: number;
};
