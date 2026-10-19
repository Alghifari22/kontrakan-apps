import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getActiveHouseholdContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, profile: null, membership: null, configured: false };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, membership: null, configured: true };

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("household_members")
      .select("household_id, role, households(name)")
      .eq("user_id", user.id)
      .eq("membership_status", "active")
      .limit(1)
      .maybeSingle()
  ]);

  const membershipRecord = membership as any;
  const household = Array.isArray(membershipRecord?.households)
    ? membershipRecord.households[0]
    : membershipRecord?.households;
  const normalizedMembership = membership ? { ...membershipRecord, households: household } : null;
  return { supabase, user, profile, membership: normalizedMembership, configured: true };
}
