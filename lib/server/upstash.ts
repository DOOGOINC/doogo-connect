import "server-only";

const PRESENCE_KEY_PREFIX = "chat:presence:";
const PRESENCE_TTL_SECONDS = 60 * 60 * 24;

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url: url.replace(/\/+$/, ""), token };
}

async function upstashRequest(command: string[]) {
  const config = getUpstashConfig();
  if (!config) {
    return null;
  }

  const encodedPath = command.map((part) => encodeURIComponent(part)).join("/");
  const response = await fetch(`${config.url}/${encodedPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`UPSTASH_REQUEST_FAILED:${response.status}`);
  }

  return (await response.json()) as { result?: unknown };
}

function getPresenceKey(userId: string) {
  return `${PRESENCE_KEY_PREFIX}${userId}`;
}

export function isUpstashConfigured() {
  return Boolean(getUpstashConfig());
}

export async function setPresenceHeartbeat(userId: string) {
  const now = new Date().toISOString();
  const result = await upstashRequest(["set", getPresenceKey(userId), now, "EX", String(PRESENCE_TTL_SECONDS)]);
  return result?.result === "OK";
}

export async function getPresenceStatuses(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) {
    return {};
  }

  const result = await upstashRequest(["mget", ...uniqueUserIds.map(getPresenceKey)]);
  const values = Array.isArray(result?.result) ? result.result : [];

  return uniqueUserIds.reduce<Record<string, string | null>>((acc, userId, index) => {
    const value = values[index];
    acc[userId] = typeof value === "string" ? value : null;
    return acc;
  }, {});
}
