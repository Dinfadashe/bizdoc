-- =========================================================
-- BizDoc Schema
-- Run this in your Supabase SQL Editor
-- =========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────
-- BUSINESSES
-- Each user has one business profile
-- ─────────────────────────────────────────────────────────
create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null default '',
  email text,
  phone text,
  address text,
  logo_url text,
  currency text default 'NGN',
  created_at timestamptz default now()
);

alter table businesses enable row level security;
create policy "owner_all" on businesses for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_number text not null,
  status text not null default 'draft', -- draft | sent | paid | overdue | cancelled
  currency text default 'NGN',

  -- Client info (denormalised for portability)
  client_name text,
  client_email text,
  client_phone text,
  client_address text,

  -- Line items stored as JSONB array: [{description, qty, unit_price}]
  items jsonb not null default '[]',

  subtotal numeric(14,2) default 0,
  discount_type text default 'percent',   -- percent | flat
  discount_value numeric(14,2) default 0,
  discount_amount numeric(14,2) default 0,
  tax_rate numeric(5,2) default 7.5,
  tax_amount numeric(14,2) default 0,
  total numeric(14,2) default 0,

  notes text,
  payment_info text,

  issue_date date default current_date,
  due_date date,
  paid_at timestamptz,

  -- Paystack
  paystack_reference text unique,
  paystack_access_code text,
  payment_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table invoices enable row level security;

-- Business owner can do everything
create policy "owner_all" on invoices for all using (auth.uid() = user_id);

-- Anyone with the invoice link can read it (for client pay page)
create policy "public_read_by_id" on invoices for select using (true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger invoices_updated_at
  before update on invoices
  for each row execute procedure update_updated_at();

-- ─────────────────────────────────────────────────────────
-- RECEIPTS (auto-created when invoice is marked paid)
-- ─────────────────────────────────────────────────────────
create table if not exists receipts (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  receipt_number text not null,
  amount_paid numeric(14,2),
  payment_method text,
  paystack_reference text,
  paid_at timestamptz default now(),
  emailed_at timestamptz,
  created_at timestamptz default now()
);

alter table receipts enable row level security;
create policy "owner_all" on receipts for all using (auth.uid() = user_id);
create policy "public_read_by_invoice" on receipts for select using (true);
