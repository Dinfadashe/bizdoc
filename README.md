# BizDoc — Invoice & Receipt Generator with Paystack

A full-stack Next.js 15 invoicing app with automatic payment collection and receipts.

## Features
- Create professional invoices
- One-click Paystack payment link generation (cards, bank transfer, USSD)
- Automatic invoice-to-receipt conversion on payment
- Auto-email receipt to client via Resend
- Dashboard with revenue stats
- Business profile settings

## Setup

### 1. Clone & Install
```bash
git clone <your-repo>
cd bizdoc
npm install
```

### 2. Supabase
1. Create a new project at supabase.com
2. Run `supabase/schema.sql` in the SQL Editor
3. Copy your Project URL and keys

### 3. Paystack
1. Sign up at paystack.com
2. Get your Secret Key and Public Key from Settings → API Keys
3. Set your webhook URL: `https://your-app.netlify.app/api/webhooks/paystack`

### 4. Environment Variables
Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
RESEND_API_KEY=re_7zWWDdZ6_M3K8u58c7MsghZUXhF5Rty3P
RESEND_FROM_EMAIL=info@charitytoken.net
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
```

### 5. Deploy to Netlify
```bash
git add . && git commit -m "initial" && git push
```
Connect repo in Netlify, add env vars in Site Settings → Environment Variables.

### 6. Paystack Webhook
In Paystack dashboard → Settings → Webhooks:
- URL: `https://your-app.netlify.app/api/webhooks/paystack`
- Events: `charge.success`

## Flow
1. Business logs in → fills Business Settings
2. Creates invoice → fills client info + line items
3. Clicks "Save & Send Invoice" → Paystack link generated + emailed to client
4. Client pays → webhook fires → invoice marked paid → receipt created + emailed
5. Business views receipt on dashboard
