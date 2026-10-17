"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/logo";
import { LangButton } from "@/components/lang-button";
import { useT } from "@/lib/lang";

// The landing page's top bar, shared by every page so it stays put while moving between them; the current page is lit.
// On phones the items move into a drawer that slides in from the left (☰ at the top left).
const ITEMS: [string, string, string][] = [["Product", "제품", "/product"], ["Project", "프로젝트", "/project"], ["About", "소개", "/about"], ["Contact", "문의", "/contact"]];

export function SiteNav() {
  const path = usePathname(), t = useT();
  const [open, setOpen] = useState(false), [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", esc); return () => removeEventListener("keydown", esc);
  }, [open]);
  const item = (on: boolean) => `transition hover:text-white ${on ? "text-white" : ""}`;
  const close = () => setOpen(false);

  // Rendered into <body> so no page wrapper (overflow, transforms) clips the fixed drawer
  const drawer = (
    <div className="md:hidden" inert={!open}>
      <div onClick={close} className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <nav aria-label={t("Menu", "메뉴")} className={`fixed inset-y-0 left-0 z-[101] flex w-[78vw] max-w-[320px] flex-col bg-[#0b0d10] px-5 py-4 text-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-9 items-center justify-between">
          <Link href="/" onClick={close} aria-label={t("Home", "홈")}><Logo /></Link>
          <button type="button" onClick={close} aria-label={t("Close menu", "메뉴 닫기")} className="-mr-2 grid size-10 place-items-center text-white/70 transition hover:text-white">
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
        </div>
        <ul className="mt-8 space-y-1">
          {ITEMS.map(([en, ko, href]) => (
            <li key={href}><Link href={href} onClick={close} aria-current={path === href ? "page" : undefined}
              className={`block rounded-md px-3 py-3 text-[18px] transition hover:bg-white/[.06] ${path === href ? "bg-white/[.06] text-white" : "text-white/80"}`}>{t(en, ko)}</Link></li>
          ))}
        </ul>
        <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
          <Link href="/signup" onClick={close} className="flex h-11 items-center justify-center rounded-md border border-white/15 text-[15px] text-white/90 transition hover:bg-white/[.06]">{t("Sign up", "회원가입")}</Link>
          <Link href="/login" onClick={close} className="flex h-11 items-center justify-center rounded-md bg-white text-[15px] font-medium text-[#0b0d10] transition hover:bg-white/85">{t("Log in", "로그인")}</Link>
        </div>
      </nav>
    </div>
  );

  return (
    <header className="relative z-10 flex items-center gap-12 px-[4.5vw] py-6 max-lg:gap-8 max-md:gap-3 max-md:px-5 max-md:py-4">
      <button type="button" onClick={() => setOpen(true)} aria-label={t("Open menu", "메뉴 열기")} aria-expanded={open}
        className="-ml-2 grid size-10 place-items-center text-white/85 transition hover:text-white md:hidden">
        <svg viewBox="0 0 20 20" className="size-[22px]" aria-hidden><path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      <Link href="/" aria-label={t("Home", "홈")} className="transition hover:text-white/80"><Logo /></Link>
      <nav className="flex items-center gap-9 text-[15px] text-white/85 max-lg:gap-6 max-md:hidden">
        {ITEMS.map(([en, ko, href]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={item(path === href)}>{t(en, ko)}</Link>)}
      </nav>
      <div className="ml-auto flex items-center gap-6 text-[15px] max-md:gap-4">
        <LangButton />
        <Link href="/signup" aria-current={path === "/signup" ? "page" : undefined} className={`transition hover:text-white max-md:hidden ${path === "/signup" ? "text-white" : "text-white/80"}`}>{t("Sign up", "회원가입")}</Link>
        <Link href="/login" className="flex h-10 items-center rounded-md bg-white px-4 font-medium text-[#0b0d10] transition hover:bg-white/85 max-md:h-9 max-md:px-3 max-md:text-[14px]">{t("Log in", "로그인")}</Link>
      </div>
      {mounted && createPortal(drawer, document.body)}
    </header>
  );
}
