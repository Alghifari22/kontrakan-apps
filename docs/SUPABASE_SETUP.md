# Menyiapkan Supabase

## 1. Buat project dan isi environment lokal

1. Buat project di Supabase Dashboard.
2. Buka **Project Settings → API**. Salin Project URL dan `anon` / publishable key.
3. Di root project, salin `.env.example` menjadi `.env.local`, lalu isi nilainya:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Jangan memakai `service_role` atau secret key pada variabel `NEXT_PUBLIC_*`. Setelah mengubah environment, mulai ulang server Next.js.

## 2. Jalankan migration

Di Supabase Dashboard → **SQL Editor**, jalankan file berikut sesuai urutan:

1. `supabase/migrations/20261018000000_initial_schema.sql`
2. `supabase/migrations/20261018010000_auth_and_private_storage.sql`
3. `supabase/migrations/20261018020000_admin_workflows.sql`
4. `supabase/migrations/20261019000000_user_payment_flow.sql`

Migration membuat skema, RLS dasar, bucket bukti privat dengan batas 5 MB, trigger profil otomatis, serta fungsi aman untuk menambah pengeluaran, menerbitkan tagihan, dan meninjau pembayaran. Migration keempat mengamankan pengiriman bukti dan mencegah dua bukti aktif untuk tagihan yang sama.

## 3. Buat akun admin pertama

1. Buka **Authentication → Users → Add user** dan buat akun admin pertama.
2. Salin UUID akun tersebut.
3. Di SQL Editor, jalankan SQL berikut setelah mengganti dua nilai contoh:

```sql
-- Ganti UUID akun dan nama rumah sebelum menjalankan.
with new_household as (
  insert into public.households (name, created_by)
  values ('Nama Rumah', 'UUID-AKUN-ADMIN'::uuid)
  returning id
)
insert into public.household_members (household_id, user_id, role, membership_status)
select id, 'UUID-AKUN-ADMIN'::uuid, 'admin', 'active'
from new_household;
```

Anggota berikutnya dibuat melalui Authentication/undangan Supabase. Setelah akun dibuat, tambahkan baris `household_members` dengan household ID yang sama, UUID akun anggota, dan role `user`.

## 4. Jalankan aplikasi

```powershell
npm.cmd run dev
```

Buka `http://localhost:3000`. Login memakai Supabase Auth. Middleware membatasi halaman admin dan dashboard berdasarkan keanggotaan aktif dan role. Dashboard membaca profil, rumah, periode, tagihan, dan bagian pengeluaran dari Supabase sesuai RLS.

## Batas integrasi saat ini

Halaman admin bisa membuat periode draf, menambah dan menghapus pengeluaran dalam draf, memilih peserta, menerbitkan tagihan, membuka bukti transfer privat, menyetujui atau menolak bukti dengan alasan, mengelola jadwal giliran, dan membaca daftar anggota. Penghuni bisa mengirim bukti pembayaran dan melihat status serta riwayatnya. Tagihan terbit dikunci oleh RLS. Pembuatan akun/invitasi anggota belum tersedia dari UI; akun dibuat melalui Supabase Auth lalu ditambahkan sebagai anggota.

Untuk perubahan kode berikutnya, jalankan migration baru yang belum pernah diterapkan setelah urutan migration sebelumnya. Jangan menjalankan ulang migration yang sudah berhasil karena migration awal membuat tipe dan tabel.
