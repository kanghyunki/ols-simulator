"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { LangButton } from "@/components/lang-button";
import { useT } from "@/lib/lang";

// The landing page's top bar, shared by every page so it stays put while moving between them; the current page is lit.
const ITEMS: [string, string, string][] = [["Product", "제품", "/product"], ["Project", "프로젝트", "/project"], ["About", "소개", "/about"], ["Contact", "문의", "/contact"]];

export function SiteNav() {
  const path = usePathname(), t = useT();
  const item = (on: boolean) => `transition hover:text-white ${on ? "text-white" : ""}`;
  return (
    <header className="relative z-10 flex items-center gap-12 px-[4.5vw] py-6 max-lg:gap-8 max-md:px-5 max-md:py-4">
      <Link href="/" aria-label={t("Home", "홈")} className="transition hover:text-white/80"><Logo /></Link>
      <nav className="flex items-center gap-9 text-[15px] text-white/85 max-lg:gap-6 max-md:hidden">
        {ITEMS.map(([en, ko, href]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={item(path === href)}>{t(en, ko)}</Link>)}
      </nav>
      <div className="ml-auto flex items-center gap-6 text-[15px] max-md:gap-4">
        <LangButton />
        <Link href="/signup" aria-current={path === "/signup" ? "page" : undefined} className={`transition hover:text-white max-md:hidden ${path === "/signup" ? "text-white" : "text-white/80"}`}>{t("Sign up", "회원가입")}</Link>
        <Link href="/login" className="flex h-10 items-center rounded-md bg-white px-4 font-medium text-[#0b0d10] transition hover:bg-white/85 max-md:h-9 max-md:px-3 max-md:text-[14px]">{t("Log in", "로그인")}</Link>
      </div>
    </header>
  );
}
