"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function result(message: string, isError = false): never {
  revalidatePath("/dashboard");
  redirect(`/dashboard?${isError ? "error" : "notice"}=${encodeURIComponent(message)}`);
}

function isAllowedFile(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  return false;
}

export async function submitPaymentProof(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) result("Konfigurasi Supabase belum tersedia.", true);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const billId = String(formData.get("member_bill_id") ?? "");
  const transferDate = String(formData.get("transfer_date") ?? "");
  const proof = formData.get("proof");
  if (!billId || !(proof instanceof File) || proof.size === 0) result("Pilih file bukti transfer.", true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transferDate)) result("Tanggal transfer tidak valid.", true);
  const [transferYear, transferMonth, transferDay] = transferDate.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(transferYear, transferMonth - 1, transferDay));
  if (calendarDate.getUTCFullYear() !== transferYear || calendarDate.getUTCMonth() !== transferMonth - 1 || calendarDate.getUTCDate() !== transferDay) {
    result("Tanggal transfer tidak valid.", true);
  }
  if (proof.size > MAX_FILE_SIZE) result("Ukuran bukti maksimal 5 MB.", true);

  const { data: membership } = await supabase.from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) result("Keanggotaan aktif rumah tidak ditemukan.", true);
  const { data: bill } = await supabase.from("member_bills")
    .select("id, user_id, total_amount_idr, billing_periods!inner(household_id, status, period_month)")
    .eq("id", billId)
    .eq("user_id", user.id)
    .eq("billing_periods.status", "published")
    .eq("billing_periods.household_id", membership.household_id)
    .maybeSingle();
  if (!bill || bill.total_amount_idr <= 0) result("Tagihan ini tidak ditemukan atau tidak dapat dibayar.", true);

  const period = Array.isArray(bill.billing_periods) ? bill.billing_periods[0] : bill.billing_periods;
  const periodStart = String(period.period_month).slice(0, 10);
  const [year, month] = periodStart.split("-").map(Number);
  const nextMonthStart = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  if (transferDate < periodStart || transferDate >= nextMonthStart) {
    result("Tanggal transfer harus berada di bulan periode tagihan.", true);
  }
  const amount = Number(formData.get("amount_idr"));
  if (!Number.isSafeInteger(amount) || amount <= 0) result("Masukkan nominal pembayaran yang valid.", true);

  const { data: previousPayments, error: paymentQueryError } = await supabase.from("payments")
    .select("status, amount_idr")
    .eq("member_bill_id", bill.id)
    .order("created_at", { ascending: false })
    .limit(5);
  if (paymentQueryError) result("Status pembayaran tidak dapat diperiksa. Coba lagi.", true);
  if (previousPayments?.some((payment) => payment.status === "pending_review")) result("Bukti pembayaranmu sedang diperiksa admin.", true);
  const paidAmount = previousPayments?.filter((payment) => payment.status === "approved").reduce((sum, payment) => sum + payment.amount_idr, 0) ?? 0;
  const remainingAmount = bill.total_amount_idr - paidAmount;
  if (remainingAmount <= 0) result("Tagihan ini sudah lunas.", true);
  if (amount > remainingAmount) result("Nominal pembayaran melebihi sisa tagihan.", true);

  const bytes = new Uint8Array(await proof.arrayBuffer());
  if (!isAllowedFile(proof.type, bytes)) result("File harus berupa JPEG, PNG, atau PDF yang valid.", true);
  const extension = proof.type === "image/jpeg" ? "jpg" : proof.type === "image/png" ? "png" : "pdf";
  const storagePath = `${membership.household_id}/${user.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(storagePath, bytes, {
    contentType: proof.type,
    upsert: false
  });
  if (uploadError) result(`Bukti gagal diunggah: ${uploadError.message}`, true);

  const { error: insertError } = await supabase.from("payments").insert({
    member_bill_id: bill.id,
    submitted_by: user.id,
    amount_idr: amount,
    transfer_date: transferDate,
    proof_storage_path: storagePath,
    status: "pending_review"
  });

  if (insertError) {
    await supabase.storage.from("payment-proofs").remove([storagePath]);
    result(insertError.code === "23505" ? "Bukti pembayaran sedang diproses. Muat ulang halaman." : `Bukti gagal dicatat: ${insertError.message}`, true);
  }
  result("Bukti berhasil dikirim dan menunggu verifikasi admin.");
}
