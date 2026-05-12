"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

type AiChatbotSettings = {
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

type AiChatbotSettingsResponse = {
  settings?: AiChatbotSettings;
  error?: string;
};

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MasterAiChatbotSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<AiChatbotSettings | null>(null);
  const [blockedTopicsText, setBlockedTopicsText] = useState("");
  const [excludedPathsText, setExcludedPathsText] = useState("");

  const updateSettings = (patch: Partial<AiChatbotSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await authFetch("/api/admin/ai-chatbot-settings");
        const payload = (await response.json()) as AiChatbotSettingsResponse;
        if (!response.ok || !payload.settings) {
          throw new Error(payload.error || "AI 설정을 불러오지 못했습니다.");
        }

        setSettings(payload.settings);
        setBlockedTopicsText((payload.settings.blockedTopics || []).join("\n"));
        setExcludedPathsText((payload.settings.excludedPaths || []).join("\n"));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "AI 설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await authFetch("/api/admin/ai-chatbot-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...settings,
          blockedTopics: parseLines(blockedTopicsText),
          excludedPaths: parseLines(excludedPathsText),
        }),
      });
      const payload = (await response.json()) as AiChatbotSettingsResponse;
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "AI 설정 저장에 실패했습니다.");
      }

      setSettings(payload.settings);
      setBlockedTopicsText((payload.settings.blockedTopics || []).join("\n"));
      setExcludedPathsText((payload.settings.excludedPaths || []).join("\n"));
      setMessage("AI 설정이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "AI 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-[13px] font-bold text-[#6B7280]">AI 설정을 불러오는 중입니다.</p>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-[13px] font-bold text-[#DC2626]">{error || "AI 설정을 불러오지 못했습니다."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-[#111827]">AI 상담 봇</h2>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <a
          href="https://aistudio.google.com/usage?project=gen-lang-client-0862773259&timeRange=last-hour"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#D6E4FF] bg-[#EFF6FF] px-4 text-[13px] font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
        >
          재미나이 API 사용량 보러가기
        </a>
      <a
        href="https://github.com/DOOGOINC/doogo-connect/tree/main/knowledge/ai-chatbot"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white px-4 text-[13px] font-bold text-[#374151] transition hover:bg-[#F9FAFB]"
      >
        md 파일 업로드 하러가기
      </a>
      <a
        href="https://www.notion.so/DOOGO-CONNECT-MD-35e6dc24e345809496e0f423f7cedb93"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex text-[12px] font-medium text-[#2563EB] underline underline-offset-2"
      >
        업로드 방법 보러가기
      </a>

      </div>
      <div className="space-y-5">
        <label className="flex items-center justify-between rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3">
          <span>
            <span className="block text-[13px] font-bold text-[#374151]">전역 챗봇 노출</span>
            <span className="mt-1 block text-[12px] font-medium text-[#9CA3AF]">모든 페이지 우측 하단 플로팅 챗봇을 켜고 끕니다.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => updateSettings({ enabled: event.target.checked })}
            className="h-5 w-5 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">위젯 제목</span>
            <input
              value={settings.widgetTitle}
              onChange={(event) => updateSettings({ widgetTitle: event.target.value })}
              maxLength={30}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">입력창 안내 문구</span>
            <input
              value={settings.inputPlaceholder}
              onChange={(event) => updateSettings({ inputPlaceholder: event.target.value })}
              maxLength={80}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">환영 문구</span>
          <textarea
            value={settings.welcomeMessage}
            onChange={(event) => updateSettings({ welcomeMessage: event.target.value })}
            rows={3}
            className="mt-2 w-full rounded-[14px] border border-[#E5E7EB] px-5 py-3 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-[#374151]">시스템 프롬프트</span>
          <textarea
            value={settings.systemPrompt}
            onChange={(event) =>
              updateSettings({
                systemPrompt: event.target.value.slice(0, 250),
              })
            }
            maxLength={500}
            rows={6}
            className="mt-2 w-full rounded-[14px] border border-[#E5E7EB] px-5 py-3 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">실패 시 안내 문구</span>
            <textarea
              value={settings.fallbackMessage}
              onChange={(event) => updateSettings({ fallbackMessage: event.target.value })}
              rows={4}
              className="mt-2 w-full rounded-[14px] border border-[#E5E7EB] px-5 py-3 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">상담 전환 문구</span>
            <textarea
              value={settings.handoffMessage}
              onChange={(event) => updateSettings({ handoffMessage: event.target.value })}
              rows={4}
              className="mt-2 w-full rounded-[14px] border border-[#E5E7EB] px-5 py-3 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">상담 연결 버튼 문구</span>
            <input
              value={settings.handoffButtonLabel}
              onChange={(event) => updateSettings({ handoffButtonLabel: event.target.value })}
              maxLength={30}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">상담 연결 링크</span>
            <input
              value={settings.handoffButtonUrl}
              onChange={(event) => updateSettings({ handoffButtonUrl: event.target.value })}
              placeholder="/my-connect?tab=support"
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">모델명</span>
            <input
              value={settings.model}
              onChange={(event) => updateSettings({ model: event.target.value })}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">Temperature</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={settings.temperature}
              onChange={(event) => updateSettings({ temperature: Number(event.target.value) })}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">컨텍스트 메시지 수</span>
            <input
              type="number"
              min={2}
              max={12}
              step={1}
              value={settings.maxContextMessages}
              onChange={(event) => updateSettings({ maxContextMessages: Number(event.target.value) })}
              className="mt-2 h-10 w-full rounded-[14px] border border-[#E5E7EB] px-5 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">금지 주제</span>
            <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">한 줄에 하나씩 입력하면 해당 주제는 상담 전환 문구로 우회합니다.</p>
            <textarea
              value={blockedTopicsText}
              onChange={(event) => setBlockedTopicsText(event.target.value)}
              rows={8}
              className="mt-2 w-full rounded-[14px] border border-[#E5E7EB] px-5 py-3 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-[#374151]">제외할 경로</span>
            <p className="mt-1 text-[12px] font-medium text-[#9CA3AF]">한 줄에 하나씩 입력하면 해당 prefix 경로에서는 챗봇이 숨겨집니다.</p>
            <textarea
              value={excludedPathsText}
              onChange={(event) => setExcludedPathsText(event.target.value)}
              rows={8}
              className="mt-2 w-full rounded-[14px] border border-[#E5E7EB] px-5 py-3 text-[13px] font-medium text-[#111827] outline-none focus:border-[#2563EB]"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex h-10 items-center justify-center rounded-[12px] bg-[#2563EB] px-5 text-[13px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장하기"}
        </button>
        {message ? <p className="text-[12px] font-bold text-[#16A34A]">{message}</p> : null}
        {error ? <p className="text-[12px] font-bold text-[#DC2626]">{error}</p> : null}
      </div>
    </section>
  );
}
