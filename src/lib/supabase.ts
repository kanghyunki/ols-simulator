import { createClient } from "@supabase/supabase-js";

// Supabase project "cadip-web" (shared; OLS Simulator members live in public.ols_members). The URL and the
// publishable key are meant for the browser — access is enforced by row-level security, not by keeping them secret.
export const supabase = createClient("https://ldywbuhgexqrxqucorqf.supabase.co", "sb_publishable_Tlrb3YLiy-YiS0RvaXCHLQ_Bg45NYyT");
