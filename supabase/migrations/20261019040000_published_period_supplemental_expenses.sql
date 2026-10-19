create or replace function public.add_expense_to_published_period(
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
  participant_count integer;
begin
  select * into target_period
  from public.billing_periods
  where id = p_period_id
  for update;

  if not found or not public.is_household_admin(target_period.household_id) then
    raise exception 'Periode tidak ditemukan atau akses admin ditolak.';
  end if;
  if target_period.status <> 'published' then
    raise exception 'Pengeluaran susulan hanya dapat ditambahkan ke periode terbit.';
  end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_category), '') is null then
    raise exception 'Nama dan kategori pengeluaran wajib diisi.';
  end if;
  if p_amount_idr is null or p_amount_idr <= 0 then
    raise exception 'Nominal harus lebih besar dari nol.';
  end if;
  if coalesce(array_length(p_participant_ids, 1), 0) = 0 then
    raise exception 'Pilih minimal satu peserta.';
  end if;
  select count(distinct requested.user_id) into participant_count
  from unnest(p_participant_ids) as requested(user_id);
  if participant_count <> array_length(p_participant_ids, 1) then
    raise exception 'Daftar peserta tidak valid.';
  end if;
  if exists (
    select 1
    from unnest(p_participant_ids) as requested(user_id)
    left join public.household_members hm
      on hm.user_id = requested.user_id
     and hm.household_id = target_period.household_id
     and hm.membership_status = 'active'
    where hm.id is null
  ) then
    raise exception 'Peserta harus anggota aktif rumah ini.';
  end if;

  insert into public.expenses (billing_period_id, name, category, expense_type, amount_idr, notes)
  values (p_period_id, trim(p_name), trim(p_category), p_expense_type, p_amount_idr, nullif(trim(p_notes), ''))
  returning id into new_expense_id;

  insert into public.expense_participants (expense_id, user_id)
  select new_expense_id, requested.user_id
  from unnest(p_participant_ids) as requested(user_id);

  with ranked as (
    select ep.id,
      row_number() over (order by ep.user_id) as position,
      count(*) over () as total
    from public.expense_participants ep
    where ep.expense_id = new_expense_id
  )
  update public.expense_participants ep
  set share_amount_idr = (p_amount_idr / ranked.total)
    + case when ranked.position <= (p_amount_idr % ranked.total) then 1 else 0 end
  from ranked
  where ep.id = ranked.id;

  insert into public.member_bills (billing_period_id, user_id, total_amount_idr)
  select p_period_id, ep.user_id, ep.share_amount_idr
  from public.expense_participants ep
  where ep.expense_id = new_expense_id
  on conflict (billing_period_id, user_id) do update
    set total_amount_idr = public.member_bills.total_amount_idr + excluded.total_amount_idr;

  insert into public.audit_logs (household_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_period.household_id, auth.uid(), 'expense.supplemental_created', 'expense', new_expense_id,
    jsonb_build_object('name', trim(p_name), 'amount_idr', p_amount_idr, 'period_month', target_period.period_month));

  return new_expense_id;
end;
$$;

revoke all on function public.add_expense_to_published_period(uuid, text, text, public.expense_type, bigint, text, uuid[]) from public;
grant execute on function public.add_expense_to_published_period(uuid, text, text, public.expense_type, bigint, text, uuid[]) to authenticated;
