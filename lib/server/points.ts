import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_COMMISSION_RATE_PERCENT,
  DEFAULT_REFEREE_REWARD_POINTS,
  DEFAULT_REFERRER_REWARD_POINTS,
  DEFAULT_RFQ_REQUEST_POINT_COST,
} from "@/lib/points/constants";
export {
  DEFAULT_COMMISSION_RATE_PERCENT,
  DEFAULT_REFEREE_REWARD_POINTS,
  DEFAULT_REFERRER_REWARD_POINTS,
  DEFAULT_RFQ_REQUEST_POINT_COST,
} from "@/lib/points/constants";

export const DEFAULT_PLATFORM_NAME = "DOOGO Connect";
export const POINT_SETTINGS_ROW_ID = 1;
export const DEFAULT_POINT_PURCHASE_PACKAGES = [
  { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
  { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
  { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 7000, amountKrw: 50000 },
] as const;

type PointSettingsRow = {
  id: number;
  referrer_reward_points: number | null;
  referee_reward_points: number | null;
  rfq_request_cost_points?: number | null;
  commission_rate_percent?: number | null;
  platform_name?: string | null;
  point_purchase_packages?: unknown;
};

export type PointPurchasePackage = {
  id: string;
  label: string;
  points: number;
  bonusPoints: number;
  amountKrw: number;
};

function toSafePointValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

function toSafePercentValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Number(numeric.toFixed(2))));
}

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

export function normalizePointPurchasePackages(value: unknown): PointPurchasePackage[] {
  const source = Array.isArray(value) ? value : DEFAULT_POINT_PURCHASE_PACKAGES;
  const normalized = source
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `package-${index + 1}`;
      const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : `패키지 ${index + 1}`;
      const points = toSafePointValue(row.points, 0);
      const bonusPoints = toSafePointValue(row.bonusPoints ?? row.bonus_points, 0);
      const amountKrw = toSafePointValue(row.amountKrw ?? row.amount_krw, 0);
      if (points <= 0 || amountKrw <= 0) return null;
      return { id, label, points, bonusPoints, amountKrw };
    })
    .filter((item): item is PointPurchasePackage => Boolean(item));

  return normalized.length ? normalized : [...DEFAULT_POINT_PURCHASE_PACKAGES];
}

