import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Supabase project "cadip-web" (shared; OLS Simulator members live in public.ols_members). The URL and the
// publishable key are meant for the browser — access is enforced by row-level security, not by keeping them secret.
export const SUPABASE_URL = "https://ldywbuhgexqrxqucorqf.supabase.co", SUPABASE_KEY = "sb_publishable_Tlrb3YLiy-YiS0RvaXCHLQ_Bg45NYyT";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// The signed-in session, kept current across sign-in and sign-out: undefined while it is being read, null when signed out
export function useSession() {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setS(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setS(session));
    return () => data.subscription.unsubscribe();
  }, []);
  return s;
}
// Name and picture for the avatar: Google gives full_name / avatar_url, the email sign-up stores name
export const profileOf = (s: Session) => { const m = s.user.user_metadata ?? {};
  return { name: (m.full_name || m.name || s.user.email || "") as string, avatar: (m.avatar_url || m.picture || null) as string | null, email: s.user.email ?? "" }; };
