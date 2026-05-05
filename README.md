# BizDoc — Professional Invoicing for Nigerian Businesses

BizDoc is a full-stack Next.js 15 invoicing application built for Nigerian small businesses. Create and send professional invoices, collect payments via bank transfer or USSD, auto-generate receipts, and manage your team — all in one place.

---

## Features

### Invoicing
- Create professional invoices with line items, discounts, and tax
- Multi-currency support (NGN and others)
- Draft invoices — editable and deletable before sending
- Pending invoices — sent to clients, expire naturally
- Paid invoices — permanent record, cannot be deleted
- Download invoice as PDF or print directly
- QR code on every invoice links to the client pay page

### Payment Collection
- Dedicated public pay page (`/invoices/[id]/pay`) — no login required for clients
- Bank transfer details pulled from your connected business account
- USSD shortcut codes for 8 Nigerian banks (GTBank, Zenith, Access, First Bank, UBA, OPay, Kuda, Sterling) — tap to open phone dialer pre-filled
- Payment link emailed to client automatically on sending

### Receipts
- Auto-generated receipt on payment confirmation
- Receipt emailed to client via Resend
- Viewable and printable from dashboard

### Business Settings
- **Profile tab** — business name, logo, email, phone, address
- **Accounts tab** — connect multiple bank accounts (NGN + foreign currencies), set a default account shown on all invoices
- **Catalog tab** — save reusable products/services with prices for quick invoice entry
- **Team tab** — invite team members by email, manage access

### Dashboard
- Revenue stats and invoice overview
- Filter invoices by status (draft, sent, paid)
- Reports export

### Subscription
- Free to get started
- Monthly plan: ₦1,500/month
- Annual plan: ₦15,000/year (save ~17%)
- Subscription managed via Paystack (used only for subscription billing, not invoice payments)

---

## Tech Stack

- **Framework** — Next.js 15 (App Router)
- **Database & Auth** — Supabase (PostgreSQL + Row Level Security)
- **Email** — Resend
- **Subscription billing** — Paystack (subscription only)
- **PDF generation** — jsPDF + html2canvas
- **Deployment** — Netlify

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/Dinfadashe/bizdoc.git
cd bizdoc
npm install
```

### 2. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run `supabase/schema.sql`
3. Copy your **Project URL**, **Anon Key**, and **Service Role Key**

### 3. Resend (Email)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your sending domain

### 4. Paystack (Subscription billing only)

1. Sign up at [paystack.com](https://paystack.com)
2. Get your **Secret Key** and **Public Key** from Settings → API Keys
3. Set your webhook URL in Paystack dashboard → Settings → Webhooks:
   - URL: `https://your-app.netlify.app/api/webhooks/paystack`
   - Events: `charge.success`

> Paystack is used **only** for subscription payments. Invoice payments are collected directly via bank transfer and USSD — no payment gateway fees on invoices.

### 5. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=invoices@yourdomain.com

NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
```

### 6. Deploy to Netlify

```bash
git add .
git commit -m "initial deploy"
git push
```

1. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
2. Select your repository
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add all environment variables under **Site Settings → Environment Variables**
6. Deploy

---

## How It Works

### For the Business Owner
1. Sign up and fill in your **Business Profile** (name, logo, address)
2. Go to **Settings → Accounts** and add your bank account — this is the account that appears on all invoices
3. Optionally add products/services to your **Catalog** for quick invoice creation
4. Create an invoice — fill in client details, add line items from your catalog or manually
5. Save as **Draft** to edit later, or **Send Invoice** to email the client a payment link
6. When the client pays, mark the invoice as paid and a receipt is auto-generated and emailed

### For the Client
1. Client receives an email with a **"View Invoice & Pay"** button
2. The button opens a public pay page showing the full invoice — no login needed
3. Pay page shows your bank account details (bank, account number, account name) and USSD shortcut codes for 8 banks
4. Client taps their bank's USSD code — their phone dialer opens pre-filled with the transfer code
5. Client dials, bank responds asking to confirm account and enter PIN — transfer completes on their phone

---

## Invoice Lifecycle

```
Draft → Sent/Pending → Paid
  ↓
(deletable)   (expires naturally)   (permanent)
```

- **Draft** — editable, deletable
- **Sent/Pending** — awaiting payment, cannot be deleted, expires if overdue
- **Paid** — permanent record, cannot be deleted

---

## Project Structure

```
app/
  page.tsx                        # Landing / login
  dashboard/page.tsx              # Main dashboard
  invoices/
    new/page.tsx                  # Create invoice
    [id]/page.tsx                 # Invoice detail view
    [id]/edit/page.tsx            # Edit draft invoice
    [id]/pay/page.tsx             # Public pay page (no auth)
    [id]/receipt/page.tsx         # Receipt view
  settings/page.tsx               # Business settings (profile, accounts, catalog, team)
  subscribe/page.tsx              # Subscription plans
  faq/page.tsx
  privacy/page.tsx
  terms/page.tsx

app/api/
  invoices/[id]/
    route.ts                      # GET, PATCH, DELETE invoice
    payment-link/route.ts         # Send invoice + generate pay page URL
  business-accounts/route.ts      # CRUD for connected bank accounts
  banks/route.ts                  # Nigerian bank list
  banks/resolve/route.ts          # Resolve account name from account number
  reports/route.ts                # Revenue reports
  subscription/route.ts           # Subscription status
  team/route.ts                   # Team management
  webhooks/paystack/route.ts      # Paystack webhook (subscription payments)

supabase/
  schema.sql                      # Full database schema
```

---

## USSD Payment Codes

The following shortcut codes are shown on invoices and the pay page. Each code is dialed from the **sender's bank** — the destination is always the business's connected account.

| Bank | Format |
|---|---|
| GTBank | `*737*2*{amount}*{account}#` |
| Zenith Bank | `*966*{amount}*{account}#` |
| Access Bank | `*901*000*{account}*{amount}#` |
| First Bank | `*894*{account}*{amount}#` |
| UBA | `*919*3*{account}*{amount}#` |
| OPay | `*955*{account}*{amount}#` |
| Kuda | `*5573*{account}*{amount}#` |
| Sterling | `*822*3*{account}*{amount}#` |

> Tapping a code opens the phone dialer pre-filled. The bank's USSD system then prompts the sender to confirm the beneficiary account and enter their PIN to complete the transfer.

---

## License

MIT
