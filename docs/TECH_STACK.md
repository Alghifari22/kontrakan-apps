# Tech Stack dan Arsitektur

## 1. Pilihan teknologi
- **Frontend:** Next.js App Router + TypeScript.
- **Styling/UI:** Tailwind CSS + shadcn/ui.
- **Form dan validasi:** React Hook Form + Zod.
- **Backend/database:** Supabase PostgreSQL.
- **Autentikasi:** Supabase Auth.
- **File bukti:** Supabase Storage dengan bucket privat.
- **Keamanan data:** PostgreSQL constraints, RLS, dan fungsi server/database untuk operasi sensitif.
- **Hosting frontend:** Vercel.
- **Distribusi:** PWA melalui URL HTTPS.

## 2. Gambaran arsitektur
Browser/PWA → Next.js → Supabase Auth/PostgreSQL/Storage.

Pembacaan data dapat menggunakan Supabase client dengan RLS yang benar. Operasi sensitif, seperti menerbitkan periode atau menyetujui pembayaran, harus divalidasi secara tepercaya di server atau fungsi database.

## 3. Mengapa PWA
- Satu antarmuka untuk desktop dan ponsel.
- Tidak perlu mengirim aplikasi ke Play Store atau App Store.
- Pengguna dapat mengakses URL dan, jika didukung, memasang aplikasi ke layar utama.
- Pembaruan aplikasi dilakukan pada hosting, bukan dengan mengirim file instalasi ke setiap anggota.

Batasan: PWA memerlukan internet untuk sinkronisasi data. Kemampuan instalasi, cache, dan notifikasi berbeda menurut OS/browser. PWA bukan pengganti penuh aplikasi native.

## 4. Struktur folder awal
```text
src/
  app/
    (auth)/
      login/
    (app)/
      dashboard/
      bills/
      payments/
      water-rotation/
      history/
      settings/
    api/                 # hanya bila route handler memang diperlukan
  components/
    ui/
    layout/
    bills/
    payments/
    water-rotation/
  features/
    auth/
    billing/
    payments/
    rotation/
  lib/
    supabase/
    validation/
    formatters/
  types/
supabase/
  migrations/
  seed.sql
public/
  icons/
```

Struktur ini panduan awal. Jangan membuat abstraksi terlalu banyak sebelum kebutuhan nyata terlihat.

## 5. Aturan implementasi
- Gunakan TypeScript untuk mengurangi kesalahan tipe data.
- Pisahkan komponen UI, validasi, dan operasi data.
- Jangan menghitung atau menetapkan status pembayaran hanya di frontend.
- Gunakan migration SQL yang tersimpan di repository.
- Format nominal rupiah di UI, tetapi simpan nilai sebagai integer.
- Jangan memasukkan service-role key ke browser.
- Gunakan `.env.local` untuk lokal dan environment settings pada hosting.
- Buat `.env.example` dengan placeholder saja.
- Hindari mock data sebagai fallback diam-diam pada production.

## 6. Distribusi privat
- Deploy frontend ke URL HTTPS.
- Buat akun anggota secara terbatas.
- Bagikan URL dan cara instalasi PWA hanya kepada penghuni.
- Lindungi seluruh halaman dan data dengan login serta otorisasi.
- URL yang tidak dipublikasikan bukan kontrol keamanan. Siapa pun yang mendapat tautan tetap harus ditolak jika tidak memiliki akses.
