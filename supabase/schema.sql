-- Orbit family tracker schema
-- Run this file in Supabase SQL Editor after creating a project.
-- Money is stored as integer paise in the database. The UI converts to rupees.

create extension if not exists "pgcrypto";

create type public.family_role as enum ('admin', 'member');
create type public.reward_type as enum ('percentage', 'fixed', 'points', 'miles', 'cashback');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.family_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  name text not null,
  issuer text not null,
  last_four varchar(4) not null check (last_four ~ '^[0-9]{4}$'),
  card_type text not null default 'Credit card',
  billing_cycle_start smallint not null default 1 check (billing_cycle_start between 1 and 31),
  billing_cycle_end smallint not null default 0 check (billing_cycle_end between 0 and 31),
  monthly_spend_target integer not null default 0 check (monthly_spend_target >= 0),
  annual_fee integer not null default 0 check (annual_fee >= 0),
  annual_fee_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  icon text not null default 'circle-dot',
  unique (family_id, name)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  unique (family_id, name)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  card_id uuid not null references public.cards(id),
  created_by uuid not null references public.profiles(id),
  amount integer not null check (amount > 0),
  merchant text not null,
  category_id uuid references public.categories(id),
  date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_tags (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (expense_id, tag_id)
);

create table public.card_rules (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  category text not null,
  tag text,
  minimum_spend integer,
  maximum_spend integer,
  reward_type public.reward_type not null,
  reward_value numeric(12, 4) not null default 0,
  reward_description text not null,
  priority integer not null default 0,
  active boolean not null default true,
  valid_from date,
  valid_until date
);

create index expenses_family_date_idx on public.expenses(family_id, date desc);
create index cards_family_idx on public.cards(family_id);

create or replace function public.is_family_member(target_family uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family and user_id = auth.uid()
  );
$$;

create or replace function public.is_family_admin(target_family uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family and user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.cards enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_tags enable row level security;
alter table public.card_rules enable row level security;

create policy "profiles are visible to family members" on public.profiles for select using (
  exists (select 1 from public.family_members fm join public.family_members mine on mine.family_id = fm.family_id where fm.user_id = profiles.id and mine.user_id = auth.uid())
);
create policy "users update their profile" on public.profiles for update using (id = auth.uid());
create policy "members see their families" on public.families for select using (public.is_family_member(id));
create policy "members see family membership" on public.family_members for select using (public.is_family_member(family_id));
create policy "admins manage family membership" on public.family_members for all using (public.is_family_admin(family_id));
create policy "members see cards" on public.cards for select using (public.is_family_member(family_id));
create policy "admins manage cards" on public.cards for all using (public.is_family_admin(family_id));
create policy "members see categories" on public.categories for select using (public.is_family_member(family_id));
create policy "admins manage categories" on public.categories for all using (public.is_family_admin(family_id));
create policy "members see tags" on public.tags for select using (public.is_family_member(family_id));
create policy "admins manage tags" on public.tags for all using (public.is_family_admin(family_id));
create policy "members see expenses" on public.expenses for select using (public.is_family_member(family_id));
create policy "members add expenses" on public.expenses for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "owners edit expenses" on public.expenses for update using (created_by = auth.uid() or public.is_family_admin(family_id));
create policy "owners delete expenses" on public.expenses for delete using (created_by = auth.uid() or public.is_family_admin(family_id));
create policy "members see expense tags" on public.expense_tags for select using (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_family_member(e.family_id))
);
create policy "members manage expense tags" on public.expense_tags for all using (
  exists (select 1 from public.expenses e where e.id = expense_id and (e.created_by = auth.uid() or public.is_family_admin(e.family_id)))
);
create policy "members see rules" on public.card_rules for select using (
  exists (select 1 from public.cards c where c.id = card_id and public.is_family_member(c.family_id))
);
create policy "admins manage rules" on public.card_rules for all using (
  exists (select 1 from public.cards c where c.id = card_id and public.is_family_admin(c.family_id))
);

-- Enable realtime for the tables the client watches.
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.card_rules;
alter publication supabase_realtime add table public.family_members;