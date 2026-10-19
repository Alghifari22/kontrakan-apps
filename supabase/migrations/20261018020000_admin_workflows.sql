-- Keep published billing data immutable to normal authenticated requests.
drop policy if exists billing_periods_admin_write on public.billing_periods;
create policy billing_periods_admin_create_draft on public.billing_periods
for insert to authenticated
with check (
  status = 'draft'
  and created_by = auth.uid()
  and public.is_household_admin(household_id)
);
create policy billing_periods_admin_update_draft on public.billing_periods
for update to authenticated
using (status = 'draft' and public.is_household_admin(household_id))
with check (status = 'draft' and public.is_household_admin(household_id));
create policy billing_periods_admin_delete_draft on public.billing_periods
for delete to authenticated
using (status = 'draft' and public.is_household_admin(household_id));

drop policy if exists expenses_admin_write on public.expenses;
create policy expenses_admin_write_draft on public.expenses
for all to authenticated
using (exists (
  select 1 from public.billing_periods bp
  where bp.id = billing_period_id and bp.status = 'draft'
    and public.is_household_admin(bp.household_id)
))
with check (exists (
  select 1 from public.billing_periods bp
  where bp.id = billing_period_id and bp.status = 'draft'
    and public.is_household_admin(bp.household_id)
));

drop policy if exists participants_admin_write on public.expense_participants;
create policy participants_admin_write_draft on public.expense_participants
for all to authenticated
using (exists (
  select 1 from public.expenses e
  join public.billing_periods bp on bp.id = e.billing_period_id
  where e.id = expense_id and bp.status = 'draft'
    and public.is_household_admin(bp.household_id)
))
with check (exists (
  select 1 from public.expenses e
  join public.billing_periods bp on bp.id = e.billing_period_id
  where e.id = expense_id and bp.status = 'draft'
    and public.is_household_admin(bp.household_id)
));

