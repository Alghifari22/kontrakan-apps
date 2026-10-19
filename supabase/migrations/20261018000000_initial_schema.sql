create extension if not exists pgcrypto;

create type public.member_role as enum ('admin', 'user');
create type public.membership_status as enum ('active', 'inactive', 'invited');
create type public.billing_period_status as enum ('draft', 'published', 'archived');
create type public.expense_type as enum ('fixed', 'variable');
create type public.payment_status as enum ('pending_review', 'approved', 'rejected');
create type public.rotation_status as enum ('upcoming', 'completed', 'skipped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
create table public.households (
  id uuid primary key default gen_random_uuid(), name text not null,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.household_members (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, role public.member_role not null default 'user',
  membership_status public.membership_status not null default 'active', joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create table public.billing_periods (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  period_month date not null, status public.billing_period_status not null default 'draft',
  created_by uuid not null references public.profiles(id), published_at timestamptz, created_at timestamptz not null default now(),
  unique (household_id, period_month), check (period_month = date_trunc('month', period_month)::date)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), billing_period_id uuid not null references public.billing_periods(id) on delete cascade,
  name text not null, category text not null, expense_type public.expense_type not null, amount_idr bigint not null check (amount_idr > 0),
  notes text, created_at timestamptz not null default now()
);
create table public.expense_participants (
  id uuid primary key default gen_random_uuid(), expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id), share_amount_idr bigint not null default 0 check (share_amount_idr >= 0),
  unique (expense_id, user_id)
);
create table public.member_bills (
  id uuid primary key default gen_random_uuid(), billing_period_id uuid not null references public.billing_periods(id) on delete cascade,
  user_id uuid not null references public.profiles(id), total_amount_idr bigint not null check (total_amount_idr >= 0), created_at timestamptz not null default now(),
  unique (billing_period_id, user_id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), member_bill_id uuid not null references public.member_bills(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id), amount_idr bigint not null check (amount_idr > 0), transfer_date date not null,
  proof_storage_path text not null, status public.payment_status not null default 'pending_review', reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz, rejection_reason text, created_at timestamptz not null default now(),
  check ((status = 'rejected' and rejection_reason is not null) or status <> 'rejected')
);
create unique index one_approved_payment_per_bill on public.payments(member_bill_id) where status = 'approved';
create table public.water_rotation_settings (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  interval_days integer not null check (interval_days > 0), start_date date not null, is_active boolean not null default true
);
create table public.water_rotation_turns (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  assigned_user_id uuid not null references public.profiles(id), scheduled_date date not null, status public.rotation_status not null default 'upcoming', notes text,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id), action text not null, entity_type text not null, entity_id uuid not null,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create index household_members_user_idx on public.household_members(user_id, membership_status);
create index billing_periods_household_idx on public.billing_periods(household_id, period_month desc);
create index payments_status_idx on public.payments(status, created_at desc);
create index rotation_turns_household_date_idx on public.water_rotation_turns(household_id, scheduled_date);

create or replace function public.is_household_member(target_household uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.household_members where household_id = target_household and user_id = auth.uid() and membership_status = 'active');
$$;
create or replace function public.is_household_admin(target_household uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.household_members where household_id = target_household and user_id = auth.uid() and role = 'admin' and membership_status = 'active');
$$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.billing_periods enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.member_bills enable row level security;
alter table public.payments enable row level security;
alter table public.water_rotation_settings enable row level security;
alter table public.water_rotation_turns enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_member on public.profiles for select using (id = auth.uid() or exists (select 1 from public.household_members hm where hm.user_id = profiles.id and public.is_household_member(hm.household_id)));
create policy households_member_read on public.households for select using (public.is_household_member(id));
create policy household_members_member_read on public.household_members for select using (public.is_household_member(household_id));
create policy household_members_admin_write on public.household_members for all using (public.is_household_admin(household_id)) with check (public.is_household_admin(household_id));
create policy billing_periods_member_read on public.billing_periods for select using (public.is_household_member(household_id));
create policy billing_periods_admin_write on public.billing_periods for all using (public.is_household_admin(household_id)) with check (public.is_household_admin(household_id));
create policy expenses_member_read on public.expenses for select using (exists (select 1 from public.billing_periods bp where bp.id = billing_period_id and public.is_household_member(bp.household_id)));
create policy expenses_admin_write on public.expenses for all using (exists (select 1 from public.billing_periods bp where bp.id = billing_period_id and public.is_household_admin(bp.household_id)));
create policy participants_member_read on public.expense_participants for select using (exists (select 1 from public.expenses e join public.billing_periods bp on bp.id = e.billing_period_id where e.id = expense_id and public.is_household_member(bp.household_id)));
create policy participants_admin_write on public.expense_participants for all using (exists (select 1 from public.expenses e join public.billing_periods bp on bp.id = e.billing_period_id where e.id = expense_id and public.is_household_admin(bp.household_id)));
create policy member_bills_owner_or_admin_read on public.member_bills for select using (user_id = auth.uid() or exists (select 1 from public.billing_periods bp where bp.id = billing_period_id and public.is_household_admin(bp.household_id)));
create policy payments_owner_read on public.payments for select using (submitted_by = auth.uid() or exists (select 1 from public.member_bills mb join public.billing_periods bp on bp.id = mb.billing_period_id where mb.id = member_bill_id and public.is_household_admin(bp.household_id)));
create policy payments_owner_insert on public.payments for insert with check (submitted_by = auth.uid() and exists (select 1 from public.member_bills mb where mb.id = member_bill_id and mb.user_id = auth.uid()));
create policy rotation_member_read on public.water_rotation_turns for select using (public.is_household_member(household_id));
create policy rotation_admin_write on public.water_rotation_turns for all using (public.is_household_admin(household_id)) with check (public.is_household_admin(household_id));
create policy rotation_settings_member_read on public.water_rotation_settings for select using (public.is_household_member(household_id));
create policy rotation_settings_admin_write on public.water_rotation_settings for all using (public.is_household_admin(household_id)) with check (public.is_household_admin(household_id));
create policy audit_admin_read on public.audit_logs for select using (public.is_household_admin(household_id));

insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false) on conflict (id) do nothing;
