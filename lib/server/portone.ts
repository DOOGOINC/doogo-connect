import "server-only";

export type PortOnePayment = {
  id?: string;
  storeId?: string;
  currency?: string;
  status?: string;
  paidAt?: string;
  transactionId?: string;
  amount?: {
    total?: number;
  };
};

export function getPortOneConfig() {
  const storeId = process.env.PORTONE_STORE_ID?.trim();
  const channelKey = process.env.PORTONE_CHANNEL_KEY?.trim();
  const apiSecret = process.env.PORTONE_API_SECRET?.trim();

  if (!storeId || !channelKey || !apiSecret) {
    throw new Error("SERVER_CONFIG_MISSING");
  }

  return { storeId, channelKey, apiSecret };
}

export async function fetchPortOnePayment(paymentId: string, apiSecret: string) {
  const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `PortOne ${apiSecret}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as (PortOnePayment & { message?: string }) | null;

  if (!response.ok) {
    throw new Error(payload?.message || "Failed to verify PortOne payment.");
  }

  return payload || null;
}
