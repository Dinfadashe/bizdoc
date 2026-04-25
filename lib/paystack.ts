const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE = "https://api.paystack.co";

function headers() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  };
}

export async function initializePayment({
  email,
  amountKobo,
  reference,
  metadata,
  callbackUrl,
  subaccountCode,
  platformFeePercent = 2,
}: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
  subaccountCode?: string;
  platformFeePercent?: number;
}) {
  const platformFeeKobo = subaccountCode
    ? Math.round((amountKobo * platformFeePercent) / 100)
    : undefined;

  const body: Record<string, unknown> = {
    email,
    amount: amountKobo,
    reference,
    metadata,
    callback_url: callbackUrl,
    channels: ["card", "bank", "ussd", "bank_transfer"],
  };

  if (subaccountCode) {
    body.subaccount = subaccountCode;
    body.bearer = "subaccount";
    body.transaction_charge = platformFeeKobo;
  }

  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message ?? "Paystack initialization failed");

  return {
    authorization_url: data.data.authorization_url as string,
    access_code: data.data.access_code as string,
    reference: data.data.reference as string,
  };
}

export async function verifyPayment(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${reference}`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message ?? "Paystack verification failed");
  return data.data as {
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    customer: { email: string; name: string };
    metadata: Record<string, unknown>;
  };
}

export async function createSubaccount({
  businessName,
  bankCode,
  accountNumber,
  percentageCharge = 98,
}: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  percentageCharge?: number;
}) {
  const res = await fetch(`${BASE}/subaccount`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      business_name: businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 100 - percentageCharge,
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message ?? "Failed to create subaccount");

  return {
    subaccount_code: data.data.subaccount_code as string,
    subaccount_id: String(data.data.id),
    account_name: data.data.account_name as string,
  };
}

export async function resolveBankAccount(accountNumber: string, bankCode: string) {
  const res = await fetch(
    `${BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    { headers: headers() }
  );
  const data = await res.json();
  if (!data.status) throw new Error(data.message ?? "Could not resolve account");
  return {
    account_name: data.data.account_name as string,
    account_number: data.data.account_number as string,
  };
}

export async function getBanks() {
  const res = await fetch(`${BASE}/bank?country=nigeria&perPage=100`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!data.status) throw new Error("Could not fetch banks");
  return data.data as { name: string; code: string; slug: string }[];
}

export async function createDedicatedVirtualAccount({
  firstName,
  lastName,
  email,
  phone,
  preferredBank = "wema-bank",
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferredBank?: string;
}) {
  // Step 1 — Create a Paystack customer
  const customerRes = await fetch(`${BASE}/customer`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? "",
    }),
  });
  const customerData = await customerRes.json();
  if (!customerData.status) throw new Error(customerData.message ?? "Failed to create customer");

  const customerCode = customerData.data.customer_code;

  // Step 2 — Assign a dedicated virtual account
  const dvaRes = await fetch(`${BASE}/dedicated_account`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: preferredBank,
    }),
  });

  const dvaData = await dvaRes.json();
  if (!dvaData.status) throw new Error(dvaData.message ?? "Failed to create virtual account");

  return {
    bank: dvaData.data.bank?.name as string,
    account_number: dvaData.data.account_number as string,
    account_name: dvaData.data.account_name as string,
    dva_reference: customerCode as string,
  };
}

export async function getDVABanks() {
  const res = await fetch(`${BASE}/dedicated_account/available_providers`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!data.status) throw new Error("Could not fetch DVA banks");
  return data.data as { provider_slug: string; bank_name: string; id: number }[];
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(body)
    .digest("hex");
  return hash === signature;
}