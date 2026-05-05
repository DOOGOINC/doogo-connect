import { createServiceRoleClient } from "@/lib/server/supabase";
import type { NotificationItem, ReferralMemberRow } from "./types";
import { MAX_NOTIFICATIONS, getCutoffIso } from "./utils";

type PartnerAdmin = NonNullable<ReturnType<typeof createServiceRoleClient>>;

export async function buildPartnerTradeNotifications(admin: PartnerAdmin, userId: string, readKeys: Set<string>) {
  const cutoffIso = getCutoffIso();
  const { data: referralMembers, error: referralError } = await admin
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "member")
    .eq("referred_by_profile_id", userId)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(MAX_NOTIFICATIONS);

  if (referralError) {
    throw new Error(referralError.message);
  }

  return (((referralMembers as ReferralMemberRow[] | null) || []).map((member): NotificationItem => {
    const key = `trade:referral:${member.id}:${member.created_at || ""}`;
    return {
      key,
      category: "trade",
      title: "회원가입 알림",
      message: `${member.full_name || "회원"}님이 내 추천인 코드를 입력하고 회원가입했습니다.`,
      linkUrl: "/partner/dashboard?tab=referrals",
      createdAt: member.created_at || new Date().toISOString(),
      isRead: readKeys.has(key),
    };
  }) satisfies NotificationItem[])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_NOTIFICATIONS);
}
