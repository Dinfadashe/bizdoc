import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { initializePayment, generateReference } from '@/lib/paystack'
import { sendInvoiceEmail } from '@/lib/resend'

// POST /api/invoices/[id]/pay-link
// Generates a Paystack payment link and saves it to the invoice
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch the invoice with business info
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, businesses(name, email)')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
  }

  if (!invoice.client_email) {
    return NextResponse.json({ error: 'Client email is required to generate a payment link' }, { status: 400 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const reference = generateReference(invoice.id)
  const callbackUrl = `${APP_URL}/invoices/${invoice.id}/pay?ref=${reference}`

  // Initialize Paystack transaction
  const result = await initializePayment({
    email: invoice.client_email,
    amount: invoice.total,
    currency: invoice.currency,
    reference,
    callback_url: callbackUrl,
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      business_name: invoice.businesses?.name,
      client_name: invoice.client_name,
    },
  })

  if (!result.status) {
    return NextResponse.json({ error: result.message || 'Failed to create payment link' }, { status: 500 })
  }

  // Save reference and payment URL to invoice
  await supabaseAdmin
    .from('invoices')
    .update({
      paystack_reference: reference,
      paystack_access_code: result.data.access_code,
      payment_url: result.data.authorization_url,
      status: 'unpaid',
    })
    .eq('id', id)

  // Send email to client (if they have an email)
  if (invoice.client_email) {
    try {
      await sendInvoiceEmail(
        { ...invoice, paystack_reference: reference, payment_url: result.data.authorization_url },
        invoice.businesses?.name || 'Business'
      )
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr)
    }
  }

  return NextResponse.json({
    payment_url: result.data.authorization_url,
    reference,
  })
}
