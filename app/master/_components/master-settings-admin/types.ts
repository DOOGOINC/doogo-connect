"use client";

export type PlatformSettings = {
  platformName: string;
  commissionRatePercent: number;
  studentDiscountPercent: number;
  referrerRewardPoints: number;
  refereeRewardPoints: number;
  rfqRequestCostPoints: number;
  pointPurchasePackages: PointPackage[];
};

export type PointPackage = {
  id: string;
  label: string;
  points: number;
  bonusPoints: number;
  amountKrw: number;
};

export type SettingsResponse = {
  settings: PlatformSettings;
  commissionHistory?: CommissionHistory[];
};

export type PopupSettings = {
  id: number;
  enabled: boolean;
  title: string;
  content: string;
  featureTitle: string;
  featureDescription: string;
  eventTitle: string;
  eventDescription: string;
  buttonLabel: string;
  buttonUrl: string;
  updatedAt: string | null;
};

export type PopupSettingsResponse = {
  settings: PopupSettings;
  error?: string;
};

export type CommissionHistory = {
  id: string;
  previousRatePercent: number;
  nextRatePercent: number;
  changedBy: string | null;
  createdAt: string;
};

export type SettingsTab = "platform" | "popup" | "ai-chatbot" | "event" | "manager";

export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: "platform", label: "플랫폼 기본 설정", icon: "🔧" },
  { id: "popup", label: "팝업 설정", icon: "💬" },
  { id: "ai-chatbot", label: "AI 상담 봇", icon: "🤖" },
  { id: "event", label: "이벤트 설정", icon: "🎉" },
];
