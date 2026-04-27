import type { SupabaseClient } from "@supabase/supabase-js";

export const POPUP_SETTINGS_ROW_ID = 1;

export type ClientPopupSettings = {
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

type PopupSettingsRow = {
  id: number;
  enabled: boolean | null;
  title: string | null;
  content: string | null;
  feature_title?: string | null;
  feature_description?: string | null;
  event_title?: string | null;
  event_description?: string | null;
  button_label: string | null;
  button_url: string | null;
  updated_at: string | null;
};

export const DEFAULT_POPUP_SETTINGS: ClientPopupSettings = {
  id: POPUP_SETTINGS_ROW_ID,
  enabled: false,
  title: "소량 OEM, 두고커넥트로 시작하세요!",
  content: "50개부터 시작하는 나만의 건강식품 브랜드",
  featureTitle: "1분 견적 시스템",
  featureDescription: "제조사 선택 → 수량 입력 → 즉시 견적 확인",
  eventTitle: "신규 이벤트: 첫 의뢰 포인트 2배!",
  eventDescription: "기간: ~2026.04.30 | 5,000P 의뢰 → 10,000P 적립",
  buttonLabel: "자세히보기",
  buttonUrl: "/estimate",
  updatedAt: null,
};

function isMissingRelationError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "42P01"
  );
}

function isUndefinedColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "42703"
  );
}

function trimText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed.slice(0, 500);
  }
  return fallback;
}

export function normalizePopupInput(value: unknown): Omit<ClientPopupSettings, "id" | "updatedAt"> {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    enabled: Boolean(row.enabled),
    title: trimText(row.title, DEFAULT_POPUP_SETTINGS.title, 80),
    content: trimText(row.content, DEFAULT_POPUP_SETTINGS.content, 700),
    featureTitle: trimText(row.featureTitle, DEFAULT_POPUP_SETTINGS.featureTitle, 80),
    featureDescription: trimText(row.featureDescription, DEFAULT_POPUP_SETTINGS.featureDescription, 160),
    eventTitle: trimText(row.eventTitle, DEFAULT_POPUP_SETTINGS.eventTitle, 80),
    eventDescription: trimText(row.eventDescription, DEFAULT_POPUP_SETTINGS.eventDescription, 160),
    buttonLabel: trimText(row.buttonLabel, DEFAULT_POPUP_SETTINGS.buttonLabel, 30),
    buttonUrl: normalizeUrl(row.buttonUrl, DEFAULT_POPUP_SETTINGS.buttonUrl),
  };
}

function mapPopupSettings(row: PopupSettingsRow | null | undefined): ClientPopupSettings {
  if (!row) return DEFAULT_POPUP_SETTINGS;

  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    title: row.title?.trim() || DEFAULT_POPUP_SETTINGS.title,
    content: row.content?.trim() || DEFAULT_POPUP_SETTINGS.content,
    featureTitle: row.feature_title?.trim() || DEFAULT_POPUP_SETTINGS.featureTitle,
    featureDescription: row.feature_description?.trim() || DEFAULT_POPUP_SETTINGS.featureDescription,
    eventTitle: row.event_title?.trim() || DEFAULT_POPUP_SETTINGS.eventTitle,
    eventDescription: row.event_description?.trim() || DEFAULT_POPUP_SETTINGS.eventDescription,
    buttonLabel: row.button_label?.trim() || DEFAULT_POPUP_SETTINGS.buttonLabel,
    buttonUrl: row.button_url?.trim() || "",
    updatedAt: row.updated_at,
  };
}

export async function getPopupSettings(supabase: SupabaseClient, options?: { allowMissingTable?: boolean }) {
  const { data, error } = await supabase
    .from("platform_popup_settings")
    .select("id, enabled, title, content, feature_title, feature_description, event_title, event_description, button_label, button_url, updated_at")
    .eq("id", POPUP_SETTINGS_ROW_ID)
    .maybeSingle<PopupSettingsRow>();

  if (error) {
    if (options?.allowMissingTable && isMissingRelationError(error)) {
      return DEFAULT_POPUP_SETTINGS;
    }
    if (isUndefinedColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("platform_popup_settings")
        .select("id, enabled, title, content, button_label, button_url, updated_at")
        .eq("id", POPUP_SETTINGS_ROW_ID)
        .maybeSingle<PopupSettingsRow>();

      if (legacyError) {
        throw new Error(legacyError.message);
      }

      return mapPopupSettings(legacyData);
    }
    throw new Error(error.message);
  }

  return mapPopupSettings(data);
}
