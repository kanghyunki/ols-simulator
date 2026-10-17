"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { useT } from "@/lib/lang";

// Project: the airport projects OLS Simulator grew out of. Organisations are named in text, not with their logos
// (official marks need each owner's permission).
const PROJECTS = [
  ["2017", "Incheon International Airport", "Phase 4 Basic and Detail Design", "IIAC project", "인천국제공항", "4단계 기본 및 실시설계", "인천국제공항공사 사업", "~2022", "~2022"],
  ["2022", "Incheon International Airport", "Mid- to Long-term Development Strategy Review for Post-COVID Changes", "IIAC project", "인천국제공항", "포스트 코로나 등 환경변화에 따른\n인천국제공항 중장기 개발전략 재정비 용역", "인천국제공항 사업", "~2024", "~2024"],
  ["2024", "Beira & Pemba Airports, Mozambique", "Modernisation Feasibility Study", "Korea Eximbank project", "모잠비크 베이라·펨바 공항", "현대화 사업 타당성조사", "한국수출입은행 사업", "~2025", "~2025"],
  ["2025", "Papua New Guinea CADIP-II", "Detailed Design and Construction Supervision", "Asian Development Bank project", "파푸아뉴기니 CADIP-II", "실시설계 및 감리", "아시아개발은행(ADB) 사업", "~Ongoing", "~진행중"],
  ["2026", "Papua New Guinea CADIP-II", "Master Plan", "Asian Development Bank project", "파푸아뉴기니 CADIP-II", "마스터플랜", "아시아개발은행(ADB) 사업", "~Ongoing", "~진행중"],
];

export default function ProjectPage() {
  const t = useT();
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(180,138,92,.14),rgba(5,6,8,0)_70%)]" />
      <SiteNav />

      <section className="relative min-h-[calc(100svh-80px)] px-[4.5vw] pt-[12vh] pb-32 max-md:px-5 max-md:pt-10 max-md:pb-20">
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-[6vw] max-lg:grid-cols-1 max-lg:gap-y-10">
          <div>
            <Reveal><h1 className="font-serif text-[clamp(48px,6.2vw,96px)] leading-[0.95] text-[#f3eee6]">{t("Project", "프로젝트")}</h1></Reveal>
          </div>
          <ol className="border-t border-white/10 lg:mt-4">
            {PROJECTS.map(([y, name, scope, by, kName, kScope, kBy, end, kEnd], i) => (
              <Reveal key={y + name} delay={i * 120}>
                <li className="grid grid-cols-[190px_minmax(0,1fr)] gap-6 border-b border-white/10 py-8 max-md:grid-cols-1 max-md:gap-2 max-md:py-6">
                  <div className="font-serif leading-none whitespace-nowrap">
                    <div className="text-[44px] text-[#f3eee6] max-md:text-[34px]">{y}</div>
                    <div className="mt-1 text-[44px] text-[#f3eee6] max-md:text-[34px]">{t(end, kEnd)}</div>
                  </div>
                  <div>
                    <div className="text-[19px] font-semibold text-white">{t(name, kName)}</div>
                    <div className="mt-1 text-[16px] whitespace-pre-line text-white/65">{t(scope, kScope)}</div>
                    <div className="mt-3 font-mono text-[11.5px] tracking-[0.12em] text-[#d8b48a] uppercase">{t(by, kBy)}</div>
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
