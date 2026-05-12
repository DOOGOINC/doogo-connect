import { buildKnowledgeContext } from "@/lib/server/ai-chatbot-knowledge";
import { getAiChatbotSettings } from "@/lib/server/ai-chatbot";
import { consumeAiChatbotQuota, getAiChatbotScopeKey } from "@/lib/server/ai-chatbot-rate-limit";
import { fail, mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { createClient } from "@/utils/supabase/server";

type ChatbotMessage = {
  role: "user" | "assistant";
  content: string;
};

type CachedReply = {
  expiresAt: number;
  payload: {
    reply: string;
    handoffButtonLabel: string;
    handoffButtonUrl: string;
  };
};

const replyCache = new Map<string, CachedReply>();
const REPLY_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_QUESTION_CHARS = 250;
const MAX_HISTORY_MESSAGES = 5;
const MAX_OUTPUT_TOKENS = 520;

function isExcludedPath(pathname: string, excludedPaths: string[]) {
  return excludedPaths.some((prefix) => prefix && pathname.startsWith(prefix));
}

function normalizeMessages(value: unknown, maxContextMessages: number) {
  if (!Array.isArray(value)) return [] as ChatbotMessage[];

  return value
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const role = row.role === "assistant" ? "assistant" : row.role === "user" ? "user" : null;
      const content = typeof row.content === "string" ? row.content.trim().slice(0, MAX_QUESTION_CHARS) : "";
      if (!role || !content) return null;
      return { role, content } satisfies ChatbotMessage;
    })
    .filter((item): item is ChatbotMessage => Boolean(item))
    .slice(-Math.min(MAX_HISTORY_MESSAGES, Math.max(2, Math.floor(maxContextMessages))));
}

function containsBlockedTopic(message: string, blockedTopics: string[]) {
  const normalized = message.toLowerCase();
  return blockedTopics.some((topic) => topic && normalized.includes(topic.toLowerCase()));
}

function extractGeminiText(payload: unknown) {
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates;
  if (!Array.isArray(candidates)) return "";

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function getFormattingInstruction() {
  return [
    "Answer format rules:",
    "1. Do not use markdown emphasis such as **, __, #, >, or code fences.",
    "2. Answer with the key fact first, then add one or two short explanatory lines when the document contains details.",
    "3. If multiple points are needed, separate them by lines or simple numbering.",
    "4. If the information is uncertain, do not guess and guide the user to support.",
  ].join("\n");
}

function formatReplyForDisplay(reply: string) {
  return reply
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, " ")
    .replace(/^\s*\d+\)\s+/gm, "1. ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getCacheKey(pathname: string, question: string) {
  return `${pathname}::${question.trim().toLowerCase()}`;
}

function getCachedReply(pathname: string, question: string) {
  const key = getCacheKey(pathname, question);
  const cached = replyCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    replyCache.delete(key);
    return null;
  }
  return cached.payload;
}

function setCachedReply(pathname: string, question: string, payload: CachedReply["payload"]) {
  replyCache.set(getCacheKey(pathname, question), {
    expiresAt: Date.now() + REPLY_CACHE_TTL_MS,
    payload,
  });
}

function getTextLength(value: string) {
  return value.length;
}

function isLowConfidenceAssistantReply(message: ChatbotMessage, fallbackMessage: string) {
  if (message.role !== "assistant") return false;

  const normalized = message.content.trim();
  if (normalized === fallbackMessage.trim()) return true;

  return [
    "정보는 제공된 문서에 없습니다",
    "정확한",
    "고객센터나 1:1 채팅으로 문의",
    "고객센터 또는 1:1 채팅으로 문의",
  ].some((pattern) => normalized.includes(pattern));
}

function isLowConfidenceReplyText(reply: string, fallbackMessage: string) {
  return isLowConfidenceAssistantReply({ role: "assistant", content: reply }, fallbackMessage);
}

async function requestGeminiReply(params: {
  apiKey: string;
  model: string;
  temperature: number;
  pathname: string;
  systemInstruction: string;
  knowledgeContext: string;
  messages: ChatbotMessage[];
  retry: boolean;
}) {
  const requestContents = [
    ...(params.knowledgeContext
      ? [
          {
            role: "user" as const,
            parts: [{ text: `Reference context for the current question:\n\n${params.knowledgeContext}` }],
          },
        ]
      : []),
    ...params.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
  ];

  console.info("[ai-chatbot] Gemini request", {
    pathname: params.pathname,
    model: params.model,
    temperature: params.temperature,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    appliedHistoryMessages: params.messages.length,
    questionLength: getTextLength(params.messages[params.messages.length - 1]?.content || ""),
    systemInstructionLength: getTextLength(params.systemInstruction),
    knowledgeContextLength: getTextLength(params.knowledgeContext),
    requestContentCount: requestContents.length,
    retry: params.retry,
    messages: params.messages,
    knowledgeContext: params.knowledgeContext,
    systemInstruction: params.systemInstruction,
  });

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.systemInstruction }],
        },
        contents: requestContents,
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text().catch(() => "");
    console.error("[ai-chatbot] Gemini error", {
      pathname: params.pathname,
      model: params.model,
      status: geminiResponse.status,
      statusText: geminiResponse.statusText,
      systemInstructionLength: getTextLength(params.systemInstruction),
      knowledgeContextLength: getTextLength(params.knowledgeContext),
      messageCount: params.messages.length,
      retry: params.retry,
      errorText,
    });
    return { ok: false, reply: "" } as const;
  }

  const payload = (await geminiResponse.json().catch(() => ({}))) as unknown;
  return {
    ok: true,
    reply: extractGeminiText(payload),
  } as const;
}

