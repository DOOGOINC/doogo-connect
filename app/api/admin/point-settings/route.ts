import { mapRouteError, ok } from "@/lib/server/http";
import {
  DEFAULT_REFEREE_REWARD_POINTS,
  DEFAULT_REFERRER_REWARD_POINTS,
  POINT_SETTINGS_ROW_ID,
  ensurePointSettings,
} from "@/lib/server/points";
import { requireMasterUser } from "@/lib/server/supabase";

function toPointInput(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);

    const settings = await ensurePointSettings(supabase);

    const [{ count: referralCount, error: referralCountError }, { data: wallets, error: walletError }] = await Promise.all([
      supabase.from("referral_events").select("id", { count: "exact", head: true }),
      supabase.from("user_point_wallets").select("balance, lifetime_earned"),
    ]);

    if (referralCountError) {
      throw new Error(referralCountError.message);
    }
    if (walletError) {
      throw new Error(walletError.message);
    }

    const totalBalance = (wallets || []).reduce((sum, row) => sum + Number(row.balance || 0), 0);
    const totalEarned = (wallets || []).reduce((sum, row) => sum + Number(row.lifetime_earned || 0), 0);

    return ok({
      success: true,
      settings,
      stats: {
        referralCount: referralCount || 0,
        totalBalance,
        totalEarned,
        walletCount: wallets?.length || 0,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireMasterUser(request);

    const body = await request.json();
    const referrerRewardPoints = toPointInput(body.referrerRewardPoints, DEFAULT_REFERRER_REWARD_POINTS);
    const refereeRewardPoints = toPointInput(body.refereeRewardPoints, DEFAULT_REFEREE_REWARD_POINTS);

    const payload = {
      id: POINT_SETTINGS_ROW_ID,
      referrer_reward_points: referrerRewardPoints,
      referee_reward_points: refereeRewardPoints,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("point_settings").upsert(payload, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }

    return ok({
      success: true,
      settings: {
        id: POINT_SETTINGS_ROW_ID,
        referrerRewardPoints,
        refereeRewardPoints,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
