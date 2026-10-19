-- The transfer date can be any calendar day within the billed month.
drop policy if exists payments_owner_insert on public.payments;
create policy payments_owner_insert on public.payments
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and status = 'pending_review'
  and reviewed_by is null
  and reviewed_at is null
  and rejection_reason is null
  and exists (
    select 1
    from public.member_bills mb
    join public.billing_periods bp on bp.id = mb.billing_period_id
    where mb.id = member_bill_id
      and mb.user_id = auth.uid()
      and amount_idr > 0
      and amount_idr <= mb.total_amount_idr - coalesce((
        select sum(p.amount_idr)
        from public.payments p
        where p.member_bill_id = mb.id and p.status = 'approved'
      ), 0)
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
