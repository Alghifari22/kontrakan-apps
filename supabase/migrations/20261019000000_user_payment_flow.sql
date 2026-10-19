-- Enforce the one-open-review rule even for simultaneous submissions.
create unique index if not exists one_pending_payment_per_bill
  on public.payments(member_bill_id)
  where status = 'pending_review';

drop policy if exists payments_owner_insert on public.payments;
create policy payments_owner_insert on public.payments
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and status = 'pending_review'
  and reviewed_by is null
  and reviewed_at is null
  and rejection_reason is null
  and transfer_date <= current_date
  and exists (
    select 1 from public.member_bills mb
    join public.billing_periods bp on bp.id = mb.billing_period_id
    where mb.id = member_bill_id
      and mb.user_id = auth.uid()
      and mb.total_amount_idr = amount_idr
      and bp.status = 'published'
      and exists (
        select 1 from storage.objects object
        where object.bucket_id = 'payment-proofs'
          and object.name = proof_storage_path
          and (storage.foldername(object.name))[1] = bp.household_id::text
          and (storage.foldername(object.name))[2] = auth.uid()::text
      )
  )
);

drop policy if exists payment_proofs_owner_delete on storage.objects;
create policy payment_proofs_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_household_member(((storage.foldername(name))[1])::uuid)
);