export async function POST(request: Request) {
  try {
    const admin = createServiceRoleClient();
    const supabase = admin ?? (await createClient());
    const settings = await getAiChatbotSettings(supabase, { allowMissingTable: true });
    let usageWarning: string | null = null;
    const body = (await request.json().catch(() => ({}))) as {
      messages?: unknown;
      pathname?: unknown;
    };

    const pathname = typeof body.pathname === "string" ? body.pathname.trim().slice(0, 300) : "/";
    if (!settings.enabled || isExcludedPath(pathname, settings.excludedPaths)) {
      return fail("Chatbot is disabled.", 403);
    }

    const messages = normalizeMessages(body.messages, settings.maxContextMessages).filter(
      (message) => !isLowConfidenceAssistantReply(message, settings.fallbackMessage)
    );
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";

    if (!lastUserMessage) {
      return fail("Message is required.");
    }

    const cachedReply = getCachedReply(pathname, lastUserMessage);
    if (cachedReply) {
      return ok({
        success: true,
        ...cachedReply,
        usedFallback: false,
        usageWarning,
      });
    }

    if (admin) {
      const quota = await consumeAiChatbotQuota(admin, getAiChatbotScopeKey(request));
      if (!quota.allowed) {
        return ok({
          success: true,
          reply: formatReplyForDisplay(quota.message || settings.fallbackMessage),
          handoffButtonLabel: settings.handoffButtonLabel,
          handoffButtonUrl: settings.handoffButtonUrl,
          usedFallback: true,
          usageWarning: quota.warning,
        });
      }
      usageWarning = quota.warning;
    }

    if (containsBlockedTopic(lastUserMessage, settings.blockedTopics)) {
      return ok({
        success: true,
        reply: formatReplyForDisplay(settings.handoffMessage || settings.fallbackMessage),
        handoffButtonLabel: settings.handoffButtonLabel,
        handoffButtonUrl: settings.handoffButtonUrl,
        usedFallback: true,
        usageWarning,
      });
    }

    const knowledgeContext = await buildKnowledgeContext(pathname, lastUserMessage);
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

    if (!apiKey) {
      return ok({
        success: true,
        reply: formatReplyForDisplay(settings.fallbackMessage),
        handoffButtonLabel: settings.handoffButtonLabel,
        handoffButtonUrl: settings.handoffButtonUrl,
        usedFallback: true,
        usageWarning,
      });
    }

    const systemInstruction = [settings.systemPrompt, `Current page path: ${pathname}`, getFormattingInstruction()]
      .filter(Boolean)
      .join("\n\n");

    const primaryAttempt = await requestGeminiReply({
      apiKey,
      model: settings.model,
      temperature: settings.temperature,
      pathname,
      systemInstruction,
      knowledgeContext,
      messages,
      retry: false,
    });

    if (!primaryAttempt.ok) {
      return ok({
        success: true,
        reply: formatReplyForDisplay(settings.fallbackMessage),
        handoffButtonLabel: settings.handoffButtonLabel,
        handoffButtonUrl: settings.handoffButtonUrl,
        usedFallback: true,
        usageWarning,
      });
    }

    let rawReply = primaryAttempt.reply || settings.fallbackMessage;

    if (isLowConfidenceReplyText(rawReply, settings.fallbackMessage)) {
      const retryKnowledgeContext = await buildKnowledgeContext(pathname, lastUserMessage, { forceSecondDoc: true });
      const retryAttempt = await requestGeminiReply({
        apiKey,
        model: settings.model,
        temperature: settings.temperature,
        pathname,
        systemInstruction,
        knowledgeContext: retryKnowledgeContext,
        messages,
        retry: true,
      });

      if (retryAttempt.ok && retryAttempt.reply && !isLowConfidenceReplyText(retryAttempt.reply, settings.fallbackMessage)) {
        rawReply = retryAttempt.reply;
      }
    }

    const reply = formatReplyForDisplay(rawReply);
    const cachePayload = {
      reply,
      handoffButtonLabel: settings.handoffButtonLabel,
      handoffButtonUrl: settings.handoffButtonUrl,
    };

    setCachedReply(pathname, lastUserMessage, cachePayload);

    return ok({
      success: true,
      ...cachePayload,
      usedFallback: rawReply === settings.fallbackMessage,
      usageWarning,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
