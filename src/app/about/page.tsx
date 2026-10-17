"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";
import { Reveal, Label } from "@/components/reveal";
import { useT } from "@/lib/lang";

// About: dark hero → light mission (fading back to dark into the image card) → what it does. Projects live on /project.
// Images are renders from the simulator itself (public/about).

const DOES = [
  ["See", "Every ICAO Annex 14 surface in 3D, over real terrain and buildings.", "보기", "ICAO Annex 14의 모든 표면을 실제 지형과 건물 위에 3D로 보여 줍니다."],
  ["Compare", "Extend a runway, add a parallel one or overlay an instrument procedure, and watch the surfaces move.", "비교", "활주로를 연장하거나 평행활주로를 더하고, 계기비행절차를 겹쳐 보며 표면이 어떻게 바뀌는지 확인합니다."],
  ["Share", "One link, no installation. The same picture for everyone at the table.", "공유", "설치 없이 링크 하나로. 회의에 모인 모두가 같은 그림을 봅니다."],
];

// Korean mission, broken into lines as written (the breaks drop on phones, where the column is too narrow for them)
const MISSION_KO = [
  ["공항은 도면 위에서 계획되지만,", "비행은 3차원에서 이루어집니다.", "오랫동안 모든 접근과 출발의", "안전을 지키는 표면들은", "전문가만 읽을 수 있는", "도면 속에 있었습니다."],
  ["OLS Simulator는 보이지 않던", "공역을 눈앞에 보여 줍니다.", "엔지니어와 항공당국, 사업주가 브라우저에서", "몇 분 만에 같은 화면을 보며", "확인하고, 질문하고, 함께 결정할 수 있도록."],
];

export default function About() {
  const t = useT();
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#050608] text-white">
      {/* ① hero */}
      <section className="relative h-[100svh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/about/goroka.jpg" alt="" className="absolute inset-0 size-full scale-105 object-cover opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,6,8,.95)_10%,rgba(5,6,8,.35)_55%,rgba(5,6,8,.6)_100%),radial-gradient(90%_70%_at_0%_100%,rgba(5,6,8,.9),rgba(5,6,8,0)_70%)]" />
        <SiteNav />
        <div className="absolute inset-x-0 bottom-0 px-[4.5vw] pb-[11vh] max-md:px-5 max-md:pb-14">
          <Reveal><p className="mb-5 font-mono text-[12px] tracking-[0.14em] text-white/55">{t("ABOUT", "소개")}</p></Reveal>
          <Reveal delay={100}><h1 className="max-w-[900px] font-serif text-[clamp(46px,7vw,108px)] leading-[0.95] text-[#f3eee6]">The Line in the Aerospace</h1></Reveal>
          <Reveal delay={250}><p className="mt-7 max-w-[560px] text-[clamp(16px,1.35vw,19px)] leading-relaxed text-white/75">
            {t(<>OLS Simulator is built by <span className="text-white">Hyunki Kang</span> — an airport planner rethinking how the industry sees the airspace around an airport.</>,
              <>OLS Simulator는 공항 엔지니어 <span className="text-white">강 현기</span>가 만들었습니다.<br />공항 업계의 관행적인 2D에서 3D로 새로운 차원으로 그려 나갑니다.</>)}
          </p></Reveal>
        </div>
      </section>

      {/* ② mission, light, fading back to dark into ③ the image card */}
      <section className="bg-[linear-gradient(to_bottom,#dcdcd8_0%,#c9c9c5_30%,#6e7072_62%,#050608_100%)] px-[4.5vw] pt-28 pb-24 max-md:px-5 max-md:pt-16">
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-[6vw] max-lg:grid-cols-1 max-lg:gap-y-6">
          <Reveal><Label dark>{t("MISSION", "미션")}</Label></Reveal>
          <Reveal delay={100}><div className="space-y-[1.1em] text-right text-[clamp(24px,2.6vw,40px)] leading-[1.18] font-semibold tracking-[-0.015em] text-[#121416]">
            {t(<p>Airports are planned on paper, but flown in three dimensions. For decades the surfaces that keep every approach and departure safe have lived in drawings only specialists could read. OLS Simulator makes that invisible airspace visible — so engineers, authorities and owners can see it, question it and decide on it together, in a browser, in minutes.</p>,
              <>{MISSION_KO.map((para, i) => <p key={i}>{para.map((l, j) => <span key={j}>{j > 0 && <br className="max-md:hidden" />}{j > 0 && " "}{l}</span>)}</p>)}</>)}
          </div></Reveal>
        </div>
        <Reveal className="mt-24 max-md:mt-14">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about/icn.jpg" alt="Incheon International Airport in OLS Simulator: approach, transitional, inner horizontal and conical surfaces over terrain" className="aspect-[16/9] w-full rounded-xl object-cover shadow-2xl max-md:aspect-[4/3]" />
            <figcaption className="mt-4 text-[13px] text-white/50">{t("Incheon International Airport — four runways, nine obstacle limitation surfaces, real terrain.", "인천국제공항 — 활주로 4본, 장애물제한표면 9종, 실제 지형.")}</figcaption>
          </figure>
        </Reveal>
      </section>

      {/* ④ what it does */}
      <section className="px-[4.5vw] pt-24 pb-28 max-md:px-5 max-md:pt-14 max-md:pb-16">
        <Reveal><Label>{t("WHAT IT DOES", "주요 기능")}</Label></Reveal>
        <div className="mt-12 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[.08] bg-white/[.08] max-md:mt-8 max-md:grid-cols-1">
          {DOES.map(([h, d, hk, dk], i) => (
            <Reveal key={h} delay={i * 120} className="bg-[#050608]">
              <div className="h-full p-9 max-md:p-7">
                <h3 className="font-serif text-[40px] leading-none text-[#f3eee6]">{t(h, hk)}</h3>
                <p className="mt-5 max-w-[340px] text-[16px] leading-relaxed text-white/65">{t(d, dk)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="mx-[4.5vw] flex items-center justify-between border-t border-white/[.07] py-6 text-[12.5px] text-white/40 max-md:mx-5">
        <Link href="/" className="transition hover:text-white/70"><Logo /></Link><span>© 2026 OLS Simulator</span>
      </footer>
    </div>
  );
}
