"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";
import { Landing, type FanMode } from "@/components/landing";
import { Simulator } from "@/components/simulator";
import { useT } from "@/lib/lang";

// landing → (Explore) leaving: the fan spools up and the camera flies into the hub → app: the simulator mounts
// (after the fly-in, so its first heavy build does not stutter the animation) and the landing fades out over it.
// app → (Home) returning: the landing fades back in from inside the hub and pulls out → landing: the simulator unmounts.
// A link with an airport hash (#ICN) skips straight to the simulator.
type Phase = "init" | "landing" | "leaving" | "app" | "returning";
const FAN: Record<Phase, FanMode> = { init: "idle", landing: "idle", leaving: "leave", app: "leave", returning: "enter" };

// Organisations, set as plain wordmarks (not their official marks, which need each owner's permission to use)
const ORGS: { name: string; sub?: string; koName?: string; koSub?: string; cls: string }[] = [
  { name: "MOLIT", sub: "Ministry of Land, Infrastructure and Transport · Korea", koSub: "국토교통부", cls: "font-sans text-[30px] font-semibold tracking-[0.06em]" },
  { name: "ACI", sub: "Airports Council International", koSub: "국제공항협의회", cls: "font-sans text-[34px] font-bold tracking-[0.12em]" },
  { name: "ICAO", koSub: "국제민간항공기구", cls: "font-serif text-[40px] tracking-[0.22em]" },
  { name: "IATA", koSub: "국제항공운송협회", cls: "font-sans text-[36px] font-bold italic tracking-[0.04em]" },
  { name: "KECC", sub: "Korea Engineering Consultants Corp.", koSub: "(주)한국종합기술", cls: "font-sans text-[32px] font-semibold tracking-[0.1em]" },
  { name: "한국항공교통협회", cls: "font-sans text-[24px] font-semibold tracking-[0.02em]" },
  { name: "Korea Aerospace University", koName: "한국항공대학교", cls: "font-serif text-[27px] leading-tight" },
  { name: "Flexa", sub: "ltd", cls: "font-sans text-[34px] font-light tracking-[0.02em]" },
];
// Footer columns: [English, 한국어, link] — entries without a page yet are plain text
const FOOTER: [string, string, [string, string, string | null][]][] = [
  ["Product", "제품", [["OLS Simulator", "OLS Simulator", "/product"], ["Flight Procedure", "Flight Procedure", "/product"]]],
  ["Project", "프로젝트", [["CADIP-II", "CADIP-II", "/project"], ["Airports", "공항", "/project"]]],
  ["About", "소개", [["Company", "회사 소개", "/about"], ["Team", "팀", null]]],
  ["Contact", "문의", [["Request a demo", "데모 요청", "/contact"]]],
];

export default function Page() {
  const [phase, setPhase] = useState<Phase>("init");
  const t = useT();
  const [gone, setGone] = useState(false);   // landing fully faded → unmount it
  useEffect(() => { setPhase(location.hash ? "app" : "landing"); }, []);
  useEffect(() => { if (phase !== "app") return; const t = setTimeout(() => setGone(true), 900); return () => clearTimeout(t); }, [phase]);
  const home = () => { history.replaceState(null, "", location.pathname); setGone(false); setPhase("returning"); };

  if (phase === "init") return <div className="fixed inset-0 bg-[#050608]" />;
  const moving = phase !== "landing";
  return (
    <>
      {(phase === "app" || phase === "returning") && <Simulator onHome={home} />}
      {!gone && (
        <div className={`fixed inset-0 z-50 overflow-x-hidden bg-[#050608] text-white transition-opacity duration-[900ms] ease-out ${moving ? "overflow-y-hidden" : "overflow-y-auto"} ${phase === "app" ? "pointer-events-none opacity-0" : "opacity-100"} ${phase === "returning" ? "animate-[ols-fade-in_900ms_ease-out]" : ""}`}>
          <section className="relative h-[100svh] overflow-hidden">
            <Landing mode={FAN[phase]} onDone={() => setPhase((p) => (p === "leaving" ? "app" : p === "returning" ? "landing" : p))} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_100%,rgba(5,6,8,.92)_20%,rgba(5,6,8,0)_60%)] max-md:bg-[linear-gradient(to_top,rgba(5,6,8,.95)_35%,rgba(5,6,8,0)_70%)]" />

            <div className={`relative flex h-full flex-col transition-all duration-700 ${moving ? "translate-y-2 opacity-0" : ""}`}>
              <SiteNav />

              <main className="mt-auto max-w-[760px] px-[4.5vw] pb-[9vh] max-md:px-5 max-md:pb-10">
                <p className="mb-5 font-mono text-[12px] tracking-[0.14em] text-white/55 max-md:mb-3 max-md:text-[10.5px]">{t("AIRPORT PLANNING · OBSTACLE LIMITATION SURFACES", "공항 계획 · 장애물제한표면")}</p>
                <h1 className="font-serif text-[clamp(44px,7.4vw,112px)] leading-[0.92] tracking-[-0.01em] text-[#f3eee6]">
                  3D DESIGN<br />SIMULATION
                </h1>
                <p className="mt-6 max-w-[540px] text-[clamp(15px,1.35vw,19px)] leading-snug text-white/75 max-md:mt-4">
                  {t("Obstacle limitation surfaces over real terrain and buildings, runway scenarios and instrument procedures.", "실제 지형과 건물 위에 장애물제한표면을 띄우고, 활주로 시나리오와 계기비행절차까지 한 화면에서 확인합니다.")}
                </p>
                <button
                  onClick={() => setPhase("leaving")}
                  disabled={moving}
                  className="pointer-events-auto mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-[#3f6bff] px-5 text-[15px] font-medium text-white transition hover:bg-[#5a80ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-md:mt-6"
                >
                  {t("Explore", "시작하기")} <span aria-hidden>→</span>
                </button>
              </main>
            </div>
          </section>

          <section className="px-[4.5vw] pt-24 pb-10 max-md:px-5 max-md:pt-16">
            <div className="grid grid-cols-4 border-t border-l border-white/[.07] max-md:grid-cols-2">
              {ORGS.map((o) => (
                <div key={o.name} className="flex h-[170px] flex-col items-center justify-center border-r border-b border-white/[.07] px-6 text-center text-white/75 transition hover:bg-white/[.02] hover:text-white max-md:h-[130px] max-md:px-3">
                  <span className={`${o.cls} max-md:scale-[.72]`}>{t(o.name, o.koName ?? o.name)}</span>
                  {t(o.sub, o.koSub ?? o.sub) && <span className="mt-1.5 text-[11.5px] tracking-wide text-white/45 max-md:text-[10px]">{t(o.sub, o.koSub ?? o.sub)}</span>}
                </div>
              ))}
            </div>
          </section>

          <footer className="px-[4.5vw] pt-20 pb-14 text-[15px] max-md:px-5 max-md:pt-12">
            <div className="grid grid-cols-4 gap-8 max-md:grid-cols-2 max-md:gap-y-10">
              {FOOTER.map(([h, hk, items]) => (
                <div key={h}>
                  <div className="mb-5 text-[12px] tracking-[0.08em] text-white/45 uppercase">{t(h, hk)}</div>
                  <ul className="space-y-3 text-white/80">{items.map(([en, ko, href]) => <li key={en}>{href ? <Link href={href} className="transition hover:text-white">{t(en, ko)}</Link> : t(en, ko)}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="mt-16 flex items-center justify-between border-t border-white/[.07] pt-6 text-[12.5px] text-white/40">
              <Logo /><span>© 2026 OLS Simulator</span>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
