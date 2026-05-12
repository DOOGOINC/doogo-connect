"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, ArrowUp, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type PublicAiChatbotSettings = {
  id: number;
  enabled: boolean;
  widgetTitle: string;
  welcomeMessage: string;
  inputPlaceholder: string;
  fallbackMessage: string;
  handoffMessage: string;
  handoffButtonLabel: string;
  handoffButtonUrl: string;
  excludedPaths: string[];
  maxContextMessages: number;
  updatedAt: string | null;
};

type ChatbotResponse = {
  reply?: string;
  usageWarning?: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const DEFAULT_SETTINGS: PublicAiChatbotSettings = {
  id: 1,
  enabled: false,
  widgetTitle: "AI 상담",
  welcomeMessage: "안녕하세요. DOOGO CONNECT AI 상담 도우미입니다.",
  inputPlaceholder: "메시지를 입력해 주세요.",
  fallbackMessage: "지금은 답변이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
  handoffMessage: "정확한 상담이 필요하면 고객센터를 이용해 주세요.",
  handoffButtonLabel: "고객센터로 이동",
  handoffButtonUrl: "/my-connect?tab=support",
  excludedPaths: [],
  maxContextMessages: 8,
  updatedAt: null,
};

const SETTINGS_CACHE_KEY = "doogo-connect:ai-chatbot:settings";
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;
const OPEN_STATE_KEY = "doogo-connect:ai-chatbot:open";
const MESSAGES_KEY = "doogo-connect:ai-chatbot:messages";
const REPLY_CACHE_KEY = "doogo-connect:ai-chatbot:reply-cache";
const REPLY_CACHE_TTL_MS = 10 * 60 * 1000;
const URL_PATTERN = /(https?:\/\/[^\s]+|\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/g;
const MAX_QUESTION_CHARS = 250;
const MAX_HISTORY_MESSAGES = 5;

function isExcludedPath(pathname: string, excludedPaths: string[]) {
  return excludedPaths.some((prefix) => prefix && pathname.startsWith(prefix));
}

function renderMessageContent(content: string, isUserMessage = false) {
  const parts = content.split(URL_PATTERN);

  return parts.map((part, index) => {
    if (!part) return null;

    URL_PATTERN.lastIndex = 0;
    if (URL_PATTERN.test(part)) {
      URL_PATTERN.lastIndex = 0;
      const href = part.startsWith("/") ? part : part.replace(/[),.;!?]+$/, "");
      const label = part.replace(/^[([{]+|[)\]}]+$/g, "");

      return (
        <a
          key={`${href}-${index}`}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={
            isUserMessage
              ? "!underline text-white decoration-white underline-offset-2 hover:text-white hover:decoration-white"
              : "!underline text-[#165cf9] decoration-[#165cf9] underline-offset-2 hover:text-[#165cf9] hover:decoration-[#165cf9]"
          }
        >
          {label}
        </a>
      );
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
}

function getReplyCacheKey(pathname: string, question: string) {
  return `${pathname}::${question.trim().toLowerCase()}`;
}

function createChatMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "방금 전";
  }

  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

function isLowConfidenceAssistantReply(content: string, fallbackMessage: string) {
  const normalized = content.trim();
  if (normalized === fallbackMessage.trim()) return true;

  return [
    "정보는 제공된 문서에 없습니다",
    "정확한",
    "고객센터나 1:1 채팅으로 문의",
    "고객센터 또는 1:1 채팅으로 문의",
  ].some((pattern) => normalized.includes(pattern));
}

function getAssistantPreviewText(welcomeMessage: string) {
  const firstLine = welcomeMessage
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || "상담원에게도 도움을 받으실 수 있습니다";
}

export function FloatingAiChatbot() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<PublicAiChatbotSettings>(DEFAULT_SETTINGS);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [usageWarning, setUsageWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [, setRelativeTimeTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const effectiveMaxContextMessages = Math.min(
    MAX_HISTORY_MESSAGES,
    Math.max(2, Math.floor(settings.maxContextMessages || DEFAULT_SETTINGS.maxContextMessages))
  );
  const assistantPreviewText = useMemo(() => getAssistantPreviewText(settings.welcomeMessage), [settings.welcomeMessage]);

  useEffect(() => {
    try {
      const cachedOpen = window.sessionStorage.getItem(OPEN_STATE_KEY);
      setIsOpen(cachedOpen === "1");

      const cachedMessages = window.sessionStorage.getItem(MESSAGES_KEY);
      if (cachedMessages) {
        const parsed = JSON.parse(cachedMessages) as ChatMessage[];
        if (Array.isArray(parsed)) {
          setMessages(
            parsed
              .filter(
                (item) =>
                  item &&
                  (item.role === "user" || item.role === "assistant") &&
                  typeof item.content === "string"
              )
              .map((item, index) => ({
                role: item.role,
                content: item.content,
                createdAt:
                  typeof item.createdAt === "string" && item.createdAt.trim()
                    ? item.createdAt
                    : new Date(Date.now() - (parsed.length - index) * 60000).toISOString(),
              }))
              .slice(-12)
          );
        }
      }
    } catch {
      // Ignore storage parse errors.
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(OPEN_STATE_KEY, isOpen ? "1" : "0");
  }, [isOpen]);

  useEffect(() => {
    if (!messages.length) {
      window.sessionStorage.removeItem(MESSAGES_KEY);
      return;
    }
    window.sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-12)));
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRelativeTimeTick((value) => value + 1);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const cachedRaw = window.sessionStorage.getItem(SETTINGS_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { value?: PublicAiChatbotSettings; expiresAt?: number };
          if (cached?.value && typeof cached.expiresAt === "number" && cached.expiresAt > Date.now()) {
            if (!cancelled) {
              setSettings({ ...DEFAULT_SETTINGS, ...cached.value });
              setLoading(false);
            }
            return;
          }
        }

        const response = await fetch("/api/ai-chatbot-settings", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { settings?: PublicAiChatbotSettings };
        const nextSettings = payload.settings ? { ...DEFAULT_SETTINGS, ...payload.settings } : DEFAULT_SETTINGS;

        if (!cancelled) {
          setSettings(nextSettings);
          setLoading(false);
        }

        window.sessionStorage.setItem(
          SETTINGS_CACHE_KEY,
          JSON.stringify({ value: nextSettings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS })
        );
      } catch {
        if (!cancelled) {
          setSettings(DEFAULT_SETTINGS);
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    if (loading || !settings.enabled) return false;
    return !isExcludedPath(pathname, settings.excludedPaths);
  }, [loading, pathname, settings]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextUserMessage = createChatMessage("user", trimmed.slice(0, MAX_QUESTION_CHARS));
    const nextMessages = [...messages, nextUserMessage].slice(-effectiveMaxContextMessages);
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const cacheKey = getReplyCacheKey(pathname, trimmed);
      const cachedRaw = window.sessionStorage.getItem(REPLY_CACHE_KEY);
      if (cachedRaw) {
        const cachedMap = JSON.parse(cachedRaw) as Record<string, { reply: string; expiresAt: number }>;
        const cachedReply = cachedMap?.[cacheKey];
        if (cachedReply && cachedReply.expiresAt > Date.now()) {
          const assistantMessage = createChatMessage("assistant", cachedReply.reply);
          setMessages((prev) => [...prev, assistantMessage].slice(-12));
          setIsSending(false);
          return;
        }
      }

      const sanitizedMessages = nextMessages.filter(
        (message) => !(message.role === "assistant" && isLowConfidenceAssistantReply(message.content, settings.fallbackMessage))
      );

      const response = await fetch("/api/ai-chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pathname,
          messages: sanitizedMessages,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ChatbotResponse;
      const reply = typeof payload.reply === "string" && payload.reply.trim() ? payload.reply.trim() : settings.fallbackMessage;
      setUsageWarning(typeof payload.usageWarning === "string" ? payload.usageWarning : "");
      const assistantMessage = createChatMessage("assistant", reply);
      const nextCacheKey = getReplyCacheKey(pathname, trimmed);
      const nextCachedRaw = window.sessionStorage.getItem(REPLY_CACHE_KEY);
      const nextCachedMap = nextCachedRaw
        ? ((JSON.parse(nextCachedRaw) as Record<string, { reply: string; expiresAt: number }>) || {})
        : {};
      nextCachedMap[nextCacheKey] = { reply, expiresAt: Date.now() + REPLY_CACHE_TTL_MS };
      window.sessionStorage.setItem(REPLY_CACHE_KEY, JSON.stringify(nextCachedMap));

      setMessages((prev) => [...prev, assistantMessage].slice(-12));
    } catch {
      setUsageWarning("");
      const fallbackMessage = createChatMessage("assistant", settings.fallbackMessage);
      setMessages((prev) => [...prev, fallbackMessage].slice(-12));
    } finally {
      setIsSending(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[95] flex flex-col items-end print:hidden">
      {isOpen ? (
        <div
          className="pointer-events-auto mb-4 w-[min(420px,calc(100vw-1.5rem))] origin-bottom-right overflow-hidden rounded-[28px] border border-[#e7eaf0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
          style={{ animation: "chatbot-expand 240ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
        >
          <div className="border-b border-[#eef1f5] bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white">
                  <MessageCircle className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-5 text-[#101828]">{settings.widgetTitle}</p>
                  <p className="line-clamp-2 text-[12px] leading-4 text-[#667085]">{assistantPreviewText}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#667085] transition hover:bg-[#f3f4f6] cursor-pointer"
                  aria-label="채팅 닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[600px] flex-col bg-[#ffffff]">
            <div className="flex-1 overflow-y-auto px-5 py-6">
              {!messages.length ? (
                <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-[24px] rounded-tl-[10px] bg-[#f5f5f5] px-5 py-4 text-[14px] leading-7 text-[#1f2937] ">
                  {settings.welcomeMessage}
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={message.role === "user" ? "max-w-[76%]" : "max-w-[88%]"}>
                      <div
                        className={`whitespace-pre-wrap break-words px-5 py-4 text-[14px] leading-7  ${message.role === "user"
                          ? "rounded-[24px] rounded-br-[10px] bg-[#111111] text-white"
                          : "rounded-[24px] rounded-tl-[10px] bg-[#f5f5f5] text-[#1f2937]"
                          }`}
                      >
                        {renderMessageContent(message.content, message.role === "user")}
                      </div>
                      {message.role === "assistant" ? (
                        <p className="mt-2 px-1 text-[11px] text-[#8a9099]">
                          {settings.widgetTitle} • {formatRelativeTime(message.createdAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
                {isSending ? (
                  <div className="flex justify-start">
                    <div className="rounded-[24px] rounded-tl-[10px] bg-[#f3f4f6] px-5 py-4">
                      <div className="flex items-center gap-1">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#98a2b3] [animation-delay:-0.3s]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#98a2b3] [animation-delay:-0.15s]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#98a2b3]" />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>
            </div>

            <div className="border-t border-[#eef1f5] bg-white px-4 py-4">
              {usageWarning ? <p className="mb-3 px-2 text-[12px] leading-5 text-[#b45309]">{usageWarning}</p> : null}
              <div className="relative rounded-[14px] border border-[#e5e7eb] bg-white px-4 pb-3 pt-3  transition focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value.slice(0, MAX_QUESTION_CHARS))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  maxLength={MAX_QUESTION_CHARS}
                  rows={1}
                  placeholder={settings.inputPlaceholder}
                  className="min-h-[44px] w-full resize-none border-0 bg-transparent px-1 py-1 pr-14 text-[15px] leading-5 text-[#111827] outline-none placeholder:text-[#98a2b3]"
                />

                <div className="pointer-events-none absolute bottom-3 right-3">
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={isSending || !input.trim()}
                    className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:bg-[#d0d5dd] cursor-pointer"
                    aria-label="메시지 전송"
                  >
                    <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 px-2">
                <p className="text-[11px] leading-5 text-[#8a9099]">{settings.handoffMessage}</p>
                {settings.handoffButtonUrl ? (
                  <Link
                    href={settings.handoffButtonUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="shrink-0 text-[11px] font-medium text-[#2563eb] no-underline hover:!underline underline-offset-2"
                  >
                    {settings.handoffButtonLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null
      }
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#111111] text-white transition-transform duration-200 hover:scale-110 hover:bg-[#1f2937] cursor-pointer"
      >
        {isOpen ? (
          <ChevronDown className="h-6 w-6 transition-transform duration-300 " strokeWidth={2.5} />
        ) : (
          <MessageCircle className="h-5 w-5 transition-transform duration-300" />
        )}
      </button>
      <style jsx>{`
        @keyframes chatbot-expand {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div >
  );
}
