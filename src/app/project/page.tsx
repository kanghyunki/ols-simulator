"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";

// Project: the airport projects OLS Simulator grew out of. Organisations are named in text, not with their logos
// (official marks need each owner's permission).
const PROJECTS = [
  ["2017", "Incheon International Airport", "Phase 4 Basic and Detail Design", "IIAC project"],
  ["2025", "Beira & Pemba Airports, Mozambique", "Modernisation Feasibility Study", "Korea Eximbank project"],
  ["2026", "Papua New Guinea CADIP-II", "Master Plan", "Asian Development Bank project"],
];

export default function ProjectPage() {
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(180,138,92,.14),rgba(5,6,8,0)_70%)]" />
      <header className="relative flex items-center px-[4.5vw] py-6 max-md:px-5 max-md:py-4">
        <Link href="/" className="transition hover:text-white/80"><Logo /></Link>
      </header>

      <section className="relative min-h-[calc(100svh-80px)] px-[4.5vw] pt-[12vh] pb-32 max-md:px-5 max-md:pt-10 max-md:pb-20">
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-[6vw] max-lg:grid-cols-1 max-lg:gap-y-10">
          <div>
            <Reveal><h1 className="font-serif text-[clamp(48px,6.2vw,96px)] leading-[0.95] text-[#f3eee6]">Project</h1></Reveal>
            <Reveal delay={200}><p className="mt-8 max-w-[380px] text-[clamp(20px,1.8vw,26px)] leading-snug text-white/85">Built from the field — every feature comes from a real project.</p></Reveal>
          </div>
          <ol className="border-t border-white/10 lg:mt-4">
            {PROJECTS.map(([y, name, scope, by], i) => (
              <Reveal key={y} delay={i * 120}>
                <li className="grid grid-cols-[110px_minmax(0,1fr)] gap-6 border-b border-white/10 py-8 max-md:grid-cols-1 max-md:gap-2 max-md:py-6">
                  <span className="font-serif text-[44px] leading-none text-[#f3eee6] max-md:text-[34px]">{y}</span>
                  <div>
                    <div className="text-[19px] font-semibold text-white">{name}</div>
                    <div className="mt-1 text-[16px] text-white/65">{scope}</div>
                    <div className="mt-3 font-mono text-[11.5px] tracking-[0.12em] text-[#d8b48a] uppercase">{by}</div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <footer className="relative mx-[4.5vw] flex items-center justify-between border-t border-white/[.07] py-6 text-[12.5px] text-white/40 max-md:mx-5">
        <Link href="/" className="transition hover:text-white/70"><Logo /></Link><span>© 2026 OLS Simulator</span>
      </footer>
    </div>
  );
}
