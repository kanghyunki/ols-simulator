"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createEngine, AIRPORTS, REGIONS, SURFACES as _S, OFZ_SURFACES as _O, ALL_KEYS as _K } from "@/lib/ols-engine.js";
type Surf = [string, string, number];
const SURFACES = _S as unknown as Surf[], OFZ_SURFACES = _O as unknown as Surf[], ALL_KEYS = _K as string[];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Engine = ReturnType<typeof createEngine>;
type Snap = any;
type Hover = any;

const pill = "h-6 rounded-full border border-white/10 bg-white/10 px-2.5 text-[11.5px] font-medium text-white/80 hover:bg-white/20 hover:text-white data-[state=on]:border-white/40 data-[state=on]:bg-white/25 data-[state=on]:text-white";
const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");
// Country = last segment of the registry's `sub` ("AYPY · Jacksons Intl · PNG"); long names for the buttons
const countryOf = (a: any): string => a.sub.split(" · ").pop();
const COUNTRY: Record<string, string> = { PNG: "Papua New Guinea" };
const regionCountries = (region: string) => [...new Set(Object.values(AIRPORTS as Record<string, any>).filter((a) => a.region === region).map(countryOf))].sort();

function H({ children }: { children: React.ReactNode }) { return <div className="mt-5 mb-2 text-[13px] font-semibold text-white first:mt-0">{children}</div>; }
function Note({ children }: { children: React.ReactNode }) { return <p className="mt-1.5 max-w-[250px] text-[10.5px] leading-snug text-white/40">{children}</p>; }
const fmt = (v: number, d = 1) => v.toFixed(d);

