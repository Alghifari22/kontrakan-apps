"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=configuration");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=credentials");

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("membership_status", "active")
    .maybeSingle();

  if (membershipError || !membership) redirect("/login?error=membership");
  redirect(membership.role === "admin" ? "/admin" : "/dashboard");
}
