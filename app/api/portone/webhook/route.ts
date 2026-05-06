import { WebhookVerificationError, verify } from "@portone/server-sdk/webhook";
import { mapRouteError, ok } from "@/lib/server/http";
import { fetchPortOnePayment, getPortOneConfig } from "@/lib/server/portone";
import { createServiceRoleClient } from "@/lib/server/supabase";

type PortOneWebhookPayload = {
  type?: string;
  timestamp?: string;
  data?: {
    paymentId?: string;
    transactionId?: string;
    storeId?: string;
  };
};

export async function POST(request: Request) {
  try {
    const admin = createServiceRoleClient();
    if (!admin) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const rawBody = await request.text();
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET?.trim();
    let body: PortOneWebhookPayload | null = null;

    if (webhookSecret) {
      const verified = (await verify(webhookSecret, rawBody, {
        "webhook-id": request.headers.get("webhook-id") || "",
        "webhook-signature": request.headers.get("webhook-signature") || "",
        "webhook-timestamp": request.headers.get("webhook-timestamp") || "",
      })) as PortOneWebhookPayload;
      body = verified;
    } else {
      body = (JSON.parse(rawBody) as PortOneWebhookPayload | null) || null;
    }

    const eventType = body?.type || "";
    const paymentId = body?.data?.paymentId?.trim();

    if (!paymentId) {
      return ok({ success: true, ignored: true, reason: "missing_payment_id" });
    }

    if (eventType !== "Transaction.Paid") {
      return ok({ success: true, ignored: true, reason: "unsupported_event_type" });
    }

    const { storeId, apiSecret } = getPortOneConfig();
    const payment = await fetchPortOnePayment(paymentId, apiSecret);
    if (!payment) {
      return ok({ success: true, ignored: true, reason: "payment_not_found" });
    }

    if (payment.storeId && payment.storeId !== storeId) {
      return ok({ success: true, ignored: true, reason: "store_mismatch" });
    }

    const { data: purchase, error: purchaseError } = await admin
      .from("point_purchases")
      .select("id, user_id, order_id, amount_krw, status")
      .eq("order_id", paymentId)
      .maybeSingle();

    if (purchaseError) {
      throw new Error(purchaseError.message);
    }
    if (!purchase) {
      return ok({ success: true, ignored: true, reason: "purchase_not_found" });
    }
    if (purchase.status === "completed") {
      return ok({ success: true, alreadyCompleted: true });
    }
    if (payment.currency && payment.currency !== "KRW") {
      return ok({ success: true, ignored: true, reason: "currency_mismatch" });
    }
    if (payment.status !== "PAID") {
      return ok({ success: true, ignored: true, reason: "payment_not_paid" });
    }
    if (Number(payment.amount?.total || 0) !== Number(purchase.amount_krw || 0)) {
      return ok({ success: true, ignored: true, reason: "amount_mismatch" });
    }

    const { error: completionError } = await admin.rpc("complete_point_purchase", {
      p_purchase_id: purchase.id,
      p_user_id: purchase.user_id,
      p_pg_transaction_id: payment.transactionId || body?.data?.transactionId || payment.id || paymentId,
      p_pg_payload: payment,
      p_paid_at: payment.paidAt || new Date().toISOString(),
    });

    if (completionError) {
      throw new Error(completionError.message);
    }

    return ok({ success: true, completed: true });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error("PortOne webhook verification failed:", {
        reason: error.reason,
        hasWebhookId: Boolean(request.headers.get("webhook-id")),
        hasWebhookSignature: Boolean(request.headers.get("webhook-signature")),
        hasWebhookTimestamp: Boolean(request.headers.get("webhook-timestamp")),
      });
      return new Response("Invalid webhook signature.", { status: 400 });
    }
    return mapRouteError(error);
  }
}
