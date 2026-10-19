# Rancangan Database

Rancangan ini ditujukan untuk PostgreSQL di Supabase. Nama tabel dan kolom dapat disesuaikan saat implementasi.

## 1. Tabel utama

### `profiles`
- `id` UUID, primary key, sama dengan ID Supabase Auth.
- `full_name` text.
- `created_at` timestamptz.

### `households`
- `id` UUID, primary key.
- `name` text.
- `created_by` UUID, referensi profil.
- `created_at` timestamptz.

### `household_members`
- `id` UUID, primary key.
- `household_id` UUID, referensi `households`.
- `user_id` UUID, referensi `profiles`.
- `role` enum/text terbatas: `admin` atau `user`.
- `membership_status` enum/text terbatas: `active`, `inactive`, `invited`.
- `joined_at` timestamptz.
- Constraint unik untuk kombinasi household dan user.

### `billing_periods`
- `id` UUID, primary key.
- `household_id` UUID.
- `period_month` date, gunakan tanggal pertama bulan.
- `status` `draft`, `published`, `archived`.
- `created_by` UUID.
- `published_at` timestamptz nullable.
- `created_at` timestamptz.
- Constraint unik household + period_month.

### `expenses`
- `id` UUID, primary key.
- `billing_period_id` UUID.
- `name` text.
- `category` text.
- `expense_type` `fixed` atau `variable`.
- `amount_idr` bigint, harus lebih besar dari nol.
- `notes` text nullable.
- `created_at` timestamptz.

### `expense_participants`
- `id` UUID, primary key.
- `expense_id` UUID.
- `user_id` UUID.
- `share_amount_idr` bigint.
- Constraint unik expense + user.
- Simpan nilai bagian yang telah dihitung saat tagihan diterbitkan agar histori tidak berubah.

### `member_bills`
- `id` UUID, primary key.
- `billing_period_id` UUID.
- `user_id` UUID.
- `total_amount_idr` bigint.
- `created_at` timestamptz.
- Constraint unik billing_period + user.
- Baris ini menjadi total kewajiban anggota untuk satu periode.

### `payments`
- `id` UUID, primary key.
- `member_bill_id` UUID.
- `submitted_by` UUID.
- `amount_idr` bigint.
- `transfer_date` date.
- `proof_storage_path` text.
- `status` `pending_review`, `approved`, `rejected`.
- `reviewed_by` UUID nullable.
- `reviewed_at` timestamptz nullable.
- `rejection_reason` text nullable.
- `created_at` timestamptz.
- Simpan setiap pengiriman ulang sebagai catatan baru agar riwayat tidak hilang.

### `water_rotation_settings`
- `id` UUID, primary key.
- `household_id` UUID.
- `interval_days` integer.
- `start_date` date.
- `is_active` boolean.

### `water_rotation_turns`
- `id` UUID, primary key.
- `household_id` UUID.
- `assigned_user_id` UUID.
- `scheduled_date` date.
- `status` `upcoming`, `completed`, `skipped`.
- `notes` text nullable.
- `created_at` timestamptz.

### `audit_logs` (direkomendasikan)
- `id` UUID, primary key.
- `household_id` UUID.
- `actor_user_id` UUID.
- `action` text.
- `entity_type` text.
- `entity_id` UUID.
- `metadata` JSONB.
- `created_at` timestamptz.
- Catat aksi penting seperti menerbitkan tagihan, menyetujui pembayaran, dan mengubah jadwal.

## 2. Relasi inti
- Satu household memiliki banyak anggota.
- Satu household memiliki banyak periode tagihan.
- Satu periode memiliki banyak pengeluaran.
- Satu pengeluaran memiliki banyak peserta.
- Satu periode memiliki satu tagihan per anggota yang ditagih.
- Satu tagihan dapat memiliki beberapa catatan pengiriman bukti, tetapi hanya satu pembayaran yang disetujui untuk MVP.
- Satu household memiliki banyak giliran membeli air.

## 3. Perhitungan
1. Ambil nominal pengeluaran dan daftar peserta aktif yang dipilih.
2. Hitung pembagian dengan integer rupiah.
3. Tentukan aturan sisa pembagian secara konsisten.
4. Simpan `share_amount_idr` per peserta ketika menerbitkan tagihan.
5. Jumlahkan bagian semua pengeluaran untuk membentuk `member_bills`.
6. Setelah periode diterbitkan, jangan menghitung ulang dari daftar anggota terkini.

## 4. Catatan implementasi
- Gunakan foreign key, constraint, dan indeks yang sesuai.
- Proses penerbitan tagihan harus berjalan dalam satu transaksi database atau fungsi database yang aman.
- Keputusan persetujuan pembayaran juga harus atomik untuk mencegah persetujuan ganda.
- Jangan simpan file bukti sebagai base64 di tabel. Simpan file di Supabase Storage dan path-nya di database.
- Seluruh nominal harus divalidasi di sisi server/database, bukan hanya di UI.
