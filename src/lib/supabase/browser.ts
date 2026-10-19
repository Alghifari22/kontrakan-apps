import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Konfigurasi Supabase belum diisi.");
  return createBrowserClient(config.url, config.anonKey);
}
