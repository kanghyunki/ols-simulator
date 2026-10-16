"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";

// Product: two products, one screen each. Each shows its screenshot in a device drawn in CSS (laptop or phone);
// PREVIEW swaps to the other device with that device's screenshot. Shots: public/product, taken from the simulator.
type Device = "laptop" | "phone";

function Laptop({ src, alt, flip }: { src: string; alt: string; flip?: boolean }) {
  return (
    <div className={`mx-auto w-full max-w-[860px] ${flip ? "[transform:perspective(2200px)_rotateX(8deg)_rotateY(14deg)]" : "[transform:perspective(2200px)_rotateX(8deg)_rotateY(-14deg)]"} max-md:[transform:none]`}>
      <div className="rounded-t-[18px] border border-white/10 bg-[#141518] p-[1.6%] pb-[2.2%] shadow-[0_40px_120px_-20px_rgba(0,0,0,.9),0_0_80px_-30px_rgba(79,125,255,.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="aspect-[16/10] w-full rounded-[6px] object-cover" />
      </div>
      <div className="relative mx-[-4%] h-[14px] rounded-b-[14px] bg-[linear-gradient(to_bottom,#2a2c31,#141518)]">
        <div className="absolute top-0 left-1/2 h-[6px] w-[16%] -translate-x-1/2 rounded-b-[8px] bg-[#0c0d0f]" />
      </div>
    </div>
  );
}

function Phone({ src, alt, flip }: { src: string; alt: string; flip?: boolean }) {
  return (
    <div className={`mx-auto w-[min(300px,72vw,calc((100svh-240px)*0.44))] ${flip ? "[transform:perspective(1600px)_rotateY(10deg)_rotateX(4deg)]" : "[transform:perspective(1600px)_rotateY(-10deg)_rotateX(4deg)]"} max-md:[transform:none]`}>
      <div className="relative rounded-[48px] border border-white/10 bg-[#141518] p-[10px] pt-[34px] pb-[22px] shadow-[0_40px_120px_-20px_rgba(0,0,0,.9),0_0_80px_-30px_rgba(79,125,255,.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="aspect-[390/844] w-full rounded-[14px] object-cover" />
        <div className="absolute top-[11px] left-1/2 h-[13px] w-[28%] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}

function Product({ n, name, title, body, shots, href, start, flip, mark }: {
  n: string; name: string; title: string; body: string; shots: { laptop: string; phone: string }; href: string; start: Device; flip?: boolean; mark: string;
}) {
  const [dev, setDev] = useState<Device>(start);
  const other = dev === "laptop" ? "phone" : "laptop";
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden px-[4.5vw] py-14 max-md:px-5 max-md:py-10">
      {/* runway designator, faint, as a background mark */}
      <span aria-hidden className={`pointer-events-none absolute top-1/2 -translate-y-1/2 font-serif text-[clamp(160px,26vw,420px)] leading-none text-white/[.035] ${flip ? "right-[2vw]" : "left-[2vw]"}`}>{mark}</span>

      <div className="relative flex items-center justify-between font-mono text-[12px] tracking-[0.14em] text-white/55">
        <span>{n}</span>
        <button type="button" role="switch" aria-checked={dev !== start} onClick={() => setDev(other)} className="flex items-center gap-2.5 transition hover:text-white">
          PREVIEW
          <span className={`relative h-[18px] w-[32px] rounded-full border transition ${dev !== start ? "border-[#4f7dff] bg-[#4f7dff]/30" : "border-white/30"}`}>
            <span className={`absolute top-[2px] size-[12px] rounded-full bg-white transition-all ${dev !== start ? "left-[16px]" : "left-[2px]"}`} />
          </span>
          <span className="w-[52px] text-left text-white/40">{dev === "laptop" ? "DESKTOP" : "MOBILE"}</span>
        </button>
      </div>

      <div className={`relative my-auto grid items-center gap-x-[5vw] gap-y-12 pt-10 ${flip ? "grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : "grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"} max-lg:grid-cols-1`}>
        <div className={flip ? "lg:order-2" : ""}>
          <h2 className="font-serif text-[clamp(44px,5.2vw,84px)] leading-[0.95] text-[#f3eee6]">{name}</h2>
          <p className="mt-8 text-[clamp(20px,1.8vw,26px)] leading-snug text-white">{title}</p>
          <p className="mt-4 max-w-[460px] text-[16px] leading-relaxed text-white/65">{body}</p>
          <Link href={href} className="mt-9 inline-flex h-11 items-center gap-2 rounded-md bg-[#3f6bff] px-5 text-[15px] font-medium text-white transition hover:bg-[#5a80ff]">Explore <span aria-hidden>→</span></Link>
        </div>
        <div key={dev} className={`animate-[ols-fade-in_600ms_ease-out] ${flip ? "lg:order-1" : ""}`}>
          {dev === "laptop" ? <Laptop src={shots.laptop} alt={`${name} on a desktop screen`} flip={flip} /> : <Phone src={shots.phone} alt={`${name} on a phone`} flip={flip} />}
        </div>
      </div>
    </section>
  );
}

export default function ProductPage() {
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#050608] text-white">
      <header className="flex items-center px-[4.5vw] py-6 max-md:px-5 max-md:py-4">
        <Link href="/" className="transition hover:text-white/80"><Logo /></Link>
      </header>

      <Product n="01" name="OLS Simulator" title="Every Annex 14 surface, in 3D."
        body="Approach, take-off, transitional, inner horizontal, conical and OFZ over real terrain and buildings for airport. Extend a runway or add a parallel one and watch the surfaces move."
        shots={{ laptop: "/product/ols-desktop.jpg", phone: "/product/ols-mobile.jpg" }} href="/#AYGA" start="laptop" mark="17R" />

      <Product n="02" name="Flight Procedure Simulator" title="Approaches you can walk around."
        body="Instrument approaches and missed approaches from the AIP, drawn at their charted altitudes over the terrain and the OLS."
        shots={{ laptop: "/product/fps-desktop.jpg", phone: "/product/fps-mobile.jpg" }} href="/?proc=all#ICN" start="phone" flip mark="33L" />

      <footer className="mx-[4.5vw] flex items-center justify-between border-t border-white/[.07] py-6 text-[12.5px] text-white/40 max-md:mx-5">
        <Link href="/" className="transition hover:text-white/70"><Logo /></Link><span>© 2026 OLS Simulator</span>
      </footer>
    </div>
  );
}
