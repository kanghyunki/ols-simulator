import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Supabase project "cadip-web" (shared; OLS Simulator members live in public.ols_members). The URL and the
// publishable key are meant for the browser — access is enforced by row-level security, not by keeping them secret.
export const SUPABASE_URL = "https://ldywbuhgexqrxqucorqf.supabase.co", SUPABASE_KEY = "sb_publishable_Tlrb3YLiy-YiS0RvaXCHLQ_Bg45NYyT";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Local dev server (next dev) only: the members-only pages open without signing in, as a demo member. Production builds
// compile this to false, so the deployed site always asks for a real sign-in.
export const DEV = process.env.NODE_ENV === "development";
const DEMO = { access_token: "", refresh_token: "", expires_in: 0, token_type: "bearer",
  user: { id: "dev-demo", email: "demo@localhost", app_metadata: { provider: "email", plan: "ultra", free_until: "2027-10-28" }, user_metadata: { name: "Demo Member" }, aud: "authenticated", created_at: "2026-01-01T00:00:00Z", last_sign_in_at: new Date().toISOString() } } as unknown as Session;

// The signed-in session, kept current across sign-in and sign-out: undefined while it is being read, null when signed out
export function useSession() {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const put = (x: Session | null) => setS(x ?? (DEV ? DEMO : null));
    supabase.auth.getSession().then(({ data }) => put(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => put(session));
    return () => data.subscription.unsubscribe();
  }, []);
  return s;
}
// Name and picture for the avatar: Google gives full_name / avatar_url, the email sign-up stores name
export const profileOf = (s: Session) => { const m = s.user.user_metadata ?? {};
  return { name: (m.full_name || m.name || s.user.email || "") as string, avatar: (m.avatar_url || m.picture || null) as string | null, email: s.user.email ?? "" }; };
