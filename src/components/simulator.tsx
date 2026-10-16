"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PROCEDURES } from "@/data/procedures.js";
import { createEngine, AIRPORTS, SURFACES as _S, OFZ_SURFACES as _O, ALL_KEYS as _K } from "@/lib/ols-engine.js";
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
// Region buttons in display order (codes match the registry's `region`); regions without airports yet show a note
const REGIONS = [["NEA", "North-east Asia"], ["SEA", "South-east Asia"], ["EUR", "Europe"], ["MEA", "Middle East"], ["OCE", "Oceania"],
  ["NAM", "North America"], ["SAM", "South America"], ["AFR", "Africa"]];
const regionCountries = (region: string) => [...new Set(Object.values(AIRPORTS as Record<string, any>).filter((a) => a.region === region).map(countryOf))].sort();

function H({ children }: { children: React.ReactNode }) { return <div className="mt-5 mb-2 text-[13px] font-semibold text-white first:mt-0">{children}</div>; }
function Note({ children }: { children: React.ReactNode }) { return <p className="mt-1.5 max-w-[250px] text-[10.5px] leading-snug text-white/40">{children}</p>; }
const fmt = (v: number, d = 1) => v.toFixed(d);

// One level of the Region → Country → Airport picker: a short scrolling list that keeps its selection in view
function Column({ label, items, value, onPick, empty, rows }: { label: string; items: [string, string][]; value: string; onPick: (k: string) => void; empty?: string; rows: string }) {
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {   // also when the list first gets a size (the mobile sheet opens after mount)
    const box = list.current; if (!box) return;
    const centre = () => { const el = box.querySelector<HTMLElement>("[aria-selected=true]"); if (el) box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2); };
    centre(); const ro = new ResizeObserver(centre); ro.observe(box); return () => ro.disconnect();
  }, [value, items.length]);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[12px] font-semibold text-white/85">{label}</div>
      <div ref={list} role="listbox" aria-label={label} className={`${rows} relative overflow-y-auto rounded-md border border-white/10 bg-[#0b0d10]/60 p-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.2)_transparent]`}>
        {items.map(([k, t]) => (
          <button key={k} type="button" role="option" aria-selected={k === value} onClick={() => onPick(k)}
            className={`block w-full truncate rounded px-2.5 py-1.5 text-left text-[12.5px] transition ${k === value ? "bg-white/15 font-semibold text-white" : "text-white/65 hover:bg-white/[.06] hover:text-white"}`}>{t}</button>
        ))}
        {!items.length && <div className="px-2.5 py-1.5 text-[12px] text-white/35">{empty}</div>}
      </div>
    </div>
  );
}

