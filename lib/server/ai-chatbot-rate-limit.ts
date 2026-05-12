import type { SupabaseClient } from "@supabase/supabase-js";

const MINUTE_LIMIT = 10;
const DAY_LIMIT = 80;
const WARNING_THRESHOLD_RATIO = 0.8;

function isMissingRelationError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01");
}

function getForwardedIp(value: string | null) {
  if (!value) return "";
  return value
    .split(",")[0]
    ?.trim()
    .slice(0, 120);
}

export function getAiChatbotScopeKey(request: Request) {
  const headers = request.headers;
  return (
    getForwardedIp(headers.get("x-forwarded-for")) ||
    getForwardedIp(headers.get("cf-connecting-ip")) ||
    getForwardedIp(headers.get("x-real-ip")) ||
    "unknown"
  );
}

function getMinuteWindowIso(now: Date) {
  return new Date(now.getTime() - 60 * 1000).toISOString();
}

function getDayWindowIso(now: Date) {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
}

export async function consumeAiChatbotQuota(supabase: SupabaseClient, scopeKey: string) {
  const now = new Date();
  const minuteSince = getMinuteWindowIso(now);
  const daySince = getDayWindowIso(now);

  const [{ count: minuteCount, error: minuteError }, { count: dayCount, error: dayError }] = await Promise.all([
    supabase
      .from("ai_chatbot_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("scope_key", scopeKey)
      .gte("created_at", minuteSince),
    supabase
      .from("ai_chatbot_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("scope_key", scopeKey)
      .gte("created_at", daySince),
  ]);

  if (minuteError) {
    if (isMissingRelationError(minuteError)) {
      return { allowed: true, message: null, warning: null } as const;
    }
    throw new Error(minuteError.message);
  }
  if (dayError) {
    if (isMissingRelationError(dayError)) {
      return { allowed: true, message: null, warning: null } as const;
    }
    throw new Error(dayError.message);
  }

  const safeMinuteCount = Number(minuteCount || 0);
  const safeDayCount = Number(dayCount || 0);

  if (safeMinuteCount >= MINUTE_LIMIT) {
    return {
      allowed: false,
      message: "요청이 짧은 시간에 너무 많이 들어왔습니다. 잠시 후 다시 시도해 주세요.",
      warning: null,
    } as const;
  }

  if (safeDayCount >= DAY_LIMIT) {
    return {
      allowed: false,
      message: "오늘 AI 상담 요청 한도에 도달했습니다. 잠시 후 다시 시도하거나 고객센터를 이용해 주세요.",
      warning: null,
    } as const;
  }

  const { error: insertError } = await supabase.from("ai_chatbot_request_logs").insert({
    scope_key: scopeKey,
    created_at: now.toISOString(),
  });

  if (insertError) {
    if (isMissingRelationError(insertError)) {
      return { allowed: true, message: null, warning: null } as const;
    }
    throw new Error(insertError.message);
  }

  const nextDayCount = safeDayCount + 1;
  const remainingDayCount = Math.max(0, DAY_LIMIT - nextDayCount);
  const warning =
    nextDayCount >= Math.ceil(DAY_LIMIT * WARNING_THRESHOLD_RATIO)
      ? `오늘 AI 상담 가능 횟수가 ${remainingDayCount}회 정도 남았습니다.`
      : null;

  return {
    allowed: true,
    message: null,
    warning,
  } as const;
}
