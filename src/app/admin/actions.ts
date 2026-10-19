"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=configuration");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/dashboard");
  return { supabase, user, householdId: membership.household_id };
}

function finish(message: string): never {
  revalidatePath("/admin");
  redirect(`/admin?notice=${encodeURIComponent(message)}`);
}

function fail(message: string): never {
  revalidatePath("/admin");
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

export async function createBillingPeriod(formData: FormData) {
  const { supabase, user, householdId } = await requireAdmin();
  const month = String(formData.get("period_month") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail("Pilih bulan periode yang valid.");
  const periodMonth = `${month}-01`;
  const { error } = await supabase.from("billing_periods").insert({
    household_id: householdId,
    period_month: periodMonth,
    status: "draft",
    created_by: user.id
  });
  if (error) fail(error.code === "23505" ? "Periode untuk bulan tersebut sudah ada." : error.message);
  finish("Periode draf berhasil dibuat.");
}

export async function addExpense(formData: FormData) {
  const { supabase } = await requireAdmin();
  const periodId = String(formData.get("period_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const type = String(formData.get("expense_type") ?? "");
  const amount = Number(formData.get("amount_idr"));
  const participantIds = formData.getAll("participant_ids").map(String);
  if (!periodId || !name || !category || !Number.isSafeInteger(amount) || amount <= 0 || !["fixed", "variable"].includes(type) || !participantIds.length) {
    fail("Lengkapi nama, kategori, nominal, jenis, dan minimal satu peserta.");
  }
  const { error } = await supabase.rpc("create_expense_with_participants", {
    p_period_id: periodId,
    p_name: name,
    p_category: category,
    p_expense_type: type,
    p_amount_idr: amount,
    p_notes: String(formData.get("notes") ?? ""),
    p_participant_ids: participantIds
  });
  if (error) fail(error.message);
  finish("Pengeluaran berhasil ditambahkan.");
}

export async function addSupplementalExpense(formData: FormData) {
  const { supabase } = await requireAdmin();
  const periodId = String(formData.get("period_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const type = String(formData.get("expense_type") ?? "");
  const amount = Number(formData.get("amount_idr"));
  const participantIds = formData.getAll("participant_ids").map(String);
  if (!periodId || !name || !category || !Number.isSafeInteger(amount) || amount <= 0 || !["fixed", "variable"].includes(type) || !participantIds.length) {
    fail("Lengkapi nama, kategori, nominal, jenis, dan minimal satu peserta.");
  }
  const { error } = await supabase.rpc("add_expense_to_published_period", {
    p_period_id: periodId,
    p_name: name,
    p_category: category,
    p_expense_type: type,
    p_amount_idr: amount,
    p_notes: String(formData.get("notes") ?? ""),
    p_participant_ids: participantIds
  });
  if (error) fail(error.message);
  finish("Pengeluaran susulan ditambahkan ke periode yang sama.");
}

export async function removeExpense(formData: FormData) {
  const { supabase } = await requireAdmin();
  const expenseId = String(formData.get("expense_id") ?? "");
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) fail(error.message);
  finish("Pengeluaran dihapus dari draf.");
}

export async function publishPeriod(formData: FormData) {
  const { supabase } = await requireAdmin();
  const periodId = String(formData.get("period_id") ?? "");
  if (formData.get("confirm_publish") !== "yes") fail("Centang konfirmasi sebelum menerbitkan tagihan.");
  const { error } = await supabase.rpc("publish_billing_period", { p_period_id: periodId });
  if (error) fail(error.message);
  finish("Tagihan berhasil diterbitkan kepada anggota.");
}

export async function reviewPayment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const paymentId = String(formData.get("payment_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("rejection_reason") ?? "").trim();
  if (!paymentId || !["approved", "rejected"].includes(decision)) fail("Keputusan pembayaran tidak valid.");
  if (decision === "rejected" && !reason) fail("Alasan penolakan wajib diisi.");
  const { error } = await supabase.rpc("review_payment", {
    p_payment_id: paymentId,
    p_decision: decision,
    p_rejection_reason: decision === "rejected" ? reason : null
  });
  if (error) fail(error.message);
  finish(decision === "approved" ? "Pembayaran disetujui." : "Pembayaran ditolak dengan alasan.");
}

export async function addRotationTurn(formData: FormData) {
  const { supabase, householdId } = await requireAdmin();
  const assignedUserId = String(formData.get("assigned_user_id") ?? "");
  const scheduledDate = String(formData.get("scheduled_date") ?? "");
  if (!assignedUserId || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) fail("Pilih anggota dan tanggal giliran.");
  const { data: member } = await supabase.from("household_members").select("id")
    .eq("household_id", householdId).eq("user_id", assignedUserId).eq("membership_status", "active").maybeSingle();
  if (!member) fail("Penanggung jawab harus anggota aktif rumah.");
  const { error } = await supabase.from("water_rotation_turns").insert({
    household_id: householdId,
    assigned_user_id: assignedUserId,
    scheduled_date: scheduledDate,
    status: "upcoming"
  });
  if (error) fail(error.message);
  finish("Jadwal giliran berhasil ditambahkan.");
}

export async function updateRotationTurn(formData: FormData) {
  const { supabase } = await requireAdmin();
  const turnId = String(formData.get("turn_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!turnId || !["completed", "skipped"].includes(status)) fail("Perubahan status jadwal tidak valid.");
  const { error } = await supabase.from("water_rotation_turns").update({ status, notes: notes || null }).eq("id", turnId).eq("status", "upcoming");
  if (error) fail(error.message);
  finish(status === "completed" ? "Giliran ditandai selesai." : "Giliran ditandai dilewati.");
}