export function Simulator({ onHome }: { onHome: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const eng = useRef<Engine | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [region, setRegion] = useState("NEA");
  const [country, setCountry] = useState("Korea");
  const [sel, setSel] = useState<Set<string>>(new Set());   // runway ends picked for extension (while still at 0 m)
  const [fs, setFs] = useState(false);
  const [menu, setMenu] = useState(false);   // mobile only: controls shown as a bottom sheet
  // Top picker: folded to one line; unfolds on hover / focus / click, folds again once an airport is picked
  // (hold keeps it folded under the pointer until the pointer leaves)
  const [pickOpen, setPickOpen] = useState(false), [pickHold, setPickHold] = useState(false);

  useEffect(() => {
    const c = canvas.current!;
    const e = createEngine(c, { onStatus: setSnap, onHover: setHover });
    eng.current = e;
    (window as any).__ols = e;   // console / report hook: __ols.stats()
    const id = (location.hash || "").replace("#", "").toUpperCase();
    const start = (AIRPORTS as any)[id] ? id : "ICN";
    setRegion((AIRPORTS as any)[start].region); setCountry(countryOf((AIRPORTS as any)[start]));
    // ?proc=all (or ?proc=ILS33L,ILS34R) opens with those flight procedures shown — the Flight Procedure Simulator link
    const proc = new URLSearchParams(location.search).get("proc");
    if (proc) e.set({ proc: proc === "all" ? (PROCEDURES as any)[start]?.map((p: any) => p.id) ?? [] : proc.split(",") });
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
  const picker = (rows: string, picked?: () => void) => <>
    <Column label="Region" rows={rows} items={REGIONS as [string, string][]} value={region} onPick={(v) => { setRegion(v); setCountry(regionCountries(v)[0]); }} />
    <Column label="Country" rows={rows} items={regionCountries(region).map((c) => [c, COUNTRY[c] ?? c])} value={country} onPick={setCountry} empty="No airports yet" />
    <Column label="Airport" rows={rows} items={airports.map(([k, a]) => [k, a.sub.split(" · ")[1] ?? k])} value={snap?.apId ?? ""} onPick={(k) => { eng.current?.switchAirport(k); picked?.(); }} />
  </>;
  const cur = snap?.apId ? (AIRPORTS as any)[snap.apId] : null;
  const fold = () => { setPickOpen(false); setPickHold(false); if (cur) { setRegion(cur.region); setCountry(countryOf(cur)); } };   // back to the airport on show
  const unfolded = pickOpen && !pickHold;

  return (
    <div className="fixed inset-0 bg-[#0b0d10] font-sans text-white/80 select-none">
      <canvas ref={canvas} className="absolute inset-0 block h-full w-full cursor-grab active:cursor-grabbing" />

      {/* top bar */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 flex items-center justify-between px-7 py-4 text-[11.5px] text-white/60 max-md:px-3 max-md:py-2.5">
        <span className="flex items-center gap-3">
          <button type="button" onClick={onHome} className="pointer-events-auto flex items-center gap-1.5 text-[13px] font-medium text-white/80 transition hover:text-white">
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden><path d="M16 10H4M9 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>Home
          </button>
          <Button size="xs" className={`${pill} pointer-events-auto md:hidden`} onClick={() => setMenu((m) => !m)}>{menu ? "Close" : "Controls"}</Button>
        </span>
        <span className="flex items-center gap-4">
          {ap && <span className="text-white/80 max-md:hidden">{ap.sub}</span>}
          <span className="text-[13px] font-semibold tracking-tight text-white">CADIP-II · OLS Simulator</span>
        </span>
      </div>

      {/* airport picker, top centre on wide screens (inside the left panel below 1280 px) */}
      <div className="absolute top-3 left-1/2 w-[600px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#0b0d10]/70 p-2.5 backdrop-blur max-xl:hidden"
        onMouseEnter={() => setPickOpen(true)} onMouseLeave={fold}
        onFocus={() => setPickOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) fold(); }}>
        <button type="button" aria-expanded={unfolded} onClick={() => (unfolded ? fold() : (setPickHold(false), setPickOpen(true)))}
          className="flex h-7 w-full items-center gap-2 px-1.5 text-[12.5px] text-white/60">
          {cur ? <>
            <span>{REGIONS.find(([k]) => k === cur.region)?.[1]}</span><span className="text-white/30">›</span>
            <span>{COUNTRY[countryOf(cur)] ?? countryOf(cur)}</span><span className="text-white/30">›</span>
            <span className="font-semibold text-white">{cur.sub.split(" · ")[1]}</span>
          </> : <span>Choose an airport</span>}
          <svg viewBox="0 0 20 20" className={`ml-auto size-4 transition-transform ${unfolded ? "rotate-180" : ""}`} aria-hidden><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
        <div className={`grid grid-cols-3 gap-3 overflow-hidden transition-all duration-300 ${unfolded ? "mt-2 max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}>
          {picker("h-[132px]", () => setPickHold(true))}
        </div>
      </div>

      {/* left panel */}
      <div className={`absolute top-14 bottom-10 left-7 w-[270px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.15)_transparent] max-md:inset-x-0 max-md:top-auto max-md:bottom-6 max-md:w-auto max-md:max-h-[50vh] max-md:rounded-t-2xl max-md:bg-[#0b0d10]/90 max-md:px-4 max-md:pt-3 max-md:pb-4 max-md:backdrop-blur ${menu ? "" : "max-md:hidden"}`}>
        <H>View</H>
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" className={pill} onClick={() => eng.current?.fit("all")}>Overview</Button>
          <Button size="xs" className={pill} onClick={() => eng.current?.fit("rwy")}>Runway</Button>
          <Button size="xs" className={pill} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>{fs ? "Exit full screen" : "Full screen"}</Button>
          <Toggle size="sm" className={pill} pressed={!!st?.rot} onPressedChange={(v) => set({ rot: v })}>Auto-rotate</Toggle>
        </div>

        <div className="mt-5 grid gap-3 xl:hidden">{picker("h-[104px]")}</div>
        {snap?.loading && <Note>Loading airport data…</Note>}
        {snap?.failed && <Note>Could not load the airport data (network).</Note>}
        {ap && <Note>{ap.sub} · AD {ap.E} m AMSL · Annex 14 code {ap.code} · terrain {ap.dem === "ok" ? "loaded" : ap.dem === "loading" ? "loading…" : ap.dem === "failed" ? "unavailable" : "none"}</Note>}

        {ap && (
          <>
            <H>Runways</H>
            <div className="flex flex-wrap gap-1.5">
              <Toggle size="sm" className={pill} pressed={ap.rwys.every((r: any) => r.on)} onPressedChange={() => ap.rwys.forEach((_: any, i: number) => eng.current?.setRunway(i, true))}>All runways</Toggle>
              {ap.rwys.map((r: any, i: number) => <Toggle key={r.id} size="sm" className={pill} pressed={r.on} onPressedChange={(v) => eng.current?.setRunway(i, v)}>RWY {r.id} <span className="font-mono text-[10px] text-white/45">{r.len} m</span></Toggle>)}
            </div>
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
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-[92px] text-[11px] text-white/45">Parallel</span>
                {ap.rwys.map((r: any, i: number) => <Button key={r.id} size="xs" className={pill} onClick={() => set({ par: [...st.par, { ri: i, off: 760, len: 0 }] })}>+ ∥ {r.id}</Button>)}
              </div>
              {(st.par as { ri: number; off: number; len: number }[]).map((p, k) => { const upd = (q: Partial<typeof p>) => set({ par: st.par.map((r: any, j: number) => (j === k ? { ...r, ...q } : r)) });
                const sp = Math.abs(p.off), side = p.off < 0 ? "R" : "L", len = p.len || ap.rwys[p.ri].len;
                return <div key={k} className="mt-1.5 flex flex-col gap-1 pl-2 text-[11px] text-white/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-[68px] truncate">∥ {ap.rwys[p.ri].id}</span>
                    <ToggleGroup type="single" value={side} onValueChange={(v) => v && upd({ off: (v === "R" ? -1 : 1) * sp })} className="gap-1">
                      <ToggleGroupItem value="L" size="sm" className={pill} title="Left of the runway (looking from A to B)">Left</ToggleGroupItem>
                      <ToggleGroupItem value="R" size="sm" className={pill} title="Right of the runway (looking from A to B)">Right</ToggleGroupItem>
                    </ToggleGroup>
                    <button className="text-white/35 hover:text-white/80" title="Remove" onClick={() => set({ par: st.par.filter((_: any, j: number) => j !== k) })}>×</button>
                  </div>
                  <label className="flex items-center gap-1.5 pl-[72px]">
                    <span className="w-12">spacing</span>
                    <input type="range" min={0} max={2000} step={10} value={sp} onChange={(e) => upd({ off: (side === "R" ? -1 : 1) * +e.target.value })} className="w-20 accent-white" />
                    <input type="number" step={10} min={0} value={sp} onChange={(e) => upd({ off: (side === "R" ? -1 : 1) * Math.abs(+e.target.value) })} className="w-14 rounded border border-white/10 bg-white/10 px-1 py-0.5 font-mono text-white/80" />
                    <span>m</span>
                  </label>
                  <label className="flex items-center gap-1.5 pl-[72px]">
                    <span className="w-12">length</span>
                    <input type="range" min={500} max={5000} step={50} value={len} onChange={(e) => upd({ len: +e.target.value })} className="w-20 accent-white" />
                    <input type="number" step={50} min={500} value={len} onChange={(e) => upd({ len: +e.target.value })} className="w-14 rounded border border-white/10 bg-white/10 px-1 py-0.5 font-mono text-white/80" />
                    <span>m</span>
                  </label>
                </div>; })}
            </div>
            {st.scen !== "ex" && (
              <Toggle size="sm" className={pill} pressed={!!st.showEx} onPressedChange={(v) => set({ showEx: v })}><span className="size-1.5 rounded-full bg-[#cc785c]" />Existing</Toggle>
            )}
            <Note>Click a runway end to extend it; both ends can be extended at once. The new threshold is assumed at the existing end&apos;s elevation. &ldquo;+ ∥&rdquo; adds a parallel runway, centred on its reference, on the chosen side at the given centreline spacing; its length defaults to the reference runway. Threshold elevations are copied from the reference. &ldquo;Existing&rdquo; overlays the existing OLS (orange) for comparison.</Note>
          </>
        )}

        {!!ap?.procs?.length && (
          <>
            <H>Flight procedures</H>
            <div className="flex flex-wrap gap-1.5">
              <Toggle size="sm" className={pill} pressed={ap.procs.every((p: any) => st?.proc?.includes(p.id))} onPressedChange={(v) => set({ proc: v ? ap.procs.map((p: any) => p.id) : [] })}>All</Toggle>
              {ap.procs.map((p: any) => (
                <Toggle key={p.id} size="sm" className={pill} pressed={!!st?.proc?.includes(p.id)} onPressedChange={(v) => set({ proc: v ? [...(st?.proc ?? []), p.id] : (st?.proc ?? []).filter((x: string) => x !== p.id) })}>
                  <span className="size-1.5 rounded-full" style={{ background: hex(p.color) }} />{p.name}
                </Toggle>
              ))}
            </div>
            <Note>AIP RKSI AD 2-62 ~ 2-69, ILS or LOC CAT II &amp; III (AMDT 13/25). Approaches at chart minimum altitudes, straight legs from PAMBI or ENPIL. Orange: missed approach, turn points approximate (≈).</Note>
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
            {[1, 2, 5, 10].map((z) => <ToggleGroupItem key={z} value={String(z)} size="sm" className={pill}>{z}×</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <Note>Buildings: OSM height / levels tags, untagged ones assumed {st?.bldH ?? 6} m. Terrain: {ap?.demSrc ?? "—"}.</Note>
      </div>

      {/* right: altitude read-out */}
      <div className="pointer-events-none absolute top-14 right-7 w-[230px] text-[11.5px] max-md:top-12 max-md:right-3 max-md:w-[170px] max-md:text-[10.5px]">
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

      <span className="pointer-events-none absolute right-7 bottom-9 font-mono text-[11.5px] tracking-wide text-white/60 max-md:hidden">{ap ? `${Math.abs(ap.origin[0]).toFixed(4)}°${ap.origin[0] < 0 ? "S" : "N"}  ${Math.abs(ap.origin[1]).toFixed(4)}°${ap.origin[1] < 0 ? "W" : "E"}` : ""}</span>
      <div className="pointer-events-none absolute right-7 bottom-3 left-7 flex justify-between text-[10.5px] text-white/35 max-md:inset-x-3 max-md:bottom-1 max-md:text-[9px]">
        <span className="max-md:hidden">Drag to orbit · scroll to zoom · right-drag to pan · hover a building for its clearance</span>
        <span className="truncate">Terrain GEDTM30 © OpenGeoHub (CC BY 4.0) · Buildings © OpenStreetMap contributors · Imagery © Esri</span>
      </div>
    </div>
  );
}
