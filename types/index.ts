export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR'
export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'cancelled'
export type DiscountType = 'percent' | 'flat'

export interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  amount: number
}

export interface Business {
  id: string
  user_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  logo_url?: string
  currency: Currency
  created_at: string
}

export interface Invoice {
  id: string
  business_id: string
  invoice_number: string
  status: InvoiceStatus
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  items: LineItem[]
  subtotal: number
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: Currency
  issue_date: string
  due_date?: string
  paid_at?: string
  paystack_reference?: string
  payment_url?: string
  notes?: string
  payment_info?: string
  created_at: string
  updated_at: string
  // joined
  businesses?: Business
}

export interface Receipt {
  id: string
  invoice_id: string
  receipt_number: string
  paid_at: string
  amount_paid: number
  payment_channel?: string
  paystack_reference?: string
  created_at: string
  // joined
  invoices?: Invoice
}

export interface CreateInvoicePayload {
  business_id: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  items: LineItem[]
  subtotal: number
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: Currency
  issue_date: string
  due_date?: string
  notes?: string
  payment_info?: string
}
