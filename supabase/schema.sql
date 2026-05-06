-- Purela Dashboard — Supabase schema
-- Run this in your Supabase SQL editor to set up the required tables

-- Products / Inventory
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null unique,
  name        text not null,
  category    text,
  unit_cost   numeric(12,2) not null default 0,
  unit_price  numeric(12,2) not null default 0,
  stock_qty   integer not null default 0,
  stock_value numeric(12,2) generated always as (unit_cost * stock_qty) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Sales / Orders
create table if not exists sales (
  id          uuid primary key default gen_random_uuid(),
  order_ref   text,
  channel     text,           -- e.g. 'tokopedia', 'shopee', 'direct'
  status      text not null default 'completed',
  amount      numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- Sale line items
create table if not exists sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid references sales(id) on delete cascade,
  product_id  uuid references products(id),
  qty         integer not null,
  unit_price  numeric(12,2) not null,
  unit_cost   numeric(12,2) not null,
  subtotal    numeric(12,2) generated always as (unit_price * qty) stored,
  created_at  timestamptz not null default now()
);

-- Revenue summary RPC
create or replace function get_revenue_summary()
returns table (
  month       text,
  revenue     numeric,
  order_count bigint
)
language sql stable as $$
  select
    to_char(date_trunc('month', created_at), 'Mon YYYY') as month,
    sum(amount)                                           as revenue,
    count(*)                                             as order_count
  from sales
  where status = 'completed'
  group by date_trunc('month', created_at)
  order by date_trunc('month', created_at);
$$;

-- Profitability summary RPC
create or replace function get_profitability_summary()
returns table (
  month        text,
  revenue      numeric,
  cogs         numeric,
  gross_profit numeric,
  gross_margin numeric
)
language sql stable as $$
  select
    to_char(date_trunc('month', s.created_at), 'Mon YYYY') as month,
    sum(si.subtotal)                                         as revenue,
    sum(si.unit_cost * si.qty)                              as cogs,
    sum(si.subtotal - si.unit_cost * si.qty)                as gross_profit,
    round(
      sum(si.subtotal - si.unit_cost * si.qty)
      / nullif(sum(si.subtotal), 0) * 100,
      2
    )                                                        as gross_margin
  from sales s
  join sale_items si on si.sale_id = s.id
  where s.status = 'completed'
  group by date_trunc('month', s.created_at)
  order by date_trunc('month', s.created_at);
$$;

-- Row-level security (enable after verifying setup)
alter table products enable row level security;
alter table sales    enable row level security;
alter table sale_items enable row level security;
