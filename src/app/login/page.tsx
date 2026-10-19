import { signIn } from "@/app/login/actions";
import ThemeToggle from "@/components/theme-toggle";
import LoadingSubmitButton from "@/components/loading-submit-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = error === "configuration"
    ? "Supabase belum dikonfigurasi. Isi variabel di .env.local terlebih dahulu."
    : error === "credentials"
      ? "Email atau kata sandi tidak cocok. Silakan coba lagi."
      : error === "membership"
        ? "Akun ini belum terdaftar sebagai anggota aktif rumah. Hubungi admin."
        : null;
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#eef3f9] px-4 py-8 sm:px-6">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6"><ThemeToggle /></div>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,.28)] lg:min-h-[620px] lg:grid-cols-[.95fr_1.05fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#163b72] p-10 text-white lg:flex">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white">K</div>
            <p className="mt-5 text-sm font-bold tracking-wide text-blue-100">KONTRAKAN BERSAMA</p>
            <h2 className="mt-20 max-w-sm text-5xl font-semibold leading-[1.12] tracking-tight text-white">Urusan rumah terasa lebih ringan.</h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-blue-100">Tagihan, pembayaran, dan giliran rumah tersusun rapi dalam satu tempat.</p>
          </div>
          <p className="relative text-sm text-blue-100">Akses khusus penghuni rumah.</p>
        </aside>

        <section className="flex min-w-0 items-center px-5 py-10 sm:px-12 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-800 lg:hidden">K</div>
            <p className="text-sm font-bold text-blue-800">MASUK KE AKUN</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Selamat datang</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">Gunakan akun yang diberikan admin untuk membuka dashboard rumah.</p>
            {message && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-900">{message}</p>}
            <form className="mt-9 space-y-5" action={signIn}>
              <label className="block text-sm font-bold text-slate-800">Alamat email
                <input required name="email" autoComplete="email" type="email" placeholder="nama@email.com" className="mt-2 block min-h-[52px] w-full min-w-0 max-w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-700 focus:ring-4 focus:ring-blue-100" />
              </label>
              <label className="block text-sm font-bold text-slate-800">Kata sandi
                <input required name="password" autoComplete="current-password" type="password" placeholder="Masukkan kata sandi" className="mt-2 block min-h-[52px] w-full min-w-0 max-w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-700 focus:ring-4 focus:ring-blue-100" />
              </label>
              <LoadingSubmitButton style={{ backgroundColor: "#1d4ed8", color: "#ffffff", border: "2px solid #1d4ed8" }} className="min-h-[52px] w-full rounded-xl px-5 py-3 text-base font-bold !text-white shadow-md shadow-blue-200 transition hover:!border-blue-900 hover:!bg-blue-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-300" pendingText="Sedang masuk…">Masuk ke dashboard</LoadingSubmitButton>
            </form>
            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">Belum punya akun? <span className="font-semibold text-slate-800">Hubungi admin rumah.</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