create or replace function public.publish_billing_period(p_period_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_period public.billing_periods%rowtype;
  expense_record record;
  participant_count integer;
begin
  select * into target_period
  from public.billing_periods
  where id = p_period_id
  for update;

  if not found or not public.is_household_admin(target_period.household_id) then
    raise exception 'Periode tidak ditemukan atau akses admin ditolak.';
  end if;
  if target_period.status <> 'draft' then
    raise exception 'Hanya periode draf yang dapat diterbitkan.';
  end if;
  if not exists (select 1 from public.expenses where billing_period_id = p_period_id) then
    raise exception 'Tambahkan minimal satu pengeluaran sebelum menerbitkan tagihan.';
  end if;

  for expense_record in
    select id, amount_idr from public.expenses where billing_period_id = p_period_id
  loop
    select count(*) into participant_count
    from public.expense_participants ep
    join public.household_members hm
      on hm.user_id = ep.user_id
     and hm.household_id = target_period.household_id
     and hm.membership_status = 'active'
    where ep.expense_id = expense_record.id;

    if participant_count = 0 then
      raise exception 'Setiap pengeluaran harus memiliki minimal satu peserta aktif.';
    end if;
    if participant_count <> (
      select count(*) from public.expense_participants where expense_id = expense_record.id
    ) then
      raise exception 'Peserta pengeluaran harus anggota aktif rumah ini.';
    end if;

    with ranked as (
      select ep.id,
        row_number() over (order by ep.user_id) as position,
        count(*) over () as total
      from public.expense_participants ep
      where ep.expense_id = expense_record.id
    )
    update public.expense_participants ep
    set share_amount_idr = (expense_record.amount_idr / ranked.total)
      + case when ranked.position <= (expense_record.amount_idr % ranked.total) then 1 else 0 end
    from ranked
    where ep.id = ranked.id;
  end loop;

  insert into public.member_bills (billing_period_id, user_id, total_amount_idr)
  select p_period_id, hm.user_id, coalesce(sum(ep.share_amount_idr), 0)
  from public.household_members hm
  left join public.expenses e on e.billing_period_id = p_period_id
  left join public.expense_participants ep on ep.expense_id = e.id and ep.user_id = hm.user_id
  where hm.household_id = target_period.household_id
    and hm.membership_status = 'active'
  group by hm.user_id
  on conflict (billing_period_id, user_id) do update
    set total_amount_idr = excluded.total_amount_idr;

  update public.billing_periods
  set status = 'published', published_at = now()
  where id = p_period_id;

  insert into public.audit_logs (household_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_period.household_id, auth.uid(), 'billing_period.published', 'billing_period', p_period_id,
    jsonb_build_object('period_month', target_period.period_month));
end;
$$;

create or replace function public.review_payment(
  p_payment_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_record public.payments%rowtype;
  target_household uuid;
begin
  select p.* into payment_record
  from public.payments p
  join public.member_bills mb on mb.id = p.member_bill_id
  join public.billing_periods bp on bp.id = mb.billing_period_id
  where p.id = p_payment_id
  for update of p;

  if not found then raise exception 'Pembayaran tidak ditemukan.'; end if;
  select bp.household_id into target_household
  from public.payments p
  join public.member_bills mb on mb.id = p.member_bill_id
  join public.billing_periods bp on bp.id = mb.billing_period_id
  where p.id = p_payment_id;

  if not public.is_household_admin(target_household) then
    raise exception 'Akses admin ditolak.';
  end if;
  if payment_record.status <> 'pending_review' then
    raise exception 'Bukti ini sudah diproses.';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Keputusan tidak valid.';
  end if;
  if p_decision = 'rejected' and nullif(trim(p_rejection_reason), '') is null then
    raise exception 'Alasan penolakan wajib diisi.';
  end if;

  update public.payments
  set status = p_decision::public.payment_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = case when p_decision = 'rejected' then trim(p_rejection_reason) else null end
  where id = p_payment_id;

  insert into public.audit_logs (household_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_household, auth.uid(), 'payment.' || p_decision, 'payment', p_payment_id,
    jsonb_build_object('reason', case when p_decision = 'rejected' then trim(p_rejection_reason) else null end));
end;
$$;

create or replace function public.create_expense_with_participants(
  p_period_id uuid,
  p_name text,
  p_category text,
  p_expense_type public.expense_type,
  p_amount_idr bigint,
  p_notes text,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_period public.billing_periods%rowtype;
  new_expense_id uuid;
  participant_id uuid;
begin
  select * into target_period from public.billing_periods where id = p_period_id for update;
  if not found or not public.is_household_admin(target_period.household_id) then
    raise exception 'Periode tidak ditemukan atau akses admin ditolak.';
  end if;
  if target_period.status <> 'draft' then raise exception 'Pengeluaran hanya dapat ditambahkan ke periode draf.'; end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_category), '') is null then
    raise exception 'Nama dan kategori pengeluaran wajib diisi.';
  end if;
  if p_amount_idr is null or p_amount_idr <= 0 then raise exception 'Nominal harus lebih besar dari nol.'; end if;
  if coalesce(array_length(p_participant_ids, 1), 0) = 0 then raise exception 'Pilih minimal satu peserta.'; end if;
  if exists (
    select 1 from unnest(p_participant_ids) as requested(user_id)
    left join public.household_members hm on hm.user_id = requested.user_id
      and hm.household_id = target_period.household_id and hm.membership_status = 'active'
    where hm.id is null
  ) then raise exception 'Peserta harus anggota aktif rumah ini.'; end if;

  insert into public.expenses (billing_period_id, name, category, expense_type, amount_idr, notes)
  values (p_period_id, trim(p_name), trim(p_category), p_expense_type, p_amount_idr, nullif(trim(p_notes), ''))
  returning id into new_expense_id;

  foreach participant_id in array p_participant_ids loop
    insert into public.expense_participants (expense_id, user_id)
    values (new_expense_id, participant_id)
    on conflict (expense_id, user_id) do nothing;
  end loop;

  insert into public.audit_logs (household_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_period.household_id, auth.uid(), 'expense.created', 'expense', new_expense_id,
    jsonb_build_object('name', trim(p_name), 'amount_idr', p_amount_idr));
  return new_expense_id;
end;
$$;

revoke all on function public.publish_billing_period(uuid) from public;
revoke all on function public.review_payment(uuid, text, text) from public;
revoke all on function public.create_expense_with_participants(uuid, text, text, public.expense_type, bigint, text, uuid[]) from public;
grant execute on function public.publish_billing_period(uuid) to authenticated;
grant execute on function public.review_payment(uuid, text, text) to authenticated;
grant execute on function public.create_expense_with_participants(uuid, text, text, public.expense_type, bigint, text, uuid[]) to authenticated;
