"use client";
import { setLang, useLang } from "@/lib/lang";

// 🌐 EN / KO: switches the site language (two languages, so one click toggles); the label hides on phones
export function LangButton({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <button type="button" onClick={() => setLang(lang === "ko" ? "en" : "ko")}
      aria-label={lang === "ko" ? "Switch to English" : "한국어로 보기"} title={lang === "ko" ? "English" : "한국어"}
      className={`flex items-center gap-1.5 text-white/80 transition hover:text-white ${className}`}>
      <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c2.2 2.1 3.2 4.6 3.2 7.5s-1 5.4-3.2 7.5c-2.2-2.1-3.2-4.6-3.2-7.5s1-5.4 3.2-7.5z" />
      </svg>
      <span className="font-mono text-[13px] tracking-[0.06em] max-md:hidden">{lang === "ko" ? "KO" : "EN"}</span>
    </button>
  );
}
