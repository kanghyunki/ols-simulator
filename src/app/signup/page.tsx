"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { dialCodes, type Dial } from "@/data/dial-codes";
import { supabase } from "@/lib/supabase";

// Sign up (formerly /signin, which redirects here). New emails sign up through Supabase Auth (the password stays in Auth; name, phone, birth date and consent go
// to public.ols_members via a database trigger). An email that already has an account signs in with the password.
const label = "mb-2 block text-[14px] font-medium text-white/85";
const field = "h-14 w-full rounded-md border border-white/12 bg-white/[.04] px-4 text-[16px] text-white placeholder:text-white/35 outline-none transition focus:border-[#4f7dff] focus:bg-white/[.06]";

// Country calling code picker with search (name, ISO code or number)
function DialPicker({ value, onChange }: { value: Dial; onChange: (d: Dial) => void }) {
  const all = useMemo(dialCodes, []);
  const [open, setOpen] = useState(false), [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off); return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const t = q.trim().toLowerCase().replace(/^\+/, "");
  const hits = t ? all.filter((d) => d.name.toLowerCase().includes(t) || d.iso.toLowerCase() === t || d.code.startsWith(t)) : all;
  const pick = (d: Dial) => { onChange(d); setOpen(false); setQ(""); };

  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label="Country code" onClick={() => setOpen((o) => !o)}
        className={`${field} flex items-center gap-2 pr-3 text-left`}>
        <span className="font-mono text-[13px] text-white/50">{value.iso}</span><span>+{value.code}</span>
        <svg viewBox="0 0 20 20" className="ml-auto size-[18px] text-white/60" aria-hidden><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-10 w-[320px] max-w-[85vw] overflow-hidden rounded-md border border-white/12 bg-[#14161a] shadow-2xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country or code"
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter") { e.preventDefault(); if (hits[0]) pick(hits[0]); } }}
            className="h-11 w-full border-b border-white/10 bg-transparent px-4 text-[15px] text-white placeholder:text-white/35 outline-none" />
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1 [scrollbar-width:thin]">
            {hits.map((d) => (
              <li key={d.iso} role="option" aria-selected={d.iso === value.iso} onClick={() => pick(d)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-[14.5px] hover:bg-white/[.06] ${d.iso === value.iso ? "text-white" : "text-white/75"}`}>
                <span className="w-6 font-mono text-[12px] text-white/45">{d.iso}</span><span className="truncate">{d.name}</span><span className="ml-auto text-white/50">+{d.code}</span>
              </li>
            ))}
            {!hits.length && <li className="px-4 py-3 text-[14px] text-white/40">No match</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

const ERRORS: Record<string, string> = {
  email_address_not_authorized: "Sign-up emails are not enabled for this address yet. Please try again later or request a demo.",
  over_email_send_rate_limit: "Too many sign-ups in a short time. Please try again in an hour.",
  email_address_invalid: "That email address is not accepted. Please use your work email.",
  weak_password: "That password is too weak. Use at least 8 characters with letters and numbers.",
};

export default function SignUp() {
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "", dob: "" });
  const [dial, setDial] = useState<Dial>({ iso: "KR", code: "82", name: "South Korea" });
  const [agree, setAgree] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const today = new Date().toISOString().slice(0, 10);
  // Back from the confirmation link (or already signed in): the client picks the session up from the URL
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { const e = data.session?.user.email; if (e) setMsg({ ok: true, text: `Signed in as ${e}.` }); }); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ok || busy) return;
    setBusy(true); setMsg(null);
    const email = f.email.trim(), password = f.password;
    const { data, error } = await supabase.auth.signUp({ email, password, options: {
      emailRedirectTo: `${location.origin}/signup`,
      data: { app: "ols-simulator", name: f.name.trim(), phone_country: dial.iso, phone_code: dial.code, phone: f.phone.replace(/\D/g, ""), birth_date: f.dob, privacy_consent: true },
    } });
    // An existing account comes back as a user with no identities (Supabase hides whether the email is taken): sign in instead
    if (!error && data.user && !data.user.identities?.length) {
      const r = await supabase.auth.signInWithPassword({ email, password });
      setMsg(r.error ? { ok: false, text: "That email already has an account, and the password does not match." } : { ok: true, text: `Signed in as ${email}.` });
    } else if (error) setMsg({ ok: false, text: ERRORS[error.code ?? ""] ?? error.message });
    else setMsg({ ok: true, text: data.session ? `Welcome, ${f.name.trim()} — your account is ready.` : `Almost done — we sent a confirmation link to ${email}.` });
    setBusy(false);
  };
  const ok = f.name.trim() && /^[\d\s-]{6,16}$/.test(f.phone) && /^\S+@\S+\.\S+$/.test(f.email) && f.password.length >= 8 && f.dob && f.dob < today && agree;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(180,138,92,.16),rgba(5,6,8,0)_70%)]" />
      <SiteNav />

      <main className="relative grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-[6vw] px-[4.5vw] pt-[6vh] pb-20 max-lg:grid-cols-1 max-md:px-5 max-md:pt-6">
        <section>
          <p className="mb-6 font-mono text-[12px] tracking-[0.14em] text-white/55">ACCOUNT</p>
          <h1 className="font-serif text-[clamp(48px,6.2vw,96px)] leading-[0.95] text-[#f3eee6]">Sign up</h1>
          <p className="mt-8 max-w-[520px] text-[clamp(16px,1.3vw,19px)] leading-relaxed text-white/70 max-lg:mb-12">
            Your workspace for obstacle limitation surfaces, runway scenarios and flight procedures.
          </p>
        </section>

        <form onSubmit={submit} className="grid grid-cols-2 gap-x-6 gap-y-7 max-md:grid-cols-1">
          <div className="col-span-2 max-md:col-span-1"><label className={label} htmlFor="name">Name *</label><input id="name" required autoComplete="name" placeholder="Hong Gildong" value={f.name} onChange={up("name")} className={field} /></div>
          <div className="col-span-2 max-md:col-span-1">
            <label className={label} htmlFor="phone">Phone number *</label>
            <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3">
              <DialPicker value={dial} onChange={setDial} />
              <input id="phone" type="tel" required autoComplete="tel-national" inputMode="tel" placeholder="10 1234 5678" value={f.phone} onChange={up("phone")} className={field} />
            </div>
          </div>
          <div><label className={label} htmlFor="email">Email address *</label><input id="email" type="email" required autoComplete="email" placeholder="Hong@company.com" value={f.email} onChange={up("email")} className={field} /></div>
          <div><label className={label} htmlFor="password">Password *</label><input id="password" type="password" required minLength={8} autoComplete="current-password" placeholder="At least 8 characters" value={f.password} onChange={up("password")} className={field} /></div>
          <div><label className={label} htmlFor="dob">Date of birth *</label><input id="dob" type="date" required max={today} value={f.dob} onChange={up("dob")} className={`${field} [color-scheme:dark] ${f.dob ? "" : "text-white/35"}`} /></div>
          <div className="col-span-2 max-md:col-span-1">
            <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug text-white/75">
              <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#3f6bff]" />
              Do you agree to the collection and use of your personal information? *
            </label>
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <button type="submit" disabled={!ok || busy} className="h-14 w-full max-w-[420px] rounded-md bg-[#3f6bff] font-mono text-[13px] tracking-[0.14em] text-white transition hover:bg-[#5a80ff] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">
              {busy ? "SIGNING UP…" : "SIGN UP"}
            </button>
            <p role="status" className={`mt-5 text-[15px] ${msg ? (msg.ok ? "text-[#6fcf8a]" : "text-[#f0625c]") : "text-white/60"}`}>
              {msg ? msg.text : <>Questions first? <Link href="/contact" className="text-white/85 underline-offset-4 hover:underline">Contact us</Link></>}
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
