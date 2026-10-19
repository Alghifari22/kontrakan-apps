import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import LoadingSubmitButton from "@/components/loading-submit-button";
import { CalendarDays, CreditCard, House, ReceiptText, Users } from "lucide-react";
import { getActiveHouseholdContext } from "@/lib/supabase/household";
import { addExpense, addRotationTurn, addSupplementalExpense, createBillingPeriod, publishPeriod, removeExpense, reviewPayment, updateRotationTurn } from "@/app/admin/actions";

const money = (amount: number) => `Rp${new Intl.NumberFormat("id-ID").format(amount)}`;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error: actionError } = await searchParams;
  const { supabase, user, profile, membership, configured } = await getActiveHouseholdContext();
  const householdId = membership?.household_id;
  const { data: period } = supabase && householdId
    ? await supabase.from("billing_periods").select("id, period_month, status").eq("household_id", householdId).order("period_month", { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  const [memberResult, turnResult, expenseResult, billResult, pendingResult, paidResult] = await Promise.all([
    supabase && householdId
      ? supabase.from("household_members").select("user_id, profiles(full_name)").eq("household_id", householdId).eq("membership_status", "active").order("joined_at")
      : Promise.resolve({ data: [] }),
    supabase && householdId
      ? supabase.from("water_rotation_turns").select("id, assigned_user_id, scheduled_date, profiles(full_name)").eq("household_id", householdId).eq("status", "upcoming").order("scheduled_date").limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase && period
      ? supabase.from("expenses").select("id, name, category, expense_type, amount_idr").eq("billing_period_id", period.id)
      : Promise.resolve({ data: [] }),
    supabase && period
      ? supabase.from("member_bills").select("id, user_id, total_amount_idr").eq("billing_period_id", period.id)
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase.from("payments").select("id, submitted_by, amount_idr, created_at, proof_storage_path").eq("status", "pending_review").order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    supabase && period
      ? supabase.from("payments").select("id, amount_idr, member_bills!inner(billing_period_id)").eq("status", "approved").eq("member_bills.billing_period_id", period.id)
      : Promise.resolve({ data: [] })
  ]);

  const members = memberResult.data ?? [];
  const turn = turnResult.data as any;
  const expenses = expenseResult.data ?? [];
  const bills = billResult.data ?? [];
  const pendingPayments = pendingResult.data ?? [];
  const approvedPayments = paidResult.data ?? [];
  const expenseTotal = expenses.reduce((sum: number, row: any) => sum + Number(row.amount_idr), 0);
  const billedTotal = bills.reduce((sum: number, row: any) => sum + Number(row.total_amount_idr), 0);
  const paidTotal = approvedPayments.reduce((sum: number, row: any) => sum + Number(row.amount_idr), 0);
  const pendingTotal = pendingPayments.reduce((sum: number, row: any) => sum + Number(row.amount_idr), 0);
  const pendingIds = [...new Set(pendingPayments.map((row: any) => row.submitted_by))];
  const [{ data: profiles }, signedProofs] = await Promise.all([
    supabase && pendingIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", pendingIds)
      : Promise.resolve({ data: [] }),
    (async () => {
      const map = new Map<string, string>();
      if (supabase) await Promise.all(pendingPayments.map(async (payment: any) => {
        const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(payment.proof_storage_path, 60);
        if (data?.signedUrl) map.set(payment.id, data.signedUrl);
      }));
      return map;
    })()
  ]);
  const profilesById = new Map((profiles ?? []).map((row: any) => [row.id, row.full_name]));
  const fullName = profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const householdName = membership?.households?.name || "Rumah bersama";
  const turnProfile = Array.isArray(turn?.profiles) ? turn.profiles[0] : turn?.profiles;

  return (
    <main className="min-h-screen bg-[#f4f6fa] pb-20 text-slate-900 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <Link href="/admin" className="flex items-center gap-3 rounded-xl px-2 py-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">K</span><span><span className="block text-sm font-bold text-slate-900">Kontrakan</span><span className="block text-xs text-slate-500">{householdName}</span></span></Link>
        <p className="mt-10 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">Menu utama</p>
        <nav className="mt-3 space-y-1 text-sm font-semibold">
          <NavItem href="/admin" icon={<House size={18}/>} active>Ringkasan</NavItem>
          <NavItem href="#tagihan" icon={<ReceiptText size={18}/>}>Tagihan</NavItem>
          <NavItem href="#pembayaran" icon={<CreditCard size={18}/>}>Pembayaran <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">{pendingPayments.length}</span></NavItem>
          <NavItem href="#jadwal" icon={<CalendarDays size={18}/>}>Jadwal giliran</NavItem>
          <NavItem href="#anggota" icon={<Users size={18}/>}>Anggota</NavItem>
        </nav>
        <div className="mt-auto rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">Data rumah</p><p className="mt-1 text-xs leading-5 text-slate-600">Informasi ditampilkan sesuai akses admin.</p></div>
        <form action="/logout" method="post" className="mt-4"><LoadingSubmitButton className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-100" pendingText="Keluar…">Keluar dari akun</LoadingSubmitButton></form>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.12em] text-blue-800 sm:tracking-[.16em]">Panel admin</p><h1 className="mt-1 truncate text-lg font-bold text-slate-950 sm:text-2xl">Ringkasan rumah</h1></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-bold text-slate-800">{fullName}</p><p className="text-xs text-slate-500">Admin rumah</p></div><span className="hidden h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-900 sm:flex">{fullName.slice(0, 1).toUpperCase()}</span><ThemeToggle/><form action="/logout" method="post"><LoadingSubmitButton className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50" pendingText="Keluar…">Keluar</LoadingSubmitButton></form></div></div></header>

        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
          <div className="mb-6"><p className="text-sm font-medium text-slate-600">{period ? new Date(`${period.period_month}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : householdName}</p><h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Halo, {fullName}</h2><p className="mt-2 text-sm text-slate-600">Kelola tagihan, pembayaran, dan jadwal rumah.</p></div>
          {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</p>}
          {actionError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">{actionError}</p>}
          {!configured && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Supabase belum dikonfigurasi. Isi <code>.env.local</code> untuk memuat data.</p>}
          {configured && !period && <p className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">Belum ada periode tagihan. Buat draf bulanan untuk memulai.</p>}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total pengeluaran" value={money(expenseTotal)} detail="Periode terakhir" color="blue"/><StatCard label="Sudah dibayar" value={money(paidTotal)} detail={`${bills.length} tagihan anggota`} color="green"/><StatCard label="Menunggu verifikasi" value={`${pendingPayments.length} bukti`} detail={money(pendingTotal)} color="amber"/><StatCard label="Belum dibayar" value={money(Math.max(0, billedTotal - paidTotal - pendingTotal))} detail="Sisa kewajiban" color="rose"/></section>

          <section className="mt-7 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
          <article id="pembayaran" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-5 sm:px-6"><h3 className="font-bold text-slate-950">Perlu ditinjau</h3><p className="mt-1 text-sm text-slate-600">Bukti transfer menunggu keputusan admin.</p></div><div className="divide-y divide-slate-100">{pendingPayments.length ? pendingPayments.map((payment: any, index: number) => { const name = profilesById.get(payment.submitted_by) || "Anggota rumah"; const proof = signedProofs.get(payment.id); return <div key={payment.id} className="min-w-0 px-4 py-4 sm:px-6"><div className="flex min-w-0 flex-wrap items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index % 2 ? "bg-amber-100 text-amber-900" : "bg-violet-100 text-violet-800"}`}>{name.split(/\s+/).map((word: string) => word[0]).slice(0, 2).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-600">{new Date(payment.created_at).toLocaleString("id-ID")}</p></div><p className="shrink-0 text-sm font-bold text-slate-900">{money(payment.amount_idr)}</p>{proof && <a href={proof} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50">Lihat bukti</a>}</div><div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-3"><form action={reviewPayment}><input type="hidden" name="payment_id" value={payment.id}/><input type="hidden" name="decision" value="approved"/><LoadingSubmitButton className="min-h-10 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800" pendingText="Menyetujui…">Setujui</LoadingSubmitButton></form><form action={reviewPayment} className="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-2"><input type="hidden" name="payment_id" value={payment.id}/><input type="hidden" name="decision" value="rejected"/><label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">Alasan penolakan<input required name="rejection_reason" placeholder="Contoh: nominal tidak sesuai" className="mt-1 min-h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"/></label><LoadingSubmitButton className="min-h-10 rounded-lg border border-rose-300 bg-rose-50 px-4 text-xs font-bold text-rose-900 hover:bg-rose-100" pendingText="Menolak…">Tolak</LoadingSubmitButton></form></div></div>; }) : <p className="px-5 py-6 text-sm text-slate-600 sm:px-6">Tidak ada bukti yang menunggu pemeriksaan.</p>}</div></article>

            <article id="jadwal" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-bold text-slate-950">Giliran air minum</h3><p className="mt-1 text-sm text-slate-600">Jadwal berikutnya</p><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-900">{turnProfile?.full_name || "Belum ada jadwal"}</p><p className="mt-1 text-sm text-slate-600">{turn?.scheduled_date ? new Date(`${turn.scheduled_date}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" }) : "Belum dijadwalkan"}</p></div>{turn && <div className="mt-3 flex flex-wrap gap-2"><form action={updateRotationTurn}><input type="hidden" name="turn_id" value={turn.id}/><input type="hidden" name="status" value="completed"/><LoadingSubmitButton className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white" pendingText="Menyimpan…">Tandai selesai</LoadingSubmitButton></form><form action={updateRotationTurn}><input type="hidden" name="turn_id" value={turn.id}/><input type="hidden" name="status" value="skipped"/><LoadingSubmitButton className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800" pendingText="Menyimpan…">Lewati</LoadingSubmitButton></form></div>}<form action={addRotationTurn} className="mt-5 min-w-0 space-y-3 border-t border-slate-100 pt-4"><p className="text-sm font-bold text-slate-800">Tambah giliran</p><label className="block min-w-0 text-xs font-semibold text-slate-700">Penanggung jawab<select required name="assigned_user_id" className="mt-1 min-h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">{members.map((item: any) => { const relation = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles; return <option key={item.user_id} value={item.user_id}>{relation?.full_name || "Anggota"}</option>; })}</select></label><label className="block min-w-0 text-xs font-semibold text-slate-700">Tanggal<input required type="date" name="scheduled_date" className="mt-1 min-h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"/></label><LoadingSubmitButton className="min-h-10 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-900" pendingText="Menyimpan…">Simpan jadwal</LoadingSubmitButton></form></article>
          </section>

          <section id="tagihan" className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
            {period?.status !== "draft" && <form action={createBillingPeriod} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-bold text-slate-950">Buat periode tagihan</h3><p className="mt-1 text-sm text-slate-600">Mulai dengan periode draf baru.</p><label className="mt-4 block min-w-0 text-xs font-semibold text-slate-700">Bulan<input required type="month" name="period_month" defaultValue={new Date().toISOString().slice(0, 7)} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"/></label><LoadingSubmitButton className="mt-3 min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-900 sm:w-fit" pendingText="Membuat draf…">Buat draf</LoadingSubmitButton></form>}

            {period?.status === "draft" && <form action={addExpense} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h3 className="font-bold text-slate-950">Tambah pengeluaran</h3><p className="mt-1 text-sm text-slate-600">Draf {new Date(`${period.period_month}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p><input type="hidden" name="period_id" value={period.id}/><div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2"><Field label="Nama pengeluaran" name="name" placeholder="Contoh: Listrik"/><CategoryField/><Field label="Nominal rupiah" name="amount_idr" type="number" placeholder="300000"/><label className="min-w-0 text-xs font-semibold text-slate-700">Jenis<select name="expense_type" className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"><option value="fixed">Tetap</option><option value="variable">Tidak tetap</option></select></label></div><fieldset className="mt-4 min-w-0"><legend className="text-xs font-bold text-slate-800">Peserta patungan</legend><div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">{members.map((item: any) => { const relation = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles; return <label key={item.user_id} className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-800"><input type="checkbox" name="participant_ids" value={item.user_id} defaultChecked className="h-4 w-4 shrink-0 accent-blue-700"/><span className="truncate">{relation?.full_name || "Anggota"}</span></label>; })}</div></fieldset><label className="mt-3 block min-w-0 text-xs font-semibold text-slate-700">Catatan (opsional)<input name="notes" className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"/></label><LoadingSubmitButton className="mt-4 min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-900 sm:w-fit" pendingText="Menyimpan…">Simpan pengeluaran</LoadingSubmitButton></form>}

            {period?.status === "published" && <form action={addSupplementalExpense} className="min-w-0 overflow-hidden rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6"><h3 className="font-bold text-slate-950">Tambah pengeluaran susulan</h3><p className="mt-1 text-sm leading-6 text-slate-600">Tambahkan patungan ke periode {new Date(`${period.period_month}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })} yang sudah terbit, tanpa membuat periode baru. Sisa tagihan peserta akan bertambah; pembayaran yang telah disetujui tetap tercatat.</p><input type="hidden" name="period_id" value={period.id}/><div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2"><Field label="Nama pengeluaran" name="name" placeholder="Contoh: Perbaikan pompa"/><CategoryField/><Field label="Nominal rupiah" name="amount_idr" type="number" placeholder="100000"/><label className="min-w-0 text-xs font-semibold text-slate-700">Jenis<select name="expense_type" className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"><option value="variable">Tidak tetap</option><option value="fixed">Tetap</option></select></label></div><fieldset className="mt-4 min-w-0"><legend className="text-xs font-bold text-slate-800">Peserta patungan</legend><div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">{members.map((item: any) => { const relation = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles; return <label key={item.user_id} className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-800"><input type="checkbox" name="participant_ids" value={item.user_id} defaultChecked className="h-4 w-4 shrink-0 accent-blue-700"/><span className="truncate">{relation?.full_name || "Anggota"}</span></label>; })}</div></fieldset><label className="mt-3 block min-w-0 text-xs font-semibold text-slate-700">Catatan (opsional)<input name="notes" className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"/></label><LoadingSubmitButton className="mt-4 min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-900 sm:w-fit" pendingText="Menambahkan…">Tambah ke tagihan terbit</LoadingSubmitButton></form>}

            <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h3 className="font-bold text-slate-950">{period?.status === "draft" ? "Draf pengeluaran" : "Pengeluaran periode"}</h3><p className="mt-1 text-sm text-slate-600">{period?.status === "draft" ? "Item draf bisa dihapus sebelum diterbitkan." : "Periode terbit hanya dapat dibaca."}</p><div className="mt-3 divide-y divide-slate-100">{expenses.length ? expenses.map((expense: any) => <div key={expense.id} className="flex min-w-0 flex-wrap items-center gap-3 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-800">{expense.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold text-slate-900">{expense.name}</p><p className="mt-1 break-words text-xs text-slate-600">{expense.expense_type === "fixed" ? "Tetap" : "Tidak tetap"} · {expense.category}</p></div><p className="shrink-0 text-sm font-bold text-slate-900">{money(expense.amount_idr)}</p>{period?.status === "draft" && <form action={removeExpense}><input type="hidden" name="expense_id" value={expense.id}/><LoadingSubmitButton className="min-h-9 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900 hover:bg-rose-100" pendingText="Menghapus…">Hapus</LoadingSubmitButton></form>}</div>) : <p className="py-5 text-sm text-slate-600">Belum ada pengeluaran di periode ini.</p>}</div><div className="flex justify-between gap-3 border-t border-slate-100 py-4 text-sm font-bold"><span className="text-slate-700">Total pengeluaran</span><span className="text-right text-slate-950">{money(expenseTotal)}</span></div>{period?.status === "draft" && <form action={publishPeriod} className="border-t border-slate-100 pt-4"><input type="hidden" name="period_id" value={period.id}/><label className="flex items-start gap-2 text-xs leading-5 text-slate-700"><input required type="checkbox" name="confirm_publish" value="yes" className="mt-1 h-4 w-4 shrink-0 accent-blue-700"/><span>Saya sudah memeriksa nominal dan peserta. Tagihan akan diterbitkan dan dikunci.</span></label><LoadingSubmitButton disabled={!expenses.length} className="mt-3 min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-900 sm:w-fit" pendingText="Menerbitkan…">Terbitkan tagihan</LoadingSubmitButton></form>}</article>
          </section>
          <section id="anggota" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-950">Anggota rumah</h3><p className="mt-1 text-sm text-slate-600">Daftar anggota aktif yang terhubung ke rumah ini.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">{members.length} anggota</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{members.map((item: any) => { const relation = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles; const name = relation?.full_name || "Anggota"; return <div key={item.user_id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{name.slice(0, 1).toUpperCase()}</span><p className="text-sm font-semibold text-slate-800">{name}</p></div>; })}</div></section>
          <nav aria-label="Navigasi utama admin" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,.08)] lg:hidden"><a href="/admin" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-blue-800"><House size={19}/><span>Ringkasan</span></a><a href="#tagihan" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-slate-700"><ReceiptText size={19}/><span>Tagihan</span></a><a href="#pembayaran" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-slate-700"><CreditCard size={19}/><span>Pembayaran</span></a><a href="#jadwal" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-slate-700"><CalendarDays size={19}/><span>Jadwal</span></a></nav>
        </div>
      </div>
    </main>
  );
}

function NavItem({ href, icon, active = false, children }: { href: string; icon: React.ReactNode; active?: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${active ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-100"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? "bg-blue-100" : "bg-slate-100"}`}>{icon}</span>{children}</Link>;
}

function Field({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder: string; type?: string }) {
  return <label className="text-xs font-semibold text-slate-700">{label}<input required name={name} type={type} min={type === "number" ? "1" : undefined} step={type === "number" ? "1" : undefined} placeholder={placeholder} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-500"/></label>;
}

function CategoryField() {
  return <label className="text-xs font-semibold text-slate-700">Kategori pengeluaran<input required name="category" list="expense-category-options" placeholder="Pilih atau ketik kategori" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500"/><datalist id="expense-category-options"><option value="Utilitas"/><option value="Listrik"/><option value="Air"/><option value="Internet"/><option value="Kebersihan"/><option value="Gas"/><option value="Perawatan rumah"/><option value="Perlengkapan"/><option value="Konsumsi bersama"/><option value="Lainnya"/></datalist></label>;
}

function StatCard({ label, value, detail, color }: { label: string; value: string; detail: string; color: "blue" | "green" | "amber" | "rose" }) {
  const colors = { blue: "bg-blue-50 text-blue-800", green: "bg-emerald-50 text-emerald-800", amber: "bg-amber-50 text-amber-900", rose: "bg-rose-50 text-rose-900" };
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-5 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold ${colors[color]}`}>{detail}</p></article>;
}
