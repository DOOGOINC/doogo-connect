const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

export const formatRelativeTime = (value: string | null) => {
  if (!value) return "";

  const target = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - target);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

export const formatMessageTime = (value: string) =>
  new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export const getPresenceLabel = (lastSeenAt: string | null) => {
  if (!lastSeenAt) return "오프라인";

  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff <= ONLINE_THRESHOLD_MS) return "접속 중";

  return `${formatRelativeTime(lastSeenAt)} 접속`;
};

export const isRecentlyOnline = (lastSeenAt: string | null) => {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() <= ONLINE_THRESHOLD_MS;
};

export const getProfileDisplayName = (
  profile: { full_name: string | null; email: string | null } | null | undefined,
  fallback: string
) => {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;

  const email = profile?.email?.trim();
  if (email) {
    const [localPart] = email.split("@");
    if (localPart) return localPart;
  }

  return fallback;
};

export const getAvatarInitial = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
};
