export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  currency: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  items: LineItem[];
  subtotal: number;
  discount_type: "percent" | "flat";
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string;
  payment_info: string;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  paystack_reference: string | null;
  payment_url: string | null;
  display_account_id: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  invoice_id: string;
  receipt_number: string;
  amount_paid: number;
  payment_method: string;
  paystack_reference: string;
  paid_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string;
  currency: string;
}