export async function ensurePointSettings(supabase: SupabaseClient) {
  const { data: existing, error: readError } = await supabase
    .from("point_settings")
    .select("id, referrer_reward_points, referee_reward_points, rfq_request_cost_points, commission_rate_percent, platform_name, point_purchase_packages")
    .eq("id", POINT_SETTINGS_ROW_ID)
    .maybeSingle<PointSettingsRow>();

  if (readError) {
    if (!isUndefinedColumnError(readError)) {
      throw new Error(readError.message);
    }

    const { data: legacyExisting, error: legacyReadError } = await supabase
      .from("point_settings")
      .select("id, referrer_reward_points, referee_reward_points")
      .eq("id", POINT_SETTINGS_ROW_ID)
      .maybeSingle<PointSettingsRow>();

    if (legacyReadError) {
      throw new Error(legacyReadError.message);
    }

    if (legacyExisting) {
      return {
        id: legacyExisting.id,
        referrerRewardPoints: toSafePointValue(legacyExisting.referrer_reward_points, DEFAULT_REFERRER_REWARD_POINTS),
        refereeRewardPoints: toSafePointValue(legacyExisting.referee_reward_points, DEFAULT_REFEREE_REWARD_POINTS),
        rfqRequestCostPoints: DEFAULT_RFQ_REQUEST_POINT_COST,
        commissionRatePercent: DEFAULT_COMMISSION_RATE_PERCENT,
        platformName: DEFAULT_PLATFORM_NAME,
        pointPurchasePackages: normalizePointPurchasePackages(null),
      };
    }
  }

  if (existing) {
    return {
      id: existing.id,
      referrerRewardPoints: toSafePointValue(existing.referrer_reward_points, DEFAULT_REFERRER_REWARD_POINTS),
      refereeRewardPoints: toSafePointValue(existing.referee_reward_points, DEFAULT_REFEREE_REWARD_POINTS),
      rfqRequestCostPoints: toSafePointValue(existing.rfq_request_cost_points, DEFAULT_RFQ_REQUEST_POINT_COST),
      commissionRatePercent: toSafePercentValue(existing.commission_rate_percent, DEFAULT_COMMISSION_RATE_PERCENT),
      platformName: existing.platform_name?.trim() || DEFAULT_PLATFORM_NAME,
      pointPurchasePackages: normalizePointPurchasePackages(existing.point_purchase_packages),
    };
  }

  const payload = {
    id: POINT_SETTINGS_ROW_ID,
    referrer_reward_points: DEFAULT_REFERRER_REWARD_POINTS,
    referee_reward_points: DEFAULT_REFEREE_REWARD_POINTS,
    rfq_request_cost_points: DEFAULT_RFQ_REQUEST_POINT_COST,
    commission_rate_percent: DEFAULT_COMMISSION_RATE_PERCENT,
    platform_name: DEFAULT_PLATFORM_NAME,
    point_purchase_packages: DEFAULT_POINT_PURCHASE_PACKAGES,
  };

  const { error: insertError } = await supabase.from("point_settings").upsert(payload, { onConflict: "id" });
  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    id: POINT_SETTINGS_ROW_ID,
    referrerRewardPoints: DEFAULT_REFERRER_REWARD_POINTS,
    refereeRewardPoints: DEFAULT_REFEREE_REWARD_POINTS,
    rfqRequestCostPoints: DEFAULT_RFQ_REQUEST_POINT_COST,
    commissionRatePercent: DEFAULT_COMMISSION_RATE_PERCENT,
    platformName: DEFAULT_PLATFORM_NAME,
    pointPurchasePackages: normalizePointPurchasePackages(null),
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

export async function spendUserPoints(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    reason: string;
    category: string;
    createdBy?: string | null;
  }
) {
  const amount = toSafePointValue(params.amount, 0);
  if (amount <= 0) return 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: wallet, error: walletError } = await supabase
      .from("user_point_wallets")
      .select("balance, lifetime_earned, lifetime_spent")
      .eq("user_id", params.userId)
      .maybeSingle();

    if (walletError) {
      throw new Error(walletError.message);
    }

    const currentBalance = toSafePointValue(wallet?.balance, 0);
    if (currentBalance < amount) {
      throw new Error("포인트가 부족합니다. 포인트 충전 후 다시 진행해 주세요.");
    }

    const balanceAfter = currentBalance - amount;
    const lifetimeSpentAfter = toSafePointValue(wallet?.lifetime_spent, 0) + amount;

    const { data: updatedWallet, error: updateError } = await supabase
      .from("user_point_wallets")
      .update({
        balance: balanceAfter,
        lifetime_spent: lifetimeSpentAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", params.userId)
      .eq("balance", currentBalance)
      .select("balance")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updatedWallet) {
      continue;
    }

    const { error: ledgerError } = await supabase.from("point_ledger").insert({
      user_id: params.userId,
      amount: -amount,
      balance_after: balanceAfter,
      reason: params.reason,
      category: params.category,
      created_by: params.createdBy || null,
    });

    if (ledgerError) {
      throw new Error(ledgerError.message);
    }

    return balanceAfter;
  }

  throw new Error("포인트 차감 중 충돌이 발생했습니다. 잠시 후 다시 시도해 주세요.");
}

export async function getPointSummary(supabase: SupabaseClient, userId: string) {
  const [
    { data: wallet, error: walletError },
    { data: transactions, error: transactionError },
    { data: purchases, error: purchaseError },
    { count, error: countError },
  ] =
    await Promise.all([
      supabase.from("user_point_wallets").select("balance, lifetime_earned, lifetime_spent").eq("user_id", userId).maybeSingle(),
      supabase
        .from("point_ledger")
        .select("id, amount, balance_after, reason, category, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("point_purchases")
        .select("id, order_id, amount_krw, points, bonus_points, status, provider, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("referral_events").select("id", { count: "exact", head: true }).eq("referrer_profile_id", userId),
    ]);

  if (walletError) {
    throw new Error(walletError.message);
  }
  if (transactionError) {
    throw new Error(transactionError.message);
  }
  if (purchaseError && !isMissingRelationError(purchaseError)) {
    throw new Error(purchaseError.message);
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
    purchases: purchaseError ? [] : purchases || [],
  };
}
