import { fail, mapRouteError, ok } from "@/lib/server/http";
import { fetchPortOnePayment, getPortOneConfig } from "@/lib/server/portone";
import { ensurePointSettings } from "@/lib/server/points";
import { createServiceRoleClient, requireRoleUser } from "@/lib/server/supabase";

function createOrderId() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `POINT-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireRoleUser(["member"], request);
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const { storeId, channelKey } = getPortOneConfig();
    const body = (await request.json().catch(() => ({}))) as { packageId?: unknown };

    if (typeof body.packageId !== "string") {
      return fail("Invalid point package.", 400);
    }

    const settings = await ensurePointSettings(admin);
    const pointPackage = settings.pointPurchasePackages.find((item) => item.id === body.packageId);
    if (!pointPackage) {
      return fail("Invalid point package.", 400);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, phone_number")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const paymentId = createOrderId();
    const orderName = `${pointPackage.label} 포인트 충전`;
    const totalPoints = pointPackage.points + pointPackage.bonusPoints;

    const { data: purchase, error: insertError } = await admin
      .from("point_purchases")
      .insert({
        user_id: user.id,
        order_id: paymentId,
        package_id: pointPackage.id,
        amount_krw: pointPackage.amountKrw,
        points: pointPackage.points,
        bonus_points: pointPackage.bonusPoints,
        status: "ready",
        provider: "portone",
        payment_method: "card",
        pg_payload: {
          storeId,
          channelKey,
          packageId: pointPackage.id,
          packageLabel: pointPackage.label,
          totalPoints,
          customerName: profile?.full_name || user.email || "회원",
          customerEmail: profile?.email || user.email || "",
          customerPhoneNumber: profile?.phone_number || "",
        },
      })
      .select("id, order_id, amount_krw, points, bonus_points, status, provider, created_at")
      .single();

    if (insertError || !purchase) {
      throw new Error(insertError?.message || "Point purchase could not be created.");
    }

    return ok({
      success: true,
      purchase,
      payment: {
        storeId,
        channelKey,
        paymentId,
        orderName,
        totalAmount: pointPackage.amountKrw,
        customer: {
          fullName: profile?.full_name || user.email || "회원",
          email: profile?.email || user.email || "",
          phoneNumber: profile?.phone_number || "",
        },
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireRoleUser(["member"], request);
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const { storeId, apiSecret } = getPortOneConfig();
    const body = (await request.json().catch(() => ({}))) as { paymentId?: unknown };

    if (typeof body.paymentId !== "string" || !body.paymentId.trim()) {
      return fail("Invalid payment ID.", 400);
    }

    const paymentId = body.paymentId.trim();
    const { data: purchase, error: purchaseError } = await admin
      .from("point_purchases")
      .select("id, user_id, order_id, package_id, amount_krw, points, bonus_points, status, provider, pg_payload, paid_at, completed_at")
      .eq("order_id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (purchaseError) {
      throw new Error(purchaseError.message);
    }
    if (!purchase) {
      return fail("Point purchase not found.", 404);
    }

    if (purchase.status === "completed") {
      return ok({
        success: true,
        purchase,
        balanceAfter: null,
        alreadyCompleted: true,
      });
    }

    const payment = await fetchPortOnePayment(paymentId, apiSecret);
    if (!payment) {
      return fail("PortOne payment not found.", 404);
    }
    if (payment.storeId && payment.storeId !== storeId) {
      return fail("Invalid payment store.", 400);
    }
    if (payment.currency && payment.currency !== "KRW") {
      return fail("Invalid payment currency.", 400);
    }
    if (Number(payment.amount?.total || 0) !== Number(purchase.amount_krw || 0)) {
      return fail("Payment amount mismatch.", 400);
    }
    if (payment.status !== "PAID") {
      return fail("Payment has not been completed.", 400);
    }

    const { data: completionResult, error: completionError } = await admin.rpc("complete_point_purchase", {
      p_purchase_id: purchase.id,
      p_user_id: user.id,
      p_pg_transaction_id: payment.transactionId || payment.id || paymentId,
      p_pg_payload: payment,
      p_paid_at: payment.paidAt || new Date().toISOString(),
    });

    if (completionError) {
      throw new Error(completionError.message);
    }

    const { data: completedPurchase, error: completedPurchaseError } = await admin
      .from("point_purchases")
      .select("id, order_id, amount_krw, points, bonus_points, status, provider, created_at, completed_at")
      .eq("id", purchase.id)
      .eq("user_id", user.id)
      .single();

    if (completedPurchaseError || !completedPurchase) {
      throw new Error(completedPurchaseError?.message || "Point purchase completion could not be loaded.");
    }

    return ok({
      success: true,
      purchase: completedPurchase,
      balanceAfter: typeof completionResult === "number" ? completionResult : null,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
