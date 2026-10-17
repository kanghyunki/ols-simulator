"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { supabase, SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";
import { useT } from "@/lib/lang";

// Log in: email first, then the password (Supabase Auth, the accounts made on /signup). Google goes through Supabase
// OAuth, which works once the Google provider is switched on in the Supabase dashboard.
const field = "h-12 w-full rounded-md border border-white/12 bg-white/[.04] px-4 text-[16px] text-white placeholder:text-white/35 outline-none transition focus:border-[#4f7dff] focus:bg-white/[.06]";

export default function Login() {
  const t = useT();
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [step, setStep] = useState<"email" | "password">("email");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null), [who, setWho] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setWho(data.session?.user.email ?? null)); }, []);
  const okEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (step === "email") { if (okEmail) setStep("password"); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.code === "email_not_confirmed" ? t("Please confirm your email first — check your inbox for the link.", "먼저 이메일 인증을 완료해 주세요. 받은편지함의 링크를 확인해 주세요.") : t("The email or password is not right.", "이메일 또는 비밀번호가 맞지 않습니다.") });
    else setWho(data.user.email ?? email.trim());
  };
  const google = async () => {
    setMsg(null);
    // OAuth redirects straight to Supabase, which shows a raw error page if Google is off — check its public settings first
    const on = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } }).then((r) => r.json()).then((s) => !!s.external?.google).catch(() => false);
    if (!on) { setMsg({ ok: false, text: t("Google sign-in is not available yet. Please continue with email.", "Google 로그인은 아직 준비 중입니다. 이메일로 계속해 주세요.") }); return; }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/login` } });
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(180,138,92,.16),rgba(5,6,8,0)_70%)]" />
      <SiteNav />

      <main className="relative mx-auto flex w-full max-w-[400px] flex-col items-center px-5 pt-[10vh] pb-20 max-md:pt-10">
        <Reveal><svg viewBox="0 0 20 20" className="size-14 text-white" aria-hidden><path d="M2 14 L10 4 L18 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M5 16.5 H15" stroke="#4f7dff" strokeWidth="1.6" /></svg></Reveal>
        <Reveal delay={100}><h1 className="mt-6 text-center font-serif text-[clamp(34px,4vw,44px)] leading-tight text-[#f3eee6]">{t("Log in to OLS Simulator", "OLS Simulator 로그인")}</h1></Reveal>

        <Reveal delay={250} className="w-full">
        {who ? (
          <div className="mt-10 w-full text-center">
            <p className="text-[16px] text-white/75">{t(<>Signed in as <span className="text-white">{who}</span></>, <><span className="text-white">{who}</span>(으)로 로그인됨</>)}</p>
            <Link href="/#ICN" className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-[#3f6bff] text-[15px] font-medium text-white transition hover:bg-[#5a80ff]">{t("Open the simulator", "시뮬레이터 열기")}</Link>
            <button type="button" onClick={() => supabase.auth.signOut().then(() => { setWho(null); setStep("email"); setPw(""); })} className="mt-4 text-[14px] text-white/55 underline-offset-4 transition hover:text-white hover:underline">{t("Log out", "로그아웃")}</button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="mt-10 w-full">
              <label htmlFor="email" className="mb-2 block text-[14px] font-medium text-white/85">{t("Email", "이메일")}</label>
              <input id="email" type="email" autoComplete="email" placeholder={t("Your email address", "이메일 주소")} value={email} required
                onChange={(e) => { setEmail(e.target.value); if (step === "password") setStep("email"); }} className={field} />
              {step === "password" && <>
                <label htmlFor="pw" className="mt-5 mb-2 block text-[14px] font-medium text-white/85">{t("Password", "비밀번호")}</label>
                <input id="pw" type="password" autoComplete="current-password" autoFocus placeholder={t("Your password", "비밀번호 입력")} value={pw} required onChange={(e) => setPw(e.target.value)} className={field} />
              </>}
              <button type="submit" disabled={!okEmail || busy || (step === "password" && !pw)}
                className="mt-5 h-12 w-full rounded-md bg-[#3f6bff] text-[15px] font-medium text-white transition hover:bg-[#5a80ff] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">
                {step === "email" ? t("Continue with email", "이메일로 계속") : busy ? t("Logging in…", "로그인 중…") : t("Log in", "로그인")}
              </button>
            </form>

            <div className="my-7 flex w-full items-center gap-4 font-mono text-[12px] tracking-[0.14em] text-white/40"><span className="h-px flex-1 bg-white/12" />{t("OR", "또는")}<span className="h-px flex-1 bg-white/12" /></div>

            <button type="button" onClick={google} className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-white/15 bg-white/[.03] text-[15px] font-medium text-white transition hover:bg-white/[.07]">
              <svg viewBox="0 0 48 48" className="size-5" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
              {t("Continue with Google", "Google로 계속")}
            </button>
          </>
        )}
        </Reveal>

        {msg && <p role="status" className={`mt-6 text-center text-[14.5px] ${msg.ok ? "text-[#6fcf8a]" : "text-[#f0625c]"}`}>{msg.text}</p>}
        {!who && <Reveal delay={400}><p className="mt-9 text-[15px] text-white/55">{t("Don’t have an account?", "계정이 없으신가요?")} <Link href="/signup" className="text-[#7d9bff] transition hover:text-[#a3b9ff]">{t("Get started", "회원가입")}</Link></p></Reveal>}
      </main>
    </div>
  );
}
