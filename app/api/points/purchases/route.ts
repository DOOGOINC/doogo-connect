import { fail, mapRouteError, ok } from "@/lib/server/http";
import { awardUserPoints, ensurePointSettings } from "@/lib/server/points";
import { createServiceRoleClient, requireRoleUser } from "@/lib/server/supabase";

function createOrderId() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `POINT-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    const { user } = await requireRoleUser(["member"], request);
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const body = (await request.json().catch(() => ({}))) as { packageId?: unknown };

    if (typeof body.packageId !== "string") {
      return fail("Invalid point package.", 400);
    }

    const settings = await ensurePointSettings(admin);
    const pointPackage = settings.pointPurchasePackages.find((item) => item.id === body.packageId);
    if (!pointPackage) {
      return fail("Invalid point package.", 400);
    }
    const orderId = createOrderId();
    const totalPoints = pointPackage.points + pointPackage.bonusPoints;

    const { data: purchase, error: insertError } = await admin
      .from("point_purchases")
      .insert({
        user_id: user.id,
        order_id: orderId,
        package_id: pointPackage.id,
        amount_krw: pointPackage.amountKrw,
        points: pointPackage.points,
        bonus_points: pointPackage.bonusPoints,
        status: "ready",
        provider: "mock",
        payment_method: "mock",
      })
      .select("id, order_id, amount_krw, points, bonus_points, status, provider, created_at")
      .single();

    if (insertError || !purchase) {
      throw new Error(insertError?.message || "Point purchase could not be created.");
    }

    const balanceAfter = await awardUserPoints(admin, {
      userId: user.id,
      amount: totalPoints,
      reason: `포인트 충전 (${pointPackage.amountKrw.toLocaleString()}원)`,
      category: "point_purchase",
      createdBy: user.id,
    });

    const { data: completedPurchase, error: updateError } = await admin
      .from("point_purchases")
      .update({
        status: "completed",
        pg_transaction_id: `mock_${purchase.id}`,
        paid_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", purchase.id)
      .eq("user_id", user.id)
      .select("id, order_id, amount_krw, points, bonus_points, status, provider, created_at")
      .single();

    if (updateError || !completedPurchase) {
      throw new Error(updateError?.message || "Point purchase could not be completed.");
    }

    return ok({
      success: true,
      purchase: completedPurchase,
      balanceAfter,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
