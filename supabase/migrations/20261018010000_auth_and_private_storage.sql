create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf']
where id = 'payment-proofs';

drop policy if exists payment_proofs_member_upload on storage.objects;
create policy payment_proofs_member_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_household_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists payment_proofs_member_or_admin_read on storage.objects;
create policy payment_proofs_member_or_admin_read on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.is_household_admin(((storage.foldername(name))[1])::uuid)
  )
);

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
    select 1 from public.member_bills mb
    join public.billing_periods bp on bp.id = mb.billing_period_id
    where mb.id = member_bill_id
      and mb.user_id = auth.uid()
      and mb.total_amount_idr = amount_idr
      and bp.status = 'published'
  )
);

