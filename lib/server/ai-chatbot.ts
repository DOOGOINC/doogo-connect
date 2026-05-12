import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_CHATBOT_SETTINGS_ROW_ID = 1;

export type AiChatbotSettings = {
  id: number;
  enabled: boolean;
  widgetTitle: string;
  welcomeMessage: string;
  inputPlaceholder: string;
  systemPrompt: string;
  fallbackMessage: string;
  handoffMessage: string;
  handoffButtonLabel: string;
  handoffButtonUrl: string;
  blockedTopics: string[];
  excludedPaths: string[];
  model: string;
  temperature: number;
  maxContextMessages: number;
  updatedAt: string | null;
};

type AiChatbotSettingsRow = {
  id: number;
  enabled: boolean | null;
  config: Record<string, unknown> | null;
  updated_at: string | null;
};

export const DEFAULT_AI_CHATBOT_SETTINGS: AiChatbotSettings = {
  id: AI_CHATBOT_SETTINGS_ROW_ID,
  enabled: true,
  widgetTitle: "AI 상담",
  welcomeMessage: "안녕하세요. DOOGO CONNECT AI 상담 봇입니다. 궁금한 내용을 편하게 물어보세요.",
  inputPlaceholder: "질문을 입력해 주세요",
  systemPrompt:
    "당신은 DOOGO CONNECT 상담 도우미입니다. 한국어로 짧고 정확하게 답변하세요. 모르면 추측하지 말고 고객센터나 1:1 채팅으로 안내하세요.",
  fallbackMessage: "지금은 답변이 지연되고 있습니다. 잠시 후 다시 시도하거나 고객센터를 이용해 주세요.",
  handoffMessage: "정확한 확인이 필요하면 고객센터 또는 1:1 채팅으로 연결해 주세요.",
  handoffButtonLabel: "고객센터로 이동",
  handoffButtonUrl: "/my-connect?tab=support",
  blockedTopics: [],
  excludedPaths: [],
  model: "gemini-2.5-flash-lite",
  temperature: 0.3,
  maxContextMessages: 8,
  updatedAt: null,
};

function isMissingRelationError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01");
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

function normalizeStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}

function toTemperature(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, Number(numeric.toFixed(2))));
}

function toContextCount(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(2, Math.floor(numeric));
}

function mapSettingsRow(row: AiChatbotSettingsRow | null | undefined): AiChatbotSettings {
  const config = row?.config || {};

  return {
    id: row?.id || AI_CHATBOT_SETTINGS_ROW_ID,
    enabled: typeof config.enabled === "boolean" ? config.enabled : DEFAULT_AI_CHATBOT_SETTINGS.enabled,
    widgetTitle: trimText(config.widgetTitle, DEFAULT_AI_CHATBOT_SETTINGS.widgetTitle, 30),
    welcomeMessage: trimText(config.welcomeMessage, DEFAULT_AI_CHATBOT_SETTINGS.welcomeMessage, 500),
    inputPlaceholder: trimText(config.inputPlaceholder, DEFAULT_AI_CHATBOT_SETTINGS.inputPlaceholder, 80),
    systemPrompt: trimText(config.systemPrompt, DEFAULT_AI_CHATBOT_SETTINGS.systemPrompt, 3000),
    fallbackMessage: trimText(config.fallbackMessage, DEFAULT_AI_CHATBOT_SETTINGS.fallbackMessage, 500),
    handoffMessage: trimText(config.handoffMessage, DEFAULT_AI_CHATBOT_SETTINGS.handoffMessage, 500),
    handoffButtonLabel: trimText(config.handoffButtonLabel, DEFAULT_AI_CHATBOT_SETTINGS.handoffButtonLabel, 30),
    handoffButtonUrl: normalizeUrl(config.handoffButtonUrl, DEFAULT_AI_CHATBOT_SETTINGS.handoffButtonUrl),
    blockedTopics: normalizeStringArray(config.blockedTopics, 50, 120),
    excludedPaths: normalizeStringArray(config.excludedPaths, 50, 200),
    model: trimText(config.model, DEFAULT_AI_CHATBOT_SETTINGS.model, 80),
    temperature: toTemperature(config.temperature, DEFAULT_AI_CHATBOT_SETTINGS.temperature),
    maxContextMessages: toContextCount(config.maxContextMessages, DEFAULT_AI_CHATBOT_SETTINGS.maxContextMessages),
    updatedAt: row?.updated_at || null,
  };
}

export function normalizeAiChatbotInput(value: unknown): Omit<AiChatbotSettings, "id" | "updatedAt"> {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    enabled: Boolean(row.enabled),
    widgetTitle: trimText(row.widgetTitle, DEFAULT_AI_CHATBOT_SETTINGS.widgetTitle, 30),
    welcomeMessage: trimText(row.welcomeMessage, DEFAULT_AI_CHATBOT_SETTINGS.welcomeMessage, 500),
    inputPlaceholder: trimText(row.inputPlaceholder, DEFAULT_AI_CHATBOT_SETTINGS.inputPlaceholder, 80),
    systemPrompt: trimText(row.systemPrompt, DEFAULT_AI_CHATBOT_SETTINGS.systemPrompt, 3000),
    fallbackMessage: trimText(row.fallbackMessage, DEFAULT_AI_CHATBOT_SETTINGS.fallbackMessage, 500),
    handoffMessage: trimText(row.handoffMessage, DEFAULT_AI_CHATBOT_SETTINGS.handoffMessage, 500),
    handoffButtonLabel: trimText(row.handoffButtonLabel, DEFAULT_AI_CHATBOT_SETTINGS.handoffButtonLabel, 30),
    handoffButtonUrl: normalizeUrl(row.handoffButtonUrl, DEFAULT_AI_CHATBOT_SETTINGS.handoffButtonUrl),
    blockedTopics: normalizeStringArray(row.blockedTopics, 50, 120),
    excludedPaths: normalizeStringArray(row.excludedPaths, 50, 200),
    model: trimText(row.model, DEFAULT_AI_CHATBOT_SETTINGS.model, 80),
    temperature: toTemperature(row.temperature, DEFAULT_AI_CHATBOT_SETTINGS.temperature),
    maxContextMessages: toContextCount(row.maxContextMessages, DEFAULT_AI_CHATBOT_SETTINGS.maxContextMessages),
  };
}

export async function getAiChatbotSettings(supabase: SupabaseClient, options?: { allowMissingTable?: boolean }) {
  const { data, error } = await supabase
    .from("ai_chatbot_settings")
    .select("id, enabled, config, updated_at")
    .eq("id", AI_CHATBOT_SETTINGS_ROW_ID)
    .maybeSingle<AiChatbotSettingsRow>();

  if (error) {
    if (options?.allowMissingTable && isMissingRelationError(error)) {
      return DEFAULT_AI_CHATBOT_SETTINGS;
    }
    throw new Error(error.message);
  }

  return mapSettingsRow(data);
}

export function toPublicAiChatbotSettings(settings: AiChatbotSettings) {
  return {
    id: settings.id,
    enabled: settings.enabled,
    widgetTitle: settings.widgetTitle,
    welcomeMessage: settings.welcomeMessage,
    inputPlaceholder: settings.inputPlaceholder,
    fallbackMessage: settings.fallbackMessage,
    handoffMessage: settings.handoffMessage,
    handoffButtonLabel: settings.handoffButtonLabel,
    handoffButtonUrl: settings.handoffButtonUrl,
    excludedPaths: settings.excludedPaths,
    maxContextMessages: settings.maxContextMessages,
    updatedAt: settings.updatedAt,
  };
}
