"use client";
import { useEffect, useRef } from "react";

// Fades its children up the first time they scroll into view (skipped when the visitor prefers reduced motion)
export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const n = el.current!; if (matchMedia("(prefers-reduced-motion: reduce)").matches) { n.dataset.in = "1"; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { n.dataset.in = "1"; io.disconnect(); } }, { threshold: 0.15 });
    io.observe(n); return () => io.disconnect();
  }, []);
  return <div ref={el} style={{ transitionDelay: `${delay}ms` }} className={`translate-y-6 opacity-0 transition duration-[900ms] ease-out motion-reduce:transition-none data-[in=1]:translate-y-0 data-[in=1]:opacity-100 ${className}`}>{children}</div>;
}

// Small section label with the approach-blue dot (● MISSION, ● PROJECT …)
export const Label = ({ children, dark }: { children: React.ReactNode; dark?: boolean }) => (
  <p className={`flex items-center gap-2.5 font-mono text-[12px] tracking-[0.14em] ${dark ? "text-[#1d1f22]/70" : "text-white/55"}`}><span className="size-2 rounded-full bg-[#4f7dff]" />{children}</p>
);
