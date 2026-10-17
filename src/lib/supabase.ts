import { createClient } from "@supabase/supabase-js";

// Supabase project "cadip-web" (shared; OLS Simulator members live in public.ols_members). The URL and the
// publishable key are meant for the browser — access is enforced by row-level security, not by keeping them secret.
export const SUPABASE_URL = "https://ldywbuhgexqrxqucorqf.supabase.co", SUPABASE_KEY = "sb_publishable_Tlrb3YLiy-YiS0RvaXCHLQ_Bg45NYyT";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
