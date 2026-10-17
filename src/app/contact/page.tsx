"use client";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { useT } from "@/lib/lang";

// Contact (formerly /demo, which redirects here): request a demo. No backend: sending opens the visitor's mail app with the brief filled in.
const TO = "";   // recipient address — set before going live
// [value (sent in the email, English), Korean label]
const SECTORS = [["Airport operator", "공항 운영자"], ["Civil aviation authority", "항공당국"], ["Engineering / consultancy", "엔지니어링 / 컨설팅"], ["Government / public sector", "정부 / 공공기관"], ["Academia", "학계"], ["Other", "기타"]];
const EXPLORE = ["OLS Simulator", "Flight Procedure"];

const label = "mb-2 block text-[14px] font-medium text-white/85";
const field = "w-full rounded-md border border-white/12 bg-white/[.04] px-4 text-[16px] text-white placeholder:text-white/35 outline-none transition focus:border-[#4f7dff] focus:bg-white/[.06]";
const select = `${field} h-14 appearance-none pr-12`;
const Chevron = () => <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-4 bottom-[19px] size-[18px] text-white/60" aria-hidden><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;

export default function Contact() {
  const [f, setF] = useState({ name: "", email: "", company: "", sector: "", explore: EXPLORE[0], context: "" });
  const [sent, setSent] = useState(false), t = useT();
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
          <Reveal><p className="mb-6 font-mono text-[12px] tracking-[0.14em] text-white/55">{t("CONTACT", "문의")}</p></Reveal>
          <Reveal delay={100}><h1 className="font-serif text-[clamp(48px,6.2vw,96px)] leading-[0.95] text-[#f3eee6]">{t(<>What are you<br />looking to solve?</>, <>어떤 문제를<br />해결하고 싶으신가요?</>)}</h1></Reveal>
          <Reveal delay={250}><p className="mt-8 max-w-[520px] text-[clamp(16px,1.3vw,19px)] leading-relaxed text-white/70 max-lg:mb-12">
            {t("Whether you are reviewing the obstacle surfaces of an existing airport, planning a runway extension or checking an instrument procedure, tell us a little about your project.", "기존 공항의 장애물제한표면 검토, 활주로 연장 계획, 계기비행절차 확인 등 진행 중인 프로젝트를 간단히 알려 주세요.")}
          </p></Reveal>
        </section>

        <Reveal delay={400}>
        <form onSubmit={send} className="grid grid-cols-2 gap-x-6 gap-y-7 max-md:grid-cols-1">
          <div><label className={label} htmlFor="name">{t("Name *", "이름 *")}</label><input id="name" required autoComplete="name" placeholder={t("Hong Gildong", "홍길동")} value={f.name} onChange={up("name")} className={`${field} h-14`} /></div>
          <div><label className={label} htmlFor="email">{t("Work email *", "업무용 이메일 *")}</label><input id="email" type="email" required autoComplete="email" placeholder="Hong@company.com" value={f.email} onChange={up("email")} className={`${field} h-14`} /></div>
          <div><label className={label} htmlFor="company">{t("Company", "회사")}</label><input id="company" autoComplete="organization" placeholder={t("Company name", "회사명")} value={f.company} onChange={up("company")} className={`${field} h-14`} /></div>
          <div className="relative">
            <label className={label} htmlFor="sector">{t("Sector", "분야")}</label>
            <select id="sector" value={f.sector} onChange={up("sector")} className={`${select} ${f.sector ? "" : "text-white/35"}`}>
              <option value="" disabled>{t("Pick one", "선택하세요")}</option>{SECTORS.map(([s, k]) => <option key={s} value={s} className="bg-[#14161a] text-white">{t(s, k)}</option>)}
            </select><Chevron />
          </div>
          <div className="relative col-span-2 max-md:col-span-1">
            <label className={label} htmlFor="explore">{t("What are you looking to explore? *", "관심 있는 제품 *")}</label>
            <select id="explore" value={f.explore} onChange={up("explore")} className={select}>{EXPLORE.map((s) => <option key={s} className="bg-[#14161a] text-white">{s}</option>)}</select><Chevron />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <label className={label} htmlFor="context">{t("Project context *", "프로젝트 개요 *")}</label>
            <textarea id="context" required rows={6} placeholder={t("A short introduction to the airport, runway or requirement is enough.", "공항, 활주로 또는 요구사항을 간단히 소개해 주시면 충분합니다.")} value={f.context} onChange={up("context")} className={`${field} resize-y py-4 leading-relaxed`} />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <button type="submit" disabled={!ok} className="h-14 w-full max-w-[420px] rounded-md bg-[#3f6bff] font-mono text-[13px] tracking-[0.14em] text-white transition hover:bg-[#5a80ff] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">
              {t("SEND PROJECT BRIEF", "프로젝트 개요 보내기")}
            </button>
            <p className="mt-5 text-[15px] text-white/60">{sent ? t("Your mail app has opened with the brief — just press send.", "메일 앱에 내용이 채워졌습니다. 보내기만 누르시면 됩니다.") : t("A short introduction is enough. We can define the next steps together.", "간단한 소개면 충분합니다. 다음 단계는 함께 정하겠습니다.")}</p>
          </div>
        </form>
        </Reveal>
      </main>
    </div>
  );
}
