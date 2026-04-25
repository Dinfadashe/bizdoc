// Paystack API helpers (server-side only)

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE = "https://api.paystack.co";

interface PaystackHeaders {
  Authorization: string;
  "Content-Type": string;
}

function headers(): PaystackHeaders {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  };
}

// Initialize a transaction and return the payment URL
export async function initializePayment({
  email,
  amountKobo,
  reference,
  metadata,
  callbackUrl,
}: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
}) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      metadata,
      callback_url: callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
  });

  const data = await res.json();

  if (!data.status) {
    throw new Error(data.message ?? "Paystack initialization failed");
  }

  return {
    authorization_url: data.data.authorization_url as string,
    access_code: data.data.access_code as string,
    reference: data.data.reference as string,
  };
}

// Verify a transaction by reference
export async function verifyPayment(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${reference}`, {
    headers: headers(),
  });

  const data = await res.json();

  if (!data.status) {
    throw new Error(data.message ?? "Paystack verification failed");
  }

  return data.data as {
    status: string; // "success" | "failed" | "abandoned"
    reference: string;
    amount: number; // in kobo
    paid_at: string;
    channel: string;
    currency: string;
    customer: { email: string; name: string };
    metadata: Record<string, unknown>;
  };
}

// Verify a webhook signature
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(body)
    .digest("hex");
  return hash === signature;
}