export function Simulator() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const eng = useRef<Engine | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [region, setRegion] = useState("OCE");
  const [country, setCountry] = useState("PNG");
  const [sel, setSel] = useState<Set<string>>(new Set());   // runway ends picked for extension (while still at 0 m)
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const c = canvas.current!;
    const e = createEngine(c, { onStatus: setSnap, onHover: setHover });
    eng.current = e;
    (window as any).__ols = e;   // console / report hook: __ols.stats()
    const id = (location.hash || "").replace("#", "").toUpperCase();
    const start = (AIRPORTS as any)[id] ? id : "PMIA";
    setRegion((AIRPORTS as any)[start].region); setCountry(countryOf((AIRPORTS as any)[start]));
    e.switchAirport(start);
    const ro = new ResizeObserver(() => e.resize()); ro.observe(c);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => { ro.disconnect(); document.removeEventListener("fullscreenchange", onFs); e.destroy(); };
  }, []);

  const st = snap?.state, ap = snap?.ap;
  useEffect(() => { setSel(new Set()); }, [snap?.apId]);
  const set = (p: Record<string, unknown>) => eng.current?.set(p);
  const surf = new Set<string>(st?.surf ?? ALL_KEYS);
  const surfaces = st?.ofz ? [...SURFACES, ...OFZ_SURFACES] : SURFACES;
  const airports = Object.entries(AIRPORTS as Record<string, any>).filter(([, a]) => a.region === region && countryOf(a) === country);

  return (
    <div className="fixed inset-0 bg-[#0b0d10] font-sans text-white/80 select-none">
      <canvas ref={canvas} className="absolute inset-0 block h-full w-full cursor-grab active:cursor-grabbing" />

      {/* top bar */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 flex items-center justify-between px-7 py-4 text-[11.5px] text-white/60">
        <span className="font-mono tracking-wide">{ap ? `${Math.abs(ap.origin[0]).toFixed(4)}°${ap.origin[0] < 0 ? "S" : "N"}  ${Math.abs(ap.origin[1]).toFixed(4)}°${ap.origin[1] < 0 ? "W" : "E"}` : ""}</span>
        <span className="flex items-center gap-4">
          {ap && <span className="text-white/80">{ap.sub}</span>}
          <span className="text-[13px] font-semibold tracking-tight text-white">CADIP-II · OLS Simulator</span>
        </span>
      </div>

      {/* left panel */}
      <div className="absolute top-14 bottom-10 left-7 w-[270px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.15)_transparent]">
        <H>View</H>
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" className={pill} onClick={() => eng.current?.fit("all")}>Overview</Button>
          <Button size="xs" className={pill} onClick={() => eng.current?.fit("rwy")}>Runway</Button>
          <Button size="xs" className={pill} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>{fs ? "Exit full screen" : "Full screen"}</Button>
          <Toggle size="sm" className={pill} pressed={!!st?.rot} onPressedChange={(v) => set({ rot: v })}>Auto-rotate</Toggle>
        </div>

        <H>Region</H>
        <ToggleGroup type="single" value={region} onValueChange={(v) => { if (!v) return; setRegion(v); setCountry(regionCountries(v)[0]); }} className="flex-wrap gap-1.5">
          {REGIONS.map(([k, label]) => <ToggleGroupItem key={k} value={k} size="sm" className={pill}>{label}</ToggleGroupItem>)}
        </ToggleGroup>

        <H>Country</H>
        <ToggleGroup type="single" value={country} onValueChange={(v) => v && setCountry(v)} className="flex-wrap gap-1.5">
          {regionCountries(region).map((c) => <ToggleGroupItem key={c} value={c} size="sm" className={pill}>{COUNTRY[c] ?? c}</ToggleGroupItem>)}
        </ToggleGroup>

        <H>Airport</H>
        <ToggleGroup type="single" value={snap?.apId ?? ""} onValueChange={(v) => v && eng.current?.switchAirport(v)} className="flex-wrap gap-1.5">
          {airports.map(([k, a]) => <ToggleGroupItem key={k} value={k} size="sm" className={pill} title={a.sub}>{a.sub.split(" · ")[1] ?? k}</ToggleGroupItem>)}
        </ToggleGroup>
        {snap?.loading && <Note>Loading airport data…</Note>}
        {snap?.failed && <Note>Could not load the airport data (network).</Note>}
        {ap && <Note>{ap.sub} · AD {ap.E} m AMSL · Annex 14 code {ap.code} · terrain {ap.dem === "ok" ? "loaded" : ap.dem === "loading" ? "loading…" : ap.dem === "failed" ? "unavailable" : "none"}</Note>}

        {ap && st && (
          <>
            <H>Scenario</H>
            {ap.rwys.map((r: any, i: number) => {
              const total = r.len + (st.extA[i] || 0) + (st.extB[i] || 0);
              return (
                <div key={r.id} className="mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="w-[92px] text-[11px] text-white/45">RWY {r.id}</span>
                    {(["A", "B"] as const).map((end) => { const key = `${i}${end}`, len = (end === "A" ? st.extA : st.extB)[i] || 0, on = len > 0 || sel.has(key);
                      return <Toggle key={end} size="sm" className={pill} pressed={on} onPressedChange={(v) => { const n = new Set(sel); if (v) n.add(key); else { n.delete(key); eng.current?.setExt(i, end, 0); } setSel(n); }}>
                        {end === "A" ? r.nameA : r.nameB}{len > 0 && <span className="font-mono text-[10px] text-white/55">+{len}</span>}
                      </Toggle>; })}
                    {total !== r.len && <span className="font-mono text-[10.5px] text-white/55">{r.len} → {total} m</span>}
                  </div>
                  {(["A", "B"] as const).filter((end) => sel.has(`${i}${end}`) || ((end === "A" ? st.extA : st.extB)[i] || 0) > 0).map((end) => { const len = (end === "A" ? st.extA : st.extB)[i] || 0;
                    return <label key={end} className="mt-1.5 flex items-center gap-2 pl-[92px] text-[11px] text-white/60">
                      <span className="w-7">{end === "A" ? r.nameA : r.nameB}</span>
                      <input type="range" min={0} max={2000} step={50} value={len} onChange={(e) => eng.current?.setExt(i, end, +e.target.value)} className="w-28 accent-white" />
                      <span className="font-mono whitespace-nowrap text-white/80">+{len} m</span>
                    </label>; })}
                </div>
              ); })}
            {st.scen !== "ex" && (
              <Toggle size="sm" className={pill} pressed={!!st.showEx} onPressedChange={(v) => set({ showEx: v })}><span className="size-1.5 rounded-full bg-[#cc785c]" />Existing</Toggle>
            )}
            <Note>Click a runway end to extend it; both ends can be extended at once. The new threshold is assumed at the existing end&apos;s elevation. &ldquo;Existing&rdquo; overlays the existing OLS (orange) for comparison.</Note>
          </>
        )}

        <H>Obstacle surfaces</H>
        <div className="flex flex-wrap gap-1.5">
          <Toggle size="sm" className={pill} pressed={surf.size === surfaces.length} onPressedChange={() => set({ surf: ALL_KEYS })}>All</Toggle>
          {surfaces.map(([k, label, c]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <Toggle size="sm" className={pill} pressed={surf.has(k)} onPressedChange={(v) => { const s = new Set(surf); if (v) s.add(k); else s.delete(k); set({ surf: [...s] }); }}>
                <span className="size-1.5 rounded-full" style={{ background: hex(c) }} />{label}
              </Toggle>
              <button className="text-[10px] text-white/35 hover:text-white/80" onClick={() => set({ surf: [k] })}>only</button>
            </span>
          ))}
        </div>
        <Note>ICAO Annex 14 Vol. I Tab. 4-1 / 4-2, code {ap?.code ?? 4}. Combined OLS = the lowest surface of the included runways.</Note>

        {ap && (
          <>
            <H>Runways</H>
            <div className="flex flex-wrap gap-1.5">
              <Toggle size="sm" className={pill} pressed={ap.rwys.every((r: any) => r.on)} onPressedChange={() => ap.rwys.forEach((_: any, i: number) => eng.current?.setRunway(i, true))}>All runways</Toggle>
              {ap.rwys.map((r: any, i: number) => <Toggle key={r.id} size="sm" className={pill} pressed={r.on} onPressedChange={(v) => eng.current?.setRunway(i, v)}>RWY {r.id} <span className="font-mono text-[10px] text-white/45">{r.len} m</span></Toggle>)}
            </div>
          </>
        )}

        <H>Check</H>
        <div className="flex flex-wrap gap-1.5">
          <Toggle size="sm" className={pill} pressed={!!st?.obs} onPressedChange={(v) => set({ obs: v })}><span className="size-1.5 rounded-full bg-[#e0443e]" />Buildings through them</Toggle>
          <Toggle size="sm" className={pill} pressed={!!st?.pen} onPressedChange={(v) => set({ pen: v })}><span className="size-1.5 rounded-full bg-[#c64545]" />Terrain through them</Toggle>
          <Toggle size="sm" className={pill} pressed={!!st?.ofz} onPressedChange={(v) => set({ ofz: v })}>OFZ (inner surfaces)</Toggle>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-white/45">Ground</span>
          <ToggleGroup type="single" value={st?.base ?? "sat"} onValueChange={(v) => v && set({ base: v })} className="gap-1.5">
            <ToggleGroupItem value="sat" size="sm" className={pill}>Satellite</ToggleGroupItem>
            <ToggleGroupItem value="osm" size="sm" className={pill}>OSM</ToggleGroupItem>
            <ToggleGroupItem value="none" size="sm" className={pill}>None</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-white/45">Vertical</span>
          <ToggleGroup type="single" value={String(st?.zex ?? 1)} onValueChange={(v) => v && set({ zex: +v })} className="gap-1.5">
            {[1, 2, 3].map((z) => <ToggleGroupItem key={z} value={String(z)} size="sm" className={pill}>{z}×</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <Note>Buildings: OSM height / levels tags, untagged ones assumed {st?.bldH ?? 6} m. Terrain: {ap?.demSrc ?? "—"}.</Note>
      </div>

      {/* right: altitude read-out */}
      <div className="pointer-events-none absolute top-14 right-7 w-[230px] text-[11.5px]">
        <div className="text-[13px] font-semibold text-white">Altitude</div>
        {hover?.kind === "obstacle" ? (
          <div className="mt-2 space-y-0.5">
            <div className="text-white">{hover.name ?? hover.tag}</div>
            {hover.name && <div className="text-white/50">{hover.tag}</div>}
            <div>Height {fmt(hover.h, 0)} m · ground {fmt(hover.g)} m</div>
            <div>Top <b className="font-mono text-white">{fmt(hover.top)} m AMSL</b></div>
            {hover.limit ? <>
              <div>{hover.limit.name} limit {fmt(hover.limit.h)} m</div>
              <div style={{ color: hover.pen > 0 ? "#f0625c" : "#6fcf8a" }}>{hover.pen > 0 ? `Through the surface by ${fmt(hover.pen)} m` : `Clear by ${fmt(-hover.pen)} m`}</div>
            </> : <div className="text-white/50">Outside the OLS</div>}
          </div>
        ) : hover?.kind === "point" ? (
          <div className="mt-2 space-y-0.5">
            {(() => { const r = st?.scen === "ext" ? hover.ext : hover.ex; return r
              ? <><div>Limit here <b className="font-mono text-white">{fmt(r.h)} m AMSL</b></div><div className="text-white/70">{r.name}</div></>
              : <div className="text-white/50">Outside the OLS</div>; })()}
            {hover.ground !== null && <div>Ground {fmt(hover.ground)} m{(() => { const r = st?.scen === "ext" ? hover.ext : hover.ex; if (!r) return null; const m = r.h - hover.ground; return <span style={{ color: m < 0 ? "#f0625c" : "#6fcf8a" }}> · {m >= 0 ? "clear" : "through"} {fmt(Math.abs(m))} m</span>; })()}</div>}
            {st?.scen === "cmp" && hover.ex && hover.ext && <div>Extended: {fmt(hover.ext.h)} m ({hover.ext.h - hover.ex.h >= 0 ? "+" : ""}{fmt(hover.ext.h - hover.ex.h)} m)</div>}
            <div className="font-mono text-[10.5px] text-white/40">s {fmt(hover.s, 0)} m · d {fmt(hover.d, 0)} m from THR {hover.refA}</div>
          </div>
        ) : <div className="mt-2 text-white/45">Move over a surface or a building.</div>}
        <div className="mt-5 space-y-1">
          {surfaces.filter(([k]) => surf.has(k)).map(([k, label, c]) => <div key={k} className="flex items-center gap-2"><span className="h-[2px] w-5" style={{ background: hex(c) }} /><span style={{ color: hex(c) }}>{label}</span></div>)}
          {st?.scen === "cmp" && <div className="flex items-center gap-2"><span className="h-[2px] w-5 bg-[#cc785c]" /><span className="text-[#cc785c]">Extended OLS</span></div>}
        </div>
      </div>

      <div className="pointer-events-none absolute right-7 bottom-3 left-7 flex justify-between text-[10.5px] text-white/35">
        <span>Drag to orbit · scroll to zoom · right-drag to pan · hover a building for its clearance</span>
        <span>Terrain GEDTM30 © OpenGeoHub (CC BY 4.0) · Buildings © OpenStreetMap contributors · Imagery © Esri</span>
      </div>
    </div>
  );
}
