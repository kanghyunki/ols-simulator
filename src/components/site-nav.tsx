"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

// The landing page's top bar, shared by every page so it stays put while moving between them; the current page is lit.
// ponytail: Process has no page yet — a button with no action until it exists
const ITEMS: [string, string | null][] = [["Product", "/product"], ["Project", "/project"], ["About", "/about"], ["Process", null], ["Contact", "/contact"]];

export function SiteNav() {
  const path = usePathname();
  const item = (on: boolean) => `transition hover:text-white ${on ? "text-white" : ""}`;
  return (
    <header className="relative z-10 flex items-center gap-12 px-[4.5vw] py-6 max-lg:gap-8 max-md:px-5 max-md:py-4">
      <Link href="/" aria-label="Home" className="transition hover:text-white/80"><Logo /></Link>
      <nav className="flex items-center gap-9 text-[15px] text-white/85 max-lg:gap-6 max-md:hidden">
        {ITEMS.map(([t, href]) => href
          ? <Link key={t} href={href} aria-current={path === href ? "page" : undefined} className={item(path === href)}>{t}</Link>
          : <button key={t} type="button" className={item(false)}>{t}</button>)}
      </nav>
      <div className="ml-auto flex items-center gap-6 text-[15px] max-md:gap-4">
        <Link href="/signin" aria-current={path === "/signin" ? "page" : undefined} className={`transition hover:text-white max-md:hidden ${path === "/signin" ? "text-white" : "text-white/80"}`}>Sign in</Link>
        <Link href="/login" className="flex h-10 items-center rounded-md bg-white px-4 font-medium text-[#0b0d10] transition hover:bg-white/85 max-md:h-9 max-md:px-3 max-md:text-[14px]">Log in</Link>
      </div>
    </header>
  );
}
