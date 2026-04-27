import { mapRouteError, ok } from "@/lib/server/http";
import {
  DEFAULT_COMMISSION_RATE_PERCENT,
  DEFAULT_REFEREE_REWARD_POINTS,
  DEFAULT_REFERRER_REWARD_POINTS,
  DEFAULT_PLATFORM_NAME,
  DEFAULT_POINT_PURCHASE_PACKAGES,
  DEFAULT_RFQ_REQUEST_POINT_COST,
  POINT_SETTINGS_ROW_ID,
  awardUserPoints,
  ensurePointSettings,
  normalizePointPurchasePackages,
  spendUserPoints,
} from "@/lib/server/points";
import { createServiceRoleClient, requireMasterUser } from "@/lib/server/supabase";

function toPointInput(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

function toPercentInput(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Number(numeric.toFixed(2))));
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const admin = createServiceRoleClient() ?? supabase;

    const settings = await ensurePointSettings(supabase);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      { count: referralCount, error: referralCountError },
      { data: wallets, error: walletError },
      { data: ledgerRows, error: ledgerError },
      { data: profiles, error: profileError },
      { count: monthlyPurchaseCount, error: monthlyPurchaseCountError },
      { data: commissionHistory, error: commissionHistoryError },
    ] = await Promise.all([
      supabase.from("referral_events").select("id", { count: "exact", head: true }),
      admin.from("user_point_wallets").select("user_id, balance, lifetime_earned, lifetime_spent"),
      admin
        .from("point_ledger")
        .select("id, user_id, amount, balance_after, reason, category, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      admin.from("profiles").select("id, full_name, email, role").eq("role", "member").order("created_at", { ascending: false }),
      admin
        .from("point_purchases")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("created_at", monthStart.toISOString()),
      admin
        .from("commission_rate_history")
        .select("id, previous_rate_percent, next_rate_percent, changed_by, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (referralCountError) {
      throw new Error(referralCountError.message);
    }
    if (walletError) {
      throw new Error(walletError.message);
    }
    if (ledgerError) {
      throw new Error(ledgerError.message);
    }
    if (profileError) {
      throw new Error(profileError.message);
    }
    if (monthlyPurchaseCountError) {
      throw new Error(monthlyPurchaseCountError.message);
    }
    if (commissionHistoryError && commissionHistoryError.code !== "42P01") {
      throw new Error(commissionHistoryError.message);
    }

    const totalBalance = (wallets || []).reduce((sum, row) => sum + Number(row.balance || 0), 0);
    const totalEarned = (wallets || []).reduce((sum, row) => sum + Number(row.lifetime_earned || 0), 0);
    const totalSpent = (wallets || []).reduce((sum, row) => sum + Number(row.lifetime_spent || 0), 0);
    const walletMap = new Map((wallets || []).map((wallet) => [wallet.user_id, Number(wallet.balance || 0)]));
    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const transactions = (ledgerRows || []).map((row) => {
      const profile = profileMap.get(row.user_id);

      return {
        id: row.id,
        userId: row.user_id,
        memberName: profile?.full_name?.trim() || "이름 없음",
        email: profile?.email || "-",
        amount: Number(row.amount || 0),
        balanceAfter: Number(row.balance_after || 0),
        reason: row.reason || "",
        category: row.category || "",
        createdAt: row.created_at,
      };
    });
    const members = (profiles || []).map((profile) => ({
      id: profile.id,
      memberName: profile.full_name?.trim() || "이름 없음",
      email: profile.email || "-",
      balance: walletMap.get(profile.id) || 0,
    }));

    return ok({
      success: true,
      settings,
      stats: {
        referralCount: referralCount || 0,
        totalCharged: totalEarned,
        totalSpent,
        totalBalance,
        totalEarned,
        monthlyPurchaseCount: monthlyPurchaseCount || 0,
        walletCount: wallets?.length || 0,
      },
      transactions,
      members,
      commissionHistory:
        commissionHistory?.map((row) => ({
          id: row.id,
          previousRatePercent: Number(row.previous_rate_percent || 0),
          nextRatePercent: Number(row.next_rate_percent || 0),
          changedBy: row.changed_by,
          createdAt: row.created_at,
        })) || [],
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
    const rfqRequestCostPoints = toPointInput(body.rfqRequestCostPoints, DEFAULT_RFQ_REQUEST_POINT_COST);
    const commissionRatePercent = toPercentInput(body.commissionRatePercent, DEFAULT_COMMISSION_RATE_PERCENT);
    const platformName =
      typeof body.platformName === "string" && body.platformName.trim()
        ? body.platformName.trim().slice(0, 80)
        : DEFAULT_PLATFORM_NAME;
    const pointPurchasePackages = normalizePointPurchasePackages(body.pointPurchasePackages || DEFAULT_POINT_PURCHASE_PACKAGES);

    const { data: previousSettings } = await supabase
      .from("point_settings")
      .select("commission_rate_percent")
      .eq("id", POINT_SETTINGS_ROW_ID)
      .maybeSingle<{ commission_rate_percent: number | null }>();

    const payload = {
      id: POINT_SETTINGS_ROW_ID,
      referrer_reward_points: referrerRewardPoints,
      referee_reward_points: refereeRewardPoints,
      rfq_request_cost_points: rfqRequestCostPoints,
      commission_rate_percent: commissionRatePercent,
      platform_name: platformName,
      point_purchase_packages: pointPurchasePackages,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("point_settings").upsert(payload, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }

    const previousCommissionRate = Number(previousSettings?.commission_rate_percent ?? DEFAULT_COMMISSION_RATE_PERCENT);
    if (previousCommissionRate !== commissionRatePercent) {
      const { error: historyError } = await supabase.from("commission_rate_history").insert({
        previous_rate_percent: previousCommissionRate,
        next_rate_percent: commissionRatePercent,
        changed_by: user.id,
      });
      if (historyError && historyError.code !== "42P01") {
        throw new Error(historyError.message);
      }
    }

    return ok({
      success: true,
      settings: {
        id: POINT_SETTINGS_ROW_ID,
        referrerRewardPoints,
        refereeRewardPoints,
        rfqRequestCostPoints,
        commissionRatePercent,
        platformName,
        pointPurchasePackages,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireMasterUser(request);
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      amount?: unknown;
      action?: unknown;
      reason?: unknown;
    };
    const targetUserId = typeof body.userId === "string" ? body.userId : "";
    const action = body.action === "add" || body.action === "subtract" ? body.action : "";
    const amount = toPointInput(body.amount, 0);
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 120)
        : action === "add"
          ? "관리자 포인트 추가"
          : "관리자 포인트 차감";

    if (!targetUserId) {
      throw new Error("회원을 선택해 주세요.");
    }
    if (!action) {
      throw new Error("포인트 추가 또는 차감을 선택해 주세요.");
    }
    if (amount <= 0) {
      throw new Error("포인트를 1P 이상 입력해 주세요.");
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }
    if (!profile || profile.role !== "member") {
      throw new Error("의뢰자 회원에게만 포인트를 조정할 수 있습니다.");
    }

    const balanceAfter =
      action === "add"
        ? await awardUserPoints(admin, {
            userId: targetUserId,
            amount,
            reason,
            category: "admin_adjustment_credit",
            createdBy: user.id,
          })
        : await spendUserPoints(admin, {
            userId: targetUserId,
            amount,
            reason,
            category: "admin_adjustment_debit",
            createdBy: user.id,
          });

    return ok({
      success: true,
      balanceAfter,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
