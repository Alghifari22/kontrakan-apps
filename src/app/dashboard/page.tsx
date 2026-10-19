import { getActiveHouseholdContext } from "@/lib/supabase/household";
import { submitPaymentProof } from "@/app/dashboard/actions";
import ThemeToggle from "@/components/theme-toggle";

const statusLabels: Record<string, string> = {
  unpaid: "Belum dibayar",
  pending_review: "Menunggu verifikasi",
  rejected: "Bukti perlu diperbaiki",
  approved: "Disetujui",
  paid_in_full: "Lunas",
  partially_paid: "Dibayar sebagian"
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error: actionError } = await searchParams;
  const { supabase, user, profile, membership, configured } = await getActiveHouseholdContext();
  const today = new Date();
  const { data: period } = supabase && membership
    ? await supabase.from("billing_periods").select("id, period_month").eq("household_id", membership.household_id).eq("status", "published").order("period_month", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const { data: memberBill } = supabase && user && period
    ? await supabase.from("member_bills").select("id, total_amount_idr, billing_periods!inner(period_month)").eq("billing_period_id", period.id).eq("user_id", user.id).maybeSingle()
    : { data: null };
  const { data: expenseRows } = supabase && period && user
    ? await supabase.from("expenses").select("id, name, expense_participants!inner(user_id, share_amount_idr)").eq("billing_period_id", period.id).eq("expense_participants.user_id", user.id)
    : { data: null };
  const [{ data: paymentRows }, { data: nextTurn }] = supabase && user && membership
    ? await Promise.all([
        memberBill
          ? supabase.from("payments").select("id, status, amount_idr, created_at, transfer_date, rejection_reason").eq("member_bill_id", memberBill.id).order("created_at", { ascending: false }).limit(100)
          : Promise.resolve({ data: [] }),
        supabase.from("water_rotation_turns").select("assigned_user_id, scheduled_date, profiles(full_name)").eq("household_id", membership.household_id).eq("status", "upcoming").order("scheduled_date").limit(1).maybeSingle()
      ])
    : [{ data: [] }, { data: null }];

  const fullName = profile?.full_name || user?.email?.split("@")[0] || "Penghuni";
  const householdName = membership?.households?.name || "Rumah bersama";
  const paidAmount = paymentRows?.filter((payment) => payment.status === "approved").reduce((sum, payment) => sum + payment.amount_idr, 0) ?? 0;
  const remainingAmount = memberBill ? Math.max(0, memberBill.total_amount_idr - paidAmount) : 0;
  const billAmount = memberBill ? new Intl.NumberFormat("id-ID").format(memberBill.total_amount_idr) : null;
  const latestPayment = paymentRows?.[0] ?? null;
  const hasPendingPayment = paymentRows?.some((payment) => payment.status === "pending_review") ?? false;
  const paymentState = remainingAmount === 0 && memberBill
    ? "paid_in_full"
    : hasPendingPayment
      ? "pending_review"
      : latestPayment?.status === "rejected"
        ? "rejected"
        : paidAmount > 0
          ? "partially_paid"
          : "unpaid";
  const turn = nextTurn as any;
  const turnProfile = Array.isArray(turn?.profiles) ? turn.profiles[0] : turn?.profiles;
  const turnDate = turn?.scheduled_date ? new Date(`${turn.scheduled_date}T00:00:00`) : null;
  const daysUntilTurn = turnDate ? Math.max(0, Math.ceil((turnDate.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)) : null;
  const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const billPeriod = memberBill ? (Array.isArray(memberBill.billing_periods) ? memberBill.billing_periods[0] : memberBill.billing_periods) : null;
  const billMonthStart = billPeriod?.period_month ? String(billPeriod.period_month).slice(0, 10) : todayLocal;
  const billMonthEnd = billPeriod?.period_month ? new Date(Date.UTC(Number(billMonthStart.slice(0, 4)), Number(billMonthStart.slice(5, 7)), 0)).toISOString().slice(0, 10) : todayLocal;
  const suggestedTransferDate = todayLocal < billMonthStart ? billMonthStart : todayLocal > billMonthEnd ? billMonthEnd : todayLocal;

  return (
    <main className="min-h-screen bg-[#f4f6fa] pb-20 text-slate-900 lg:pb-8">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">K</span><div><p className="text-sm font-bold text-slate-950">Kontrakan Bersama</p><p className="text-xs text-slate-600">{householdName}</p></div></div><div className="flex items-center gap-2 sm:gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-bold text-slate-800">{fullName}</p><p className="text-xs text-slate-500">Penghuni</p></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-900">{fullName.slice(0, 1).toUpperCase()}</span><ThemeToggle/><form action="/logout" method="post"><button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50">Keluar</button></form></div></div></header>

      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-6"><p className="text-sm font-medium text-slate-600">Ringkasan penghuni</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Halo, {fullName}</h1><p className="mt-2 text-sm text-slate-600">Informasi kewajiban dan jadwal rumahmu.</p></div>
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</p>}
        {actionError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">{actionError}</p>}
        {!configured && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Supabase belum dikonfigurasi. Isi .env.local untuk memuat data.</p>}
        {configured && !period && <p className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">Belum ada periode tagihan terbit untuk rumah ini.</p>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="absolute inset-y-0 left-0 w-1.5 bg-blue-700"/><p className="text-sm font-bold text-slate-600">Total tagihan · {period ? new Date(`${period.period_month}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "Periode berjalan"}</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{billAmount ? `Rp${billAmount}` : "—"}</p>{memberBill && <><span className={`mt-4 inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-bold ${paymentState === "paid_in_full" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : paymentState === "pending_review" ? "border-amber-200 bg-amber-50 text-amber-900" : paymentState === "rejected" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}><span className="mr-2 h-2 w-2 rounded-full bg-current"/>{statusLabels[paymentState] ?? paymentState}</span><p className="mt-2 text-sm text-slate-600">Tagihan khusus periode ini.</p></>}{memberBill && remainingAmount > 0 && !hasPendingPayment && <a href="#kirim-bukti" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:border-blue-900 hover:bg-blue-900">Bayar tagihan <span className="ml-2">→</span></a>}</article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-slate-600">Pembayaran disetujui</p><p className="mt-3 text-3xl font-bold tracking-tight text-emerald-800">Rp{new Intl.NumberFormat("id-ID").format(paidAmount)}</p><p className="mt-2 text-sm leading-5 text-slate-600">Akumulasi cicilan yang sudah disetujui admin untuk periode ini.</p></article>
          <article className={`rounded-2xl border p-6 shadow-sm ${remainingAmount > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><p className={`text-sm font-bold ${remainingAmount > 0 ? "text-amber-900" : "text-emerald-900"}`}>Sisa yang perlu dibayar</p><p className={`mt-3 text-3xl font-bold tracking-tight ${remainingAmount > 0 ? "text-amber-950" : "text-emerald-950"}`}>{memberBill ? `Rp${new Intl.NumberFormat("id-ID").format(remainingAmount)}` : "—"}</p><p className={`mt-2 text-sm leading-5 ${remainingAmount > 0 ? "text-amber-900" : "text-emerald-900"}`}>{memberBill ? remainingAmount > 0 ? "Belum lunas untuk periode ini." : "Tagihan periode ini sudah lunas." : "Belum ada tagihan untuk periode ini."}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-slate-600">Status pembayaran</p><p className="mt-3 text-xl font-bold text-slate-950">{statusLabels[paymentState] ?? paymentState}</p><p className="mt-1 text-sm text-slate-600">{latestPayment ? `Bukti terakhir ${new Date(latestPayment.created_at).toLocaleString("id-ID")}` : "Belum ada bukti untuk periode ini."}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${paymentState === "paid_in_full" ? "bg-emerald-100 text-emerald-900" : paymentState === "rejected" ? "bg-rose-100 text-rose-900" : paymentState === "partially_paid" ? "bg-blue-100 text-blue-900" : "bg-amber-100 text-amber-900"}`}>{paymentState === "paid_in_full" ? "✓" : paymentState === "rejected" ? "!" : paymentState === "partially_paid" ? "↗" : "◷"}</span></div>{latestPayment?.rejection_reason && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-950"><strong>Alasan penolakan:</strong> {latestPayment.rejection_reason}</p>}</article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <article id="tagihan" className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="font-bold text-slate-950">Rincian tagihan</h2><p className="mt-1 text-sm text-slate-600">Bagian yang dibebankan kepadamu</p></div><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{period ? new Date(`${period.period_month}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "—"}</span></div><div className="divide-y divide-slate-100">{expenseRows?.length ? expenseRows.map((expense: any) => { const participant = Array.isArray(expense.expense_participants) ? expense.expense_participants[0] : expense.expense_participants; return <div key={expense.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-800">{expense.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{expense.name}</p><p className="mt-1 text-xs text-slate-600">Bagianmu</p></div><p className="shrink-0 text-sm font-bold text-slate-950">Rp{new Intl.NumberFormat("id-ID").format(participant?.share_amount_idr ?? 0)}</p></div>; }) : <p className="px-5 py-6 text-sm text-slate-600 sm:px-6">Rincian tagihan belum tersedia.</p>}</div><div className="flex justify-between border-t border-slate-100 px-5 py-4 sm:px-6"><span className="text-sm font-bold text-slate-700">Total tagihanmu</span><span className="text-sm font-bold text-slate-950">{billAmount ? `Rp${billAmount}` : "—"}</span></div></article>

          <article id="jadwal" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-bold text-slate-950">Giliran air minum</h2><p className="mt-1 text-sm text-slate-600">Jadwal rumah berikutnya</p></div>{daysUntilTurn !== null && <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900">{daysUntilTurn} hari lagi</span>}</div><div className="mt-5 flex items-center gap-4 rounded-xl bg-slate-50 p-4"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-xs font-bold leading-4 text-blue-800 shadow-sm"><span>{turnDate ? turnDate.toLocaleDateString("id-ID", { month: "short" }).toUpperCase() : "—"}</span><span>{turnDate?.getDate() ?? "—"}</span></div><div><p className="font-bold text-slate-900">{turnProfile?.full_name || "Belum ada giliran terjadwal"}</p><p className="mt-1 text-sm text-slate-600">{turnDate ? turnDate.toLocaleDateString("id-ID", { dateStyle: "full" }) : "Jadwal belum dibuat admin"}</p></div></div><p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">Jadwal giliran diambil dari data rumah dan bisa dilihat oleh semua anggota.</p></article>
        </section>

        {memberBill && remainingAmount > 0 && !hasPendingPayment && <section id="kirim-bukti" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="font-bold text-slate-950">Bayar tagihan (bisa dicicil)</h2><p className="mt-1 text-sm leading-6 text-slate-600">Kirim pembayaran sebagian atau lunasi sekaligus. Tanggal transfer boleh dipilih di sepanjang bulan {new Date(`${billMonthStart}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}.</p></div><form action={submitPaymentProof} className="mt-5 grid gap-4 sm:grid-cols-2"><input type="hidden" name="member_bill_id" value={memberBill.id}/><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-900">Sisa tagihan</p><p className="mt-1 text-xl font-bold text-blue-950">Rp{new Intl.NumberFormat("id-ID").format(remainingAmount)}</p></div><label className="text-sm font-semibold text-slate-800">Nominal yang dibayar<input required type="number" name="amount_idr" min={1} max={remainingAmount} defaultValue={remainingAmount} step={1} className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"/></label><label className="text-sm font-semibold text-slate-800">Tanggal transfer<input required type="date" name="transfer_date" min={billMonthStart} max={billMonthEnd} defaultValue={suggestedTransferDate} className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"/></label><label className="text-sm font-semibold text-slate-800 sm:col-span-2">File bukti transfer<input required type="file" name="proof" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" className="mt-2 block min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white text-sm text-slate-800 file:mr-4 file:min-h-11 file:border-0 file:bg-blue-50 file:px-4 file:font-bold file:text-blue-900 hover:file:bg-blue-100"/><span className="mt-1 block text-xs font-normal text-slate-600">Format JPEG, PNG, atau PDF. Maksimal 5 MB.</span></label><button type="submit" className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 sm:col-span-2 sm:w-fit">Kirim bukti pembayaran</button></form></section>}

        <section id="riwayat" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="font-bold text-slate-950">Riwayat pembayaran</h2><p className="mt-1 text-sm text-slate-600">Status dan waktu pengiriman bukti untuk tagihan ini.</p></div><div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">{paymentRows?.length ? paymentRows.map((payment: any) => <div key={payment.id} className="flex flex-wrap items-center gap-3 py-4"><span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${payment.status === "approved" ? "bg-emerald-100 text-emerald-900" : payment.status === "rejected" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"}`}>{payment.status === "approved" ? "✓" : payment.status === "rejected" ? "!" : "◷"}</span><div className="min-w-[150px] flex-1"><p className="text-sm font-bold text-slate-900">{statusLabels[payment.status] ?? payment.status}</p><p className="mt-1 text-xs text-slate-600">Dikirim {new Date(payment.created_at).toLocaleString("id-ID")} · Transfer {new Date(`${payment.transfer_date}T00:00:00`).toLocaleDateString("id-ID")}</p>{payment.rejection_reason && <p className="mt-1 text-xs font-medium text-rose-800">Alasan: {payment.rejection_reason}</p>}</div><p className="text-sm font-bold text-slate-900">Rp{new Intl.NumberFormat("id-ID").format(payment.amount_idr)}</p></div>) : <p className="py-5 text-sm text-slate-600">Belum ada riwayat pembayaran pada tagihan ini.</p>}</div></section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white px-2 py-2 lg:hidden"><a href="#tagihan" className="rounded-lg py-2 text-center text-xs font-bold text-blue-800">▦<span className="mt-1 block">Ringkasan</span></a><a href="#tagihan" className="rounded-lg py-2 text-center text-xs font-bold text-slate-700">▤<span className="mt-1 block">Tagihan</span></a><a href="#riwayat" className="rounded-lg py-2 text-center text-xs font-bold text-slate-700">↻<span className="mt-1 block">Riwayat</span></a><a href="#jadwal" className="rounded-lg py-2 text-center text-xs font-bold text-slate-700">◷<span className="mt-1 block">Jadwal</span></a></nav>
    </main>
  );
}
