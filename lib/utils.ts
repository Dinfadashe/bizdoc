export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", EUR: "€",
};

export function formatCurrency(amount: number, currency = "NGN"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}${m}-${rand}`;
}

export function generateReceiptNumber(invoiceNumber: string): string {
  return invoiceNumber.replace("INV-", "RCP-");
}

export function calcTotals(
  items: { qty: number; unit_price: number }[],
  discountType: "percent" | "flat",
  discountValue: number,
  taxRate: number
) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const discountAmount =
    discountType === "percent"
      ? (subtotal * discountValue) / 100
      : discountValue;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * taxRate) / 100;
  const total = taxable + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
}

// Convert kobo (Paystack) → naira
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

// Convert naira → kobo for Paystack
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}
