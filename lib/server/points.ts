import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_REFERRER_REWARD_POINTS = 1000;
export const DEFAULT_REFEREE_REWARD_POINTS = 300;
export const POINT_SETTINGS_ROW_ID = 1;

type PointSettingsRow = {
  id: number;
  referrer_reward_points: number | null;
  referee_reward_points: number | null;
};

function toSafePointValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

export async function ensurePointSettings(supabase: SupabaseClient) {
  const { data: existing, error: readError } = await supabase
    .from("point_settings")
    .select("id, referrer_reward_points, referee_reward_points")
    .eq("id", POINT_SETTINGS_ROW_ID)
    .maybeSingle<PointSettingsRow>();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    return {
      id: existing.id,
      referrerRewardPoints: toSafePointValue(existing.referrer_reward_points, DEFAULT_REFERRER_REWARD_POINTS),
      refereeRewardPoints: toSafePointValue(existing.referee_reward_points, DEFAULT_REFEREE_REWARD_POINTS),
    };
  }

  const payload = {
    id: POINT_SETTINGS_ROW_ID,
    referrer_reward_points: DEFAULT_REFERRER_REWARD_POINTS,
    referee_reward_points: DEFAULT_REFEREE_REWARD_POINTS,
  };

  const { error: insertError } = await supabase.from("point_settings").upsert(payload, { onConflict: "id" });
  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    id: POINT_SETTINGS_ROW_ID,
    referrerRewardPoints: DEFAULT_REFERRER_REWARD_POINTS,
    refereeRewardPoints: DEFAULT_REFEREE_REWARD_POINTS,
  };
}

export async function awardUserPoints(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    reason: string;
    category: string;
    relatedUserId?: string | null;
    referralEventId?: string | null;
    createdBy?: string | null;
  }
) {
  const amount = toSafePointValue(params.amount, 0);
  if (amount <= 0) return 0;

  const { data, error } = await supabase.rpc("award_user_points", {
    p_user_id: params.userId,
    p_amount: amount,
    p_reason: params.reason,
    p_category: params.category,
    p_related_user_id: params.relatedUserId || null,
    p_referral_event_id: params.referralEventId || null,
    p_created_by: params.createdBy || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toSafePointValue(data, 0);
}

export async function getPointSummary(supabase: SupabaseClient, userId: string) {
  const [{ data: wallet, error: walletError }, { data: transactions, error: transactionError }, { count, error: countError }] =
    await Promise.all([
      supabase.from("user_point_wallets").select("balance, lifetime_earned, lifetime_spent").eq("user_id", userId).maybeSingle(),
      supabase
        .from("point_ledger")
        .select("id, amount, balance_after, reason, category, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("referral_events").select("id", { count: "exact", head: true }).eq("referrer_profile_id", userId),
    ]);

  if (walletError) {
    throw new Error(walletError.message);
  }
  if (transactionError) {
    throw new Error(transactionError.message);
  }
  if (countError) {
    throw new Error(countError.message);
  }

  return {
    wallet: {
      balance: toSafePointValue(wallet?.balance, 0),
      lifetimeEarned: toSafePointValue(wallet?.lifetime_earned, 0),
      lifetimeSpent: toSafePointValue(wallet?.lifetime_spent, 0),
    },
    referralCount: count || 0,
    transactions: transactions || [],
  };
}
