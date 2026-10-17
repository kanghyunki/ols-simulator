"use client";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";

// Contact (formerly /demo, which redirects here): request a demo. No backend: sending opens the visitor's mail app with the brief filled in.
const TO = "";   // recipient address — set before going live
const SECTORS = ["Airport operator", "Civil aviation authority", "Engineering / consultancy", "Government / public sector", "Academia", "Other"];
const EXPLORE = ["OLS Simulator", "Flight Procedure"];

const label = "mb-2 block text-[14px] font-medium text-white/85";
const field = "w-full rounded-md border border-white/12 bg-white/[.04] px-4 text-[16px] text-white placeholder:text-white/35 outline-none transition focus:border-[#4f7dff] focus:bg-white/[.06]";
const select = `${field} h-14 appearance-none pr-12`;
const Chevron = () => <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-4 bottom-[19px] size-[18px] text-white/60" aria-hidden><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;

export default function Contact() {
  const [f, setF] = useState({ name: "", email: "", company: "", sector: "", explore: EXPLORE[0], context: "" });
  const [sent, setSent] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim() && /^\S+@\S+\.\S+$/.test(f.email) && f.context.trim();

  const send = (e: React.FormEvent) => {
    e.preventDefault(); if (!ok) return;
    const body = [`Name: ${f.name}`, `Email: ${f.email}`, `Company: ${f.company || "-"}`, `Sector: ${f.sector || "-"}`, `Looking to explore: ${f.explore}`, "", f.context].join("\n");
    location.href = `mailto:${TO}?subject=${encodeURIComponent(`OLS Simulator demo request — ${f.company || f.name}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(180,138,92,.16),rgba(5,6,8,0)_70%)]" />
      <SiteNav />

      <main className="relative grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-[6vw] px-[4.5vw] pt-[6vh] pb-20 max-lg:grid-cols-1 max-md:px-5 max-md:pt-6">
        <section>
          <p className="mb-6 font-mono text-[12px] tracking-[0.14em] text-white/55">CONTACT</p>
          <h1 className="font-serif text-[clamp(48px,6.2vw,96px)] leading-[0.95] text-[#f3eee6]">What are you<br />looking to solve?</h1>
          <p className="mt-8 max-w-[520px] text-[clamp(16px,1.3vw,19px)] leading-relaxed text-white/70 max-lg:mb-12">
            Whether you are reviewing the obstacle surfaces of an existing airport, planning a runway extension or checking an instrument procedure, tell us a little about your project.
          </p>
        </section>

        <form onSubmit={send} className="grid grid-cols-2 gap-x-6 gap-y-7 max-md:grid-cols-1">
          <div><label className={label} htmlFor="name">Name *</label><input id="name" required autoComplete="name" placeholder="Hong Gildong" value={f.name} onChange={up("name")} className={`${field} h-14`} /></div>
          <div><label className={label} htmlFor="email">Work email *</label><input id="email" type="email" required autoComplete="email" placeholder="Hong@company.com" value={f.email} onChange={up("email")} className={`${field} h-14`} /></div>
          <div><label className={label} htmlFor="company">Company</label><input id="company" autoComplete="organization" placeholder="Company name" value={f.company} onChange={up("company")} className={`${field} h-14`} /></div>
          <div className="relative">
            <label className={label} htmlFor="sector">Sector</label>
            <select id="sector" value={f.sector} onChange={up("sector")} className={`${select} ${f.sector ? "" : "text-white/35"}`}>
              <option value="" disabled>Pick one</option>{SECTORS.map((s) => <option key={s} className="bg-[#14161a] text-white">{s}</option>)}
            </select><Chevron />
          </div>
          <div className="relative col-span-2 max-md:col-span-1">
            <label className={label} htmlFor="explore">What are you looking to explore? *</label>
            <select id="explore" value={f.explore} onChange={up("explore")} className={select}>{EXPLORE.map((s) => <option key={s} className="bg-[#14161a] text-white">{s}</option>)}</select><Chevron />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <label className={label} htmlFor="context">Project context *</label>
            <textarea id="context" required rows={6} placeholder="A short introduction to the airport, runway or requirement is enough." value={f.context} onChange={up("context")} className={`${field} resize-y py-4 leading-relaxed`} />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <button type="submit" disabled={!ok} className="h-14 w-full max-w-[420px] rounded-md bg-[#3f6bff] font-mono text-[13px] tracking-[0.14em] text-white transition hover:bg-[#5a80ff] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">
              SEND PROJECT BRIEF
            </button>
            <p className="mt-5 text-[15px] text-white/60">{sent ? "Your mail app has opened with the brief — just press send." : "A short introduction is enough. We can define the next steps together."}</p>
          </div>
        </form>
      </main>
    </div>
  );
}
