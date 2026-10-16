"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";
import { Reveal, Label } from "@/components/reveal";

// About: dark hero → light mission (fading back to dark into the image card) → what it does. Projects live on /project.
// Images are renders from the simulator itself (public/about).

const DOES = [
  ["See", "Every ICAO Annex 14 surface in 3D, over real terrain and buildings."],
  ["Compare", "Extend a runway, add a parallel one or overlay an instrument procedure, and watch the surfaces move."],
  ["Share", "One link, no installation. The same picture for everyone at the table."],
];

export default function About() {
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#050608] text-white">
      {/* ① hero */}
      <section className="relative h-[100svh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/about/goroka.jpg" alt="" className="absolute inset-0 size-full scale-105 object-cover opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,6,8,.95)_10%,rgba(5,6,8,.35)_55%,rgba(5,6,8,.6)_100%),radial-gradient(90%_70%_at_0%_100%,rgba(5,6,8,.9),rgba(5,6,8,0)_70%)]" />
        <SiteNav />
        <div className="absolute inset-x-0 bottom-0 px-[4.5vw] pb-[11vh] max-md:px-5 max-md:pb-14">
          <Reveal><p className="mb-5 font-mono text-[12px] tracking-[0.14em] text-white/55">ABOUT</p></Reveal>
          <Reveal delay={100}><h1 className="max-w-[900px] font-serif text-[clamp(46px,7vw,108px)] leading-[0.95] text-[#f3eee6]">The Line in the Aerospace</h1></Reveal>
          <Reveal delay={250}><p className="mt-7 max-w-[560px] text-[clamp(16px,1.35vw,19px)] leading-relaxed text-white/75">
            OLS Simulator is built by <span className="text-white">Hyunki Kang</span> — an airport planner rethinking how the industry sees the airspace around an airport.
          </p></Reveal>
        </div>
      </section>

      {/* ② mission, light, fading back to dark into ③ the image card */}
      <section className="bg-[linear-gradient(to_bottom,#dcdcd8_0%,#c9c9c5_30%,#6e7072_62%,#050608_100%)] px-[4.5vw] pt-28 pb-24 max-md:px-5 max-md:pt-16">
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-[6vw] max-lg:grid-cols-1 max-lg:gap-y-6">
          <Reveal><Label dark>MISSION</Label></Reveal>
          <Reveal delay={100}><p className="text-[clamp(24px,2.6vw,40px)] leading-[1.18] font-semibold tracking-[-0.015em] text-[#121416]">
            Airports are planned on paper, but flown in three dimensions. For decades the surfaces that keep every approach and departure safe have lived in drawings only specialists could read. OLS Simulator makes that invisible airspace visible — so engineers, authorities and owners can see it, question it and decide on it together, in a browser, in minutes.
          </p></Reveal>
        </div>
        <Reveal className="mt-24 max-md:mt-14">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about/icn.jpg" alt="Incheon International Airport in OLS Simulator: approach, transitional, inner horizontal and conical surfaces over terrain" className="aspect-[16/9] w-full rounded-xl object-cover shadow-2xl max-md:aspect-[4/3]" />
            <figcaption className="mt-4 text-[13px] text-white/50">Incheon International Airport — four runways, nine obstacle limitation surfaces, real terrain.</figcaption>
          </figure>
        </Reveal>
      </section>

      {/* ④ what it does */}
      <section className="px-[4.5vw] pt-24 pb-28 max-md:px-5 max-md:pt-14 max-md:pb-16">
        <Reveal><Label>WHAT IT DOES</Label></Reveal>
        <div className="mt-12 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[.08] bg-white/[.08] max-md:mt-8 max-md:grid-cols-1">
          {DOES.map(([h, t], i) => (
            <Reveal key={h} delay={i * 120} className="bg-[#050608]">
              <div className="h-full p-9 max-md:p-7">
                <h3 className="font-serif text-[40px] leading-none text-[#f3eee6]">{h}</h3>
                <p className="mt-5 max-w-[340px] text-[16px] leading-relaxed text-white/65">{t}</p>
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
