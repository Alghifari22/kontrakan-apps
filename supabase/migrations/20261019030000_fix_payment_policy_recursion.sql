-- Read approved installments without re-entering payments RLS policies.
create or replace function public.can_submit_payment_installment(
  p_member_bill_id uuid,
  p_amount_idr bigint
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.member_bills mb
    where mb.id = p_member_bill_id
      and mb.user_id = auth.uid()
      and p_amount_idr > 0
      and p_amount_idr <= mb.total_amount_idr - coalesce((
        select sum(p.amount_idr)
        from public.payments p
        where p.member_bill_id = mb.id and p.status = 'approved'
      ), 0)
  );
$$;

revoke all on function public.can_submit_payment_installment(uuid, bigint) from public;
grant execute on function public.can_submit_payment_installment(uuid, bigint) to authenticated;

drop policy if exists payments_owner_insert on public.payments;
create policy payments_owner_insert on public.payments
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and status = 'pending_review'
  and reviewed_by is null
  and reviewed_at is null
  and rejection_reason is null
  and public.can_submit_payment_installment(member_bill_id, amount_idr)
  and exists (
    select 1
    from public.member_bills mb
    join public.billing_periods bp on bp.id = mb.billing_period_id
    where mb.id = member_bill_id
      and mb.user_id = auth.uid()
      and bp.status = 'published'
      and transfer_date >= bp.period_month
      and transfer_date < (bp.period_month + interval '1 month')::date
      and exists (
        select 1 from storage.objects object
        where object.bucket_id = 'payment-proofs'
          and object.name = proof_storage_path
          and (storage.foldername(object.name))[1] = bp.household_id::text
          and (storage.foldername(object.name))[2] = auth.uid()::text
      )
  )
);
