"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { LangButton } from "@/components/lang-button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PROCEDURES, PROC_NOTES } from "@/data/procedures.js";
import { useT } from "@/lib/lang";
import { createEngine, AIRPORTS, SURFACES as _S, OFZ_SURFACES as _O, ALL_KEYS as _K } from "@/lib/ols-engine.js";
type Surf = [string, string, number];
const SURFACES = _S as unknown as Surf[], OFZ_SURFACES = _O as unknown as Surf[], ALL_KEYS = _K as string[];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Engine = ReturnType<typeof createEngine>;
type Snap = any;
type Hover = any;

const pill = "h-6 rounded-full border border-white/10 bg-white/10 px-2.5 text-[11.5px] font-medium text-white/80 hover:bg-white/20 hover:text-white data-[state=on]:border-white/40 data-[state=on]:bg-white/25 data-[state=on]:text-white";
// Panel lists: an "All" toggle on its own line, then the items two per row in equal columns
const grid2 = "mt-1.5 grid grid-cols-2 gap-1.5";
const cell = `${pill} w-full min-w-0 justify-start`;
const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");
// Country = last segment of the registry's `sub` ("AYPY · Jacksons Intl · PNG"); long names for the buttons
const countryOf = (a: any): string => a.sub.split(" · ").pop();
const COUNTRY: Record<string, string> = { PNG: "Papua New Guinea" };
const COUNTRY_KO: Record<string, string> = { Korea: "대한민국", PNG: "파푸아뉴기니", Mozambique: "모잠비크", "Saudi Arabia": "사우디아라비아", Singapore: "싱가포르" };
// Region buttons in display order (codes match the registry's `region`); regions without airports yet show a note
const REGIONS = [["NEA", "North-east Asia", "동북아시아"], ["SEA", "South-east Asia", "동남아시아"], ["EUR", "Europe", "유럽"], ["MEA", "Middle East", "중동"], ["OCE", "Oceania", "오세아니아"],
  ["NAM", "North America", "북미"], ["SAM", "South America", "남미"], ["AFR", "Africa", "아프리카"]];
// Korean names for the engine's surface names ("Approach RWY 15R" → "진입표면 RWY 15R") and building types
const SURF_KO: Record<string, string> = { "Runway strip": "착륙대", Approach: "진입표면", "Take-off climb": "이륙상승표면", Transitional: "전이표면", "Inner horizontal": "수평표면",
  Conical: "원추표면", "Inner approach": "내부진입표면", "Inner transitional": "내부전이표면", "Balked landing": "착륙복행표면" };
const TAG_KO: Record<string, string> = { Building: "건물", "Communications tower": "통신탑", Mast: "철탑", Tower: "탑", Chimney: "굴뚝", "Water tower": "급수탑",
  Lighthouse: "등대", Windmill: "풍차", "Power pylon": "송전탑", "Wind turbine": "풍력발전기" };
const surfKo = (n: string) => n.replace(new RegExp(`^(${Object.keys(SURF_KO).join("|")})`), (m) => SURF_KO[m]);
const tagKo = (n: string) => n.replace(/^(.*?)( \(assumed height\))?$/, (_, a, b) => (TAG_KO[a] ?? a) + (b ? " (높이 가정)" : ""));
const regionCountries = (region: string) => [...new Set(Object.values(AIRPORTS as Record<string, any>).filter((a) => a.region === region).map(countryOf))].sort();

// Left icon rail: each icon opens its panel beside the rail (the same icon again closes it); a bottom tab bar on phones
type Tab = "ols" | "plan" | "proc" | "check" | "noise" | "info" | "report";
const ic = (d: string) => <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
const TABS: [Tab, string, string, React.ReactNode][] = [
  ["ols", "Obstacle surfaces", "장애물제한표면", ic("M10 3l7 3.5-7 3.5-7-3.5zM3 10l7 3.5 7-3.5M3 13.5L10 17l7-3.5")],
  ["plan", "Planning", "계획하기", ic("M3 14l9-9 3 3-9 9H3zM10.5 6.5l3 3M15 3v4M13 5h4")],
  ["proc", "Flight procedures", "비행절차", ic("M10 2.5c.8 0 1.2.9 1.2 2v3.7l5.3 3v1.6l-5.3-1.6v3.3l1.8 1.4v1.3L10 16.5l-3 .7v-1.3l1.8-1.4v-3.3L3.5 12.8v-1.6l5.3-3V4.5c0-1.1.4-2 1.2-2z")],
  ["check", "Review", "검토", ic("M10 2.5l6 2.5v4.5c0 3.6-2.5 6.4-6 8-3.5-1.6-6-4.4-6-8V5zM10 7v3.5M10 13v.01")],
  ["noise", "Noise exposure", "소음영향", ic("M2 10.5l1.8-1.6 1.6 2.2 1.8-3.8 1.7 5.5 1.6-8.3 1.8 9.8 1.7-6.4 1.6 3.4 1.6-2.3 2.2 1.6")],
  ["info", "Data and assumptions", "자료·가정", ic("M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM10 9v5M10 6.5v.01")],
  ["report", "Report", "보고서", ic("M5.5 2.5h6l4 4v11h-10zM11.5 2.5v4h4M8 11l2 2 2-2M10 8.5V13")],
];

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
  const [tab, setTab] = useState<Tab | null>(null);   // open panel; none on phones at first, so the 3D view shows
  useEffect(() => { if (matchMedia("(min-width: 768px)").matches) setTab("ols"); }, []);
  const [stats, setStats] = useState<any>(null);       // Review / Report: penetrations of the current scenario
  const [layerOpen, setLayerOpen] = useState(false);
  // Noise and OLS take turns: opening Noise exposure hides the surfaces and the terrain penetration (remembered), opening
  // Obstacle surfaces turns the noise contours off and brings them back
  const olsPrev = useRef<{ surf: string[]; pen: boolean } | null>(null);
  useEffect(() => { const e = eng.current, s = e?.snapshot().state; if (!e || !s) return;
    if (tab === "noise") { if (s.surf.length) olsPrev.current = { surf: s.surf as string[], pen: !!s.pen }; e.set({ noise: true, surf: [], pen: false }); }
    else if (tab === "ols" && s.noise) { const p = olsPrev.current; e.set({ noise: false, surf: p?.surf.length ? p.surf : ALL_KEYS, pen: p?.pen ?? true }); }
  }, [tab]);
  // Top picker: folded to one line; unfolds on hover / focus / click, folds again once an airport is picked
  // (hold keeps it folded under the pointer until the pointer leaves)
  const [pickOpen, setPickOpen] = useState(false), [pickHold, setPickHold] = useState(false);
  const t = useT(), ko = t(false, true);
  const sn = (n: string) => (ko ? surfKo(n) : n);
  const regionName = (k: string) => { const r = REGIONS.find(([c]) => c === k); return r ? t(r[1], r[2]) : k; };
  const countryName = (c: string) => t(COUNTRY[c] ?? c, COUNTRY_KO[c] ?? c);
  // Korean airports carry a Korean name in the registry; other airports stay in English
  const airportName = (a: any) => (ko && countryOf(a) === "Korea" ? a.name : a.sub.split(" · ")[1]);

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
  // recomputed (debounced) only while Review or Report is open, whenever the scenario or the obstacle data change
  const statKey = st && ap ? [snap.apId, st.extA.join(), st.extB.join(), JSON.stringify(st.par), st.ofz, st.obs, ap.dem, st.bldH].join("|") : "";
  useEffect(() => { if ((tab !== "check" && tab !== "report") || !statKey) return;
    const id = setTimeout(() => setStats(eng.current?.stats() ?? null), 250); return () => clearTimeout(id); }, [tab, statKey]);
  const scenName = st?.scen === "ex" ? t("existing airport", "현재 공항") : t("planned (extensions / parallel runways)", "계획안 (연장·평행활주로 반영)");
  const downloadCsv = () => { const r = eng.current?.stats(); if (!r) return;
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows: unknown[][] = [["OLS Simulator", r.apId, scenName], [], ["building", "type", "height m", "top m AMSL", "limit m AMSL", "surface", "penetration m"],
      ...r.obsBad.map((o: any) => [o.name, o.tag, o.h, o.top, o.limit, o.surface, o.pen]), [],
      ["terrain: surface", "area km2", "max penetration m"], ...Object.values(r.bySurface).map((b: any) => [b.name, b.area, b.max])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map((x) => x.map(q).join(",")).join("\r\n")], { type: "text/csv" }));
    a.download = `OLS_${r.apId}_${st?.scen === "ex" ? "existing" : "planned"}.csv`; a.click(); URL.revokeObjectURL(a.href); };
  const set = (p: Record<string, unknown>) => eng.current?.set(p);
  const surf = new Set<string>(st?.surf ?? ALL_KEYS);
  const surfaces = st?.ofz ? [...SURFACES, ...OFZ_SURFACES] : SURFACES;
  const airports = Object.entries(AIRPORTS as Record<string, any>).filter(([, a]) => a.region === region && countryOf(a) === country);
  const picker = (rows: string, picked?: () => void) => <>
    <Column label={t("Region", "지역")} rows={rows} items={REGIONS.map(([k]) => [k, regionName(k)])} value={region} onPick={(v) => { setRegion(v); setCountry(regionCountries(v)[0]); }} />
    <Column label={t("Country", "국가")} rows={rows} items={regionCountries(region).map((c) => [c, countryName(c)])} value={country} onPick={setCountry} empty={t("No airports yet", "아직 공항이 없습니다")} />
    <Column label={t("Airport", "공항")} rows={rows} items={airports.map(([k, a]) => [k, airportName(a) ?? k])} value={snap?.apId ?? ""} onPick={(k) => { eng.current?.switchAirport(k); picked?.(); }} />
  </>;
  // Layer thumbnails: the zoom-13 tile under the airport from each provider
  const LAYERS: [string, string, string][] = [["sat", "Satellite", "위성"], ["osm", "Map", "지도"], ["none", "None", "없음"]];
  const thumb = (k: string) => { if (!ap || k === "none") return null; const z = 13, n = 2 ** z, [la, lo] = ap.origin, r = la * Math.PI / 180;
    const x = Math.floor((lo + 180) / 360 * n), y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n);
    return k === "sat" ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}` : `https://tile.openstreetmap.org/${z}/${x}/${y}.png`; };
  const swatch = (k: string, cls: string) => { const u = thumb(k);
    // eslint-disable-next-line @next/next/no-img-element
    return u ? <img src={u} alt="" className={`${cls} object-cover`} /> : <span className={`${cls} bg-[linear-gradient(135deg,#1b1e24,#2a2d33)]`} />; };
  // Runway on/off, shared by the Obstacle surfaces and Noise exposure panels
  const runwayButtons = ap && <>
            <H>{t("Runways", "활주로")}</H>
            <Toggle size="sm" className={pill} pressed={ap.rwys.every((r: any) => r.on)} onPressedChange={() => ap.rwys.forEach((_: any, i: number) => eng.current?.setRunway(i, true))}>{t("All runways", "전체 활주로")}</Toggle>
            <div className={grid2}>
              {ap.rwys.map((r: any, i: number) => <Toggle key={r.id} size="sm" className={cell} pressed={r.on} onPressedChange={(v) => eng.current?.setRunway(i, v)}><span className="truncate">{r.id}</span> <span className="ml-auto font-mono text-[10px] text-white/45">{r.len.toLocaleString("en")}m</span></Toggle>)}
            </div>
  </>;
  const cur = snap?.apId ? (AIRPORTS as any)[snap.apId] : null;
  const fold = () => { setPickOpen(false); setPickHold(false); if (cur) { setRegion(cur.region); setCountry(countryOf(cur)); } };   // back to the airport on show
  const unfolded = pickOpen && !pickHold;

  return (
    <div className="fixed inset-0 bg-[#0b0d10] font-sans text-white/80 select-none">
      <canvas ref={canvas} className="absolute inset-0 block h-full w-full cursor-grab active:cursor-grabbing" />

      {/* top bar */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 flex items-center justify-between px-7 py-4 text-[11.5px] text-white/60 md:pl-[76px] max-md:px-3 max-md:py-2.5">
        <span className="flex items-center gap-3">
        </span>
        <span className="flex items-center gap-4">
          {ap && <span className="text-white/80 max-md:hidden">{ap.sub}</span>}
          <span className="text-[13px] font-semibold tracking-tight text-white">OLS Simulator</span>
          <LangButton className="pointer-events-auto text-[12px]" />
        </span>
      </div>

      {/* airport picker, top centre on wide screens (inside the left panel below 1280 px) */}
      <div className="absolute top-3 left-1/2 w-[600px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#0b0d10]/70 p-2.5 backdrop-blur max-xl:hidden"
        onMouseEnter={() => setPickOpen(true)} onMouseLeave={fold}
        onFocus={() => setPickOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) fold(); }}>
        <button type="button" aria-expanded={unfolded} onClick={() => (unfolded ? fold() : (setPickHold(false), setPickOpen(true)))}
          className="flex h-7 w-full items-center gap-2 px-1.5 text-[12.5px] text-white/60">
          {cur ? <>
            <span>{regionName(cur.region)}</span><span className="text-white/30">›</span>
            <span>{countryName(countryOf(cur))}</span><span className="text-white/30">›</span>
            <span className="font-semibold text-white">{airportName(cur)}</span>
          </> : <span>{t("Choose an airport", "공항을 선택하세요")}</span>}
          <svg viewBox="0 0 20 20" className={`ml-auto size-4 transition-transform ${unfolded ? "rotate-180" : ""}`} aria-hidden><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
        <div className={`grid grid-cols-3 gap-3 overflow-hidden transition-all duration-300 ${unfolded ? "mt-2 max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}>
          {picker("h-[132px]", () => setPickHold(true))}
        </div>
      </div>

      {/* icon rail (left edge; bottom tab bar on phones) */}
      <nav aria-label={t("Panels", "패널")} className="absolute top-0 bottom-0 left-0 z-10 flex w-[52px] flex-col items-center gap-1 border-r border-white/10 bg-[#0b0d10]/85 pt-3 backdrop-blur max-md:top-auto max-md:right-0 max-md:h-14 max-md:w-auto max-md:flex-row max-md:justify-around max-md:border-t max-md:border-r-0 max-md:pt-0">
        <button type="button" title={t("Home", "홈")} aria-label={t("Home", "홈")} onClick={onHome}
          className="grid size-10 place-items-center rounded-lg text-white/70 transition hover:bg-white/[.06] hover:text-white">
          {ic("M3 9.5L10 3.5l7 6M5 8v8.5h3.5v-5h3v5H15V8")}
        </button>
        <span className="my-2 h-px w-6 bg-white/10 max-md:mx-0 max-md:my-0 max-md:h-6 max-md:w-px" />
        {TABS.map(([k, en, kr, icon]) => (
          <button key={k} type="button" title={t(en, kr)} aria-label={t(en, kr)} aria-pressed={tab === k} onClick={() => setTab(tab === k ? null : k)}
            className={`relative grid size-10 place-items-center rounded-lg transition ${tab === k ? "bg-white/12 text-white" : "text-white/55 hover:bg-white/[.06] hover:text-white"}`}>
            {tab === k && <span className="absolute top-2 bottom-2 -left-1.5 w-[3px] rounded-full bg-[#4f7dff] max-md:top-auto max-md:-bottom-1.5 max-md:left-2 max-md:right-2 max-md:h-[3px] max-md:w-auto" />}
            {icon}
          </button>
        ))}
      </nav>

      {/* panel of the selected icon */}
      {tab && (
        <div className="absolute top-14 left-[64px] z-10 max-h-[calc(100%-11rem)] w-[310px] overflow-y-auto rounded-xl border border-white/10 bg-[#0b0d10]/80 px-4 pt-3 pb-4 backdrop-blur [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.15)_transparent] max-md:inset-x-0 max-md:top-auto max-md:bottom-14 max-md:left-0 max-md:w-auto max-md:max-h-[55vh] max-md:rounded-none max-md:rounded-t-2xl max-md:border-x-0">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-white">{(() => { const x = TABS.find(([k]) => k === tab)!; return t(x[1], x[2]); })()}</span>
            <button type="button" aria-label={t("Close", "닫기")} onClick={() => setTab(null)} className="grid size-7 place-items-center rounded text-white/45 transition hover:bg-white/[.06] hover:text-white">
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
          </div>

          {tab === "ols" && <>
            <div className="grid gap-3 xl:hidden">{picker("h-[104px]")}</div>
        {snap?.loading && <Note>{t("Loading airport data…", "공항 데이터를 불러오는 중…")}</Note>}
        {snap?.failed && <Note>{t("Could not load the airport data (network).", "공항 데이터를 불러오지 못했습니다 (네트워크).")}</Note>}
        {ap && (
          <>
            {runwayButtons}
          </>
        )}

        <H>{t("Obstacle surfaces", "장애물제한표면")}</H>
        <Toggle size="sm" className={pill} pressed={surf.size === surfaces.length} onPressedChange={() => set({ surf: ALL_KEYS })}>{t("All", "전체")}</Toggle>
        <div className={grid2}>
          {surfaces.map(([k, label, c]) => (
            <span key={k} className="flex min-w-0 items-center gap-1">
              <Toggle size="sm" className={`${cell} flex-1`} pressed={surf.has(k)} onPressedChange={(v) => { const s = new Set(surf); if (v) s.add(k); else s.delete(k); set({ surf: [...s] }); }}>
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: hex(c) }} /><span className="truncate">{sn(label)}</span>
              </Toggle>
              <button className="shrink-0 text-[10px] text-white/35 hover:text-white/80" onClick={() => set({ surf: [k] })}>{t("only", "만 보기")}</button>
            </span>
          ))}
        </div>
        <Note>{t(`ICAO Annex 14 Vol. I Tab. 4-1 / 4-2, code ${ap?.code ?? 4}. Combined OLS = the lowest surface of the included runways.`, `ICAO Annex 14 Vol. I 표 4-1 / 4-2, 코드 ${ap?.code ?? 4}. 통합 OLS = 선택한 활주로들의 표면 중 가장 낮은 표면.`)}</Note>

          </>}

          {tab === "plan" && (ap && st ? <>
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
              <div className="mt-3 text-[11px] text-white/45">{t("Parallel", "평행활주로")}</div>
              <div className={grid2}>
                {ap.rwys.map((r: any, i: number) => <Button key={r.id} size="xs" className={cell} onClick={() => set({ par: [...st.par, { ri: i, off: 760, len: 0 }] })}><span className="truncate">+ ∥ {r.id}</span></Button>)}
              </div>
              {(st.par as { ri: number; off: number; len: number }[]).map((p, k) => { const upd = (q: Partial<typeof p>) => set({ par: st.par.map((r: any, j: number) => (j === k ? { ...r, ...q } : r)) });
                const sp = Math.abs(p.off), side = p.off < 0 ? "R" : "L", len = p.len || ap.rwys[p.ri].len;
                return <div key={k} className="mt-1.5 flex flex-col gap-1 pl-2 text-[11px] text-white/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-[68px] truncate">∥ {ap.rwys[p.ri].id}</span>
                    <ToggleGroup type="single" value={side} onValueChange={(v) => v && upd({ off: (v === "R" ? -1 : 1) * sp })} className="gap-1">
                      <ToggleGroupItem value="L" size="sm" className={pill} title={t("Left of the runway (looking from A to B)", "활주로 좌측 — A에서 B 방향 기준")}>{t("Left", "좌측")}</ToggleGroupItem>
                      <ToggleGroupItem value="R" size="sm" className={pill} title={t("Right of the runway (looking from A to B)", "활주로 우측 — A에서 B 방향 기준")}>{t("Right", "우측")}</ToggleGroupItem>
                    </ToggleGroup>
                    <button className="text-white/35 hover:text-white/80" title={t("Remove", "삭제")} onClick={() => set({ par: st.par.filter((_: any, j: number) => j !== k) })}>×</button>
                  </div>
                  <label className="flex items-center gap-1.5 pl-[72px]">
                    <span className="w-12">{t("spacing", "간격")}</span>
                    <input type="range" min={0} max={2000} step={10} value={sp} onChange={(e) => upd({ off: (side === "R" ? -1 : 1) * +e.target.value })} className="w-20 accent-white" />
                    <input type="number" step={10} min={0} value={sp} onChange={(e) => upd({ off: (side === "R" ? -1 : 1) * Math.abs(+e.target.value) })} className="w-14 rounded border border-white/10 bg-white/10 px-1 py-0.5 font-mono text-white/80" />
                    <span>m</span>
                  </label>
                  <label className="flex items-center gap-1.5 pl-[72px]">
                    <span className="w-12">{t("length", "길이")}</span>
                    <input type="range" min={500} max={5000} step={50} value={len} onChange={(e) => upd({ len: +e.target.value })} className="w-20 accent-white" />
                    <input type="number" step={50} min={500} value={len} onChange={(e) => upd({ len: +e.target.value })} className="w-14 rounded border border-white/10 bg-white/10 px-1 py-0.5 font-mono text-white/80" />
                    <span>m</span>
                  </label>
                </div>; })}
            </div>
            {st.scen !== "ex" && (
              <Toggle size="sm" className={pill} pressed={!!st.showEx} onPressedChange={(v) => set({ showEx: v })}><span className="size-1.5 rounded-full bg-[#cc785c]" />{t("Existing", "기존 OLS 비교")}</Toggle>
            )}
            <Note>{t("Click a runway end to extend it; both ends can be extended at once. The new threshold is assumed at the existing end\u2019s elevation. \u201c+ ∥\u201d adds a parallel runway, centred on its reference, on the chosen side at the given centreline spacing; its length defaults to the reference runway. Threshold elevations are copied from the reference. \u201cExisting\u201d overlays the existing OLS (orange) for comparison.",
              "활주로 끝을 누르면 연장할 수 있고, 양쪽 끝을 함께 연장할 수도 있습니다. 새 시단의 표고는 기존 끝과 같다고 가정합니다. \u201c+ ∥\u201d는 기준 활주로를 중심으로 선택한 쪽에, 입력한 중심선 간격만큼 떨어진 평행활주로를 추가합니다. 길이와 시단 표고는 기준 활주로를 따릅니다. \u201c기존 OLS 비교\u201d를 켜면 기존 OLS(주황)가 겹쳐 보입니다.")}</Note>
          </> : <Note>{t("Loading airport data…", "공항 데이터를 불러오는 중…")}</Note>)}

          {tab === "proc" && (ap?.procs?.length ? <>
            <Toggle size="sm" className={pill} pressed={ap.procs.every((p: any) => st?.proc?.includes(p.id))} onPressedChange={(v) => set({ proc: v ? ap.procs.map((p: any) => p.id) : [] })}>{t("All", "전체")}</Toggle>
            {/* one row per runway: a button per runway end (with Z/Y/X when an end has several), ends in the runway's order */}
            {ap.rwys.map((r: any) => { const ps = ap.procs.filter((p: any) => p.rwy === r.nameA).concat(ap.procs.filter((p: any) => p.rwy === r.nameB)); if (!ps.length) return null;
              const ops = ps.find((p: any) => p.ops)?.ops;
              return <div key={r.id} className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="w-[92px] text-[11px] leading-tight text-white/45">RWY {r.id}{ops && <span className="block text-[10px] text-white/35">{ops === "dep" ? t("departures only", "이륙 전용") : t("arrivals only", "착륙 전용")}</span>}</span>
                {ps.map((p: any) => (
                  <Toggle key={p.id} size="sm" className={pill} title={p.name} pressed={!!st?.proc?.includes(p.id)} onPressedChange={(v) => set({ proc: v ? [...(st?.proc ?? []), p.id] : (st?.proc ?? []).filter((x: string) => x !== p.id) })}>
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: hex(p.color) }} />{p.rwy}{ps.filter((q: any) => q.rwy === p.rwy).length > 1 && /ILS ([XYZ]) /.exec(p.name) ? ` ${/ILS ([XYZ]) /.exec(p.name)![1]}` : ""}
                  </Toggle>
                ))}
              </div>; })}
            <Note>{(PROC_NOTES as Record<string, string>)[snap?.apId ?? ""]} {t("Approaches at chart minimum altitudes, flown as straight legs; DME arcs drawn through intermediate points. Orange: missed approach; ≈ points approximate (2.5 % minimum climb).", "차트 최저고도로 그린 접근경로이며, 지점 사이는 직선, DME 호는 중간점으로 그렸습니다. 주황: 실패접근, ≈ 표시 지점은 근사값(최소 상승률 2.5 %).")}</Note>
          </> : <Note>{t("No flight procedures for this airport yet. Available: Incheon, Gimpo, Jeju, Gimhae.", "이 공항은 아직 비행절차 자료가 없습니다. 지금은 인천·김포·제주·김해에 있습니다.")}</Note>)}

          {tab === "check" && <>
        <div className="flex flex-wrap gap-1.5">
          <Toggle size="sm" className={pill} pressed={!!st?.obs} onPressedChange={(v) => set({ obs: v })}><span className="size-1.5 rounded-full bg-[#e0443e]" />{t("Buildings through them", "표면 침투 건물")}</Toggle>
          <Toggle size="sm" className={pill} pressed={!!st?.pen} onPressedChange={(v) => set({ pen: v })}><span className="size-1.5 rounded-full bg-[#c64545]" />{t("Terrain through them", "표면 침투 지형")}</Toggle>
          <Toggle size="sm" className={pill} pressed={!!st?.ofz} onPressedChange={(v) => set({ ofz: v })}>{t("OFZ (inner surfaces)", "OFZ (내측 표면)")}</Toggle>
        </div>
            <div className="mt-4 text-[11px] text-white/45">{t("Through the combined OLS", "통합 OLS 침투")} · {scenName}</div>
            {!stats ? <Note>{t("Computing…", "계산 중…")}</Note> : <div className="mt-2 space-y-2.5 rounded-lg border border-white/10 bg-white/[.03] p-3 text-[11.5px]">
              <div className="flex items-baseline justify-between gap-2"><span className="text-white/60">{t("Buildings through", "침투 건물")}</span>
                {st?.obs ? <b className="font-mono text-white">{stats.obsBad.length.toLocaleString("en")} <span className="font-normal text-white/45">/ {stats.obsChecked.toLocaleString("en")}</span></b> : <span className="text-white/45">{t("turn on buildings above", "위에서 침투 건물을 켜세요")}</span>}</div>
              {st?.obs && stats.obsBad[0] && <div className="text-white/60">{t("Worst", "최대")}: <span className="text-white">{stats.obsBad[0].name ?? (ko ? tagKo(stats.obsBad[0].tag) : stats.obsBad[0].tag)}</span> <span className="font-mono text-[#f0625c]">+{fmt(stats.obsBad[0].pen)} m</span> <span className="text-white/45">· {sn(stats.obsBad[0].surface)}</span></div>}
              <div className="flex items-baseline justify-between gap-2"><span className="text-white/60">{t("Terrain through", "침투 지형")}</span><b className="font-mono text-white">{stats.area} km²</b></div>
              {stats.worst && <div className="text-white/60">{t("Worst", "최대")}: <span className="font-mono text-[#f0625c]">+{fmt(stats.worst.pen)} m</span> <span className="text-white/45">· {sn(stats.worst.surface)}</span></div>}
              {(Object.values(stats.bySurface) as any[]).sort((a, b) => b.area - a.area).map((b) => (
                <div key={b.name} className="flex justify-between font-mono text-[10.5px] text-white/50"><span className="font-sans">{sn(b.name)}</span><span>{b.area} km² · +{fmt(b.max)} m</span></div>))}
            </div>}
          </>}

          {tab === "noise" && (() => { const nz = snap?.noise, c = nz?.cfg, kr = nz?.scheme === "kr";
            if (!nz?.available) return <Note>{t("No traffic data for this airport yet.", "이 공항은 아직 운항 자료가 없습니다.")}</Note>;
            const upd = (q: Record<string, number>) => set({ noiseCfg: { ...(st?.noiseCfg ?? {}), ...q } });
            const pct = (v: number) => `${Math.round(v * 100)}%`;
            return <>
              <Toggle size="sm" className={pill} pressed={!!st?.noise} onPressedChange={(v) => set({ noise: v })}>{t("Show Lden contours", "Lden 등고선 표시")}</Toggle>
              {runwayButtons}
              <div className="mt-3 text-[11px] text-white/45">{kr ? t("Korean airport noise zones (Lden, from 2023)", "국내 소음대책지역 기준 (Lden, 2023~)") : t("International comparison (EU, Lden 5 dB bands)", "국제 비교 기준 (EU, Lden 5 dB 단위)")}</div>
              {nz.busy ? <Note>{t("Computing", "계산 중")} {Math.round((nz.progress ?? 0) * 100)}%…</Note> : nz.bands && st?.noise && (
                <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-white/[.03] p-2.5 text-[11.5px]">
                  {[...nz.bands].reverse().map((b: any) => (
                    <div key={b.lo} className="flex items-center gap-2"><span className="size-3 shrink-0 rounded-sm" style={{ background: b.color }} />
                      <span className="text-white/80">{t(b.en, b.ko)}</span><span className="text-white/40">≥ {b.lo} dB</span>
                      <span className="ml-auto font-mono text-white/70">{b.km2} km²</span></div>))}
                </div>)}
              <H>{t("Traffic", "운항")}</H>
              <label className="flex items-center gap-2 text-[11px] text-white/60"><span className="w-24">{t("Annual movements", "연간 운항")}</span>
                <input type="number" step={1000} min={0} value={c.annual} onChange={(e) => upd({ annual: Math.max(0, +e.target.value) })} className="w-24 rounded border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-white/85" />
                <span className="text-white/40">{t("per year", "회/년")}</span></label>
              {([["north", t("Northbound share", "북쪽 방향 비율")], ["evening", t("Evening 19–22 h", "저녁 19–22시")], ["night", t("Night 22–07 h", "야간 22–07시")]] as [string, string][]).map(([k, label]) => (
                <label key={k} className="mt-1.5 flex items-center gap-2 text-[11px] text-white/60"><span className="w-24">{label}</span>
                  <input type="range" min={0} max={k === "north" ? 1 : 0.4} step={0.01} value={c[k]} onChange={(e) => upd({ [k]: +e.target.value })} className="w-28 accent-white" />
                  <span className="font-mono text-white/80">{pct(c[k])}</span></label>))}
              {c.estimate && <p className="mt-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[10.5px] leading-snug text-amber-200/90">{t("Movements are an estimate — replace them with the airport's statistics.", "운항 횟수가 추정값입니다. 공항 통계로 바꿔 넣어 주세요.")}</p>}
              <div className="mt-3 text-[11px] text-white/45">{t("Representative fleet (assumed)", "대표 기종 구성 (가정)")}</div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 font-mono text-[10.5px] text-white/60">{nz.fleet.map(([n, sh]: [string, number]) => <span key={n} className="flex justify-between"><span className="font-sans">{n}</span>{pct(sh)}</span>)}</div>
              <Note>{t(`Movements: ${c.source}. Runway roles as operated where known (Incheon RWY 1/3 departures, 2/4 arrivals), otherwise every runway carries both; fleet mix, time of day and direction are assumptions. Method: ICAO Doc 9911 / ECAC Doc 29 segment method with ANP v2.3 NPD data and procedural profiles (EUROCONTROL / EASA); straight tracks, flat ground, ISA. For planning screening only — not the official noise zone map.`,
                `운항 횟수: ${c.source}. 활주로 운영은 알려진 경우 실제대로(인천 RWY 1·3 이륙, 2·4 착륙), 그 밖에는 모든 활주로가 이착륙을 함께 합니다. 기종 구성·시간대·방향 비율은 가정값입니다. 계산: ICAO Doc 9911 / ECAC Doc 29 구간법, ANP v2.3 NPD·비행 프로파일(EUROCONTROL / EASA). 직선 항적, 평탄 지형, 표준대기 가정. 계획 검토용이며 공식 소음대책지역 고시를 대신하지 않습니다.`)}</Note>
            </>; })()}

          {tab === "info" && <>
        {ap && <Note>{ap.sub} · {t(`AD ${ap.E} m AMSL`, `공항표고 ${ap.E} m`)} · Annex 14 {t("code", "코드")} {ap.code} · {ap.dem === "ok" ? t("terrain loaded", "지형 불러옴") : ap.dem === "loading" ? t("terrain loading…", "지형 불러오는 중…") : ap.dem === "failed" ? t("terrain unavailable", "지형 사용 불가") : t("terrain none", "지형 없음")}</Note>}

            {ap?.assume && <p className="mt-3 text-[11px] leading-relaxed text-white/55 [&_b]:font-semibold [&_b]:text-white/80" dangerouslySetInnerHTML={{ __html: ap.assume }} />}
        <Note>{t(`Buildings: OSM height / levels tags, untagged ones assumed ${st?.bldH ?? 6} m. Terrain: ${ap?.demSrc ?? "—"}.`, `건물: OSM 높이·층수 태그 사용, 태그가 없으면 ${st?.bldH ?? 6} m로 가정. 지형: ${ap?.demSrc ?? "—"}.`)}</Note>
            <Note>Terrain GEDTM30 © OpenGeoHub (CC BY 4.0) · Buildings © OpenStreetMap contributors (ODbL) · Imagery © Esri</Note>
          </>}

          {tab === "report" && <>
            <p className="text-[12px] leading-relaxed text-white/65">{t("Obstacle list of the current scenario as a CSV file (opens in Excel): buildings through the combined OLS, worst first, and terrain penetration per surface.", "현재 시나리오의 장애물 목록을 CSV 파일(엑셀에서 열림)로 내려받습니다. 통합 OLS를 침투하는 건물(큰 순)과 표면별 지형 침투가 들어갑니다.")}</p>
            <div className="mt-2 text-[11px] text-white/45">{snap?.apId} · {scenName}{stats && st?.obs ? ` · ${t("buildings through", "침투 건물")} ${stats.obsBad.length}` : ""}</div>
            <Button size="sm" className="mt-4 h-8 rounded-md bg-[#3f6bff] px-4 text-[12.5px] text-white hover:bg-[#5a80ff]" onClick={downloadCsv} disabled={!ap}>{t("Download CSV", "CSV 내려받기")}</Button>
            {!st?.obs && <Note>{t("Buildings are off (Review), so the file has terrain only.", "검토에서 침투 건물이 꺼져 있어 지형만 들어갑니다.")}</Note>}
          </>}
        </div>
      )}

      {/* right: altitude read-out */}
      <div className="pointer-events-none absolute top-14 right-7 w-[230px] text-[11.5px] max-md:top-12 max-md:right-3 max-md:w-[170px] max-md:text-[10.5px]">
        <div className="text-[13px] font-semibold text-white">{t("Altitude", "고도")}</div>
        {hover?.kind === "obstacle" ? (
          <div className="mt-2 space-y-0.5">
            <div className="text-white">{hover.name ?? (ko ? tagKo(hover.tag) : hover.tag)}</div>
            {hover.name && <div className="text-white/50">{ko ? tagKo(hover.tag) : hover.tag}</div>}
            <div>{t("Height", "높이")} {fmt(hover.h, 0)} m · {t("ground", "지면")} {fmt(hover.g)} m</div>
            <div>{t("Top", "꼭대기")} <b className="font-mono text-white">{fmt(hover.top)} m {t("AMSL", "(해발)")}</b></div>
            {hover.limit ? <>
              <div>{sn(hover.limit.name)} {t("limit", "제한고")} {fmt(hover.limit.h)} m</div>
              <div style={{ color: hover.pen > 0 ? "#f0625c" : "#6fcf8a" }}>{hover.pen > 0 ? t(`Through the surface by ${fmt(hover.pen)} m`, `표면 ${fmt(hover.pen)} m 침투`) : t(`Clear by ${fmt(-hover.pen)} m`, `여유 ${fmt(-hover.pen)} m`)}</div>
            </> : <div className="text-white/50">{t("Outside the OLS", "OLS 범위 밖")}</div>}
          </div>
        ) : hover?.kind === "point" ? (
          <div className="mt-2 space-y-0.5">
            {(() => { const r = st?.scen === "ext" ? hover.ext : hover.ex; return r
              ? <><div>{t("Limit here", "이 지점 제한고")} <b className="font-mono text-white">{fmt(r.h)} m {t("AMSL", "(해발)")}</b></div><div className="text-white/70">{sn(r.name)}</div></>
              : <div className="text-white/50">{t("Outside the OLS", "OLS 범위 밖")}</div>; })()}
            {hover.ground !== null && <div>{t("Ground", "지면")} {fmt(hover.ground)} m{(() => { const r = st?.scen === "ext" ? hover.ext : hover.ex; if (!r) return null; const m = r.h - hover.ground; return <span style={{ color: m < 0 ? "#f0625c" : "#6fcf8a" }}> · {m >= 0 ? t("clear", "여유") : t("through", "침투")} {fmt(Math.abs(m))} m</span>; })()}</div>}
            {st?.scen === "cmp" && hover.ex && hover.ext && <div>{t("Extended:", "연장 후:")} {fmt(hover.ext.h)} m ({hover.ext.h - hover.ex.h >= 0 ? "+" : ""}{fmt(hover.ext.h - hover.ex.h)} m)</div>}
            {hover.lden != null && isFinite(hover.lden) && <div>Lden <b className="font-mono text-white">{fmt(hover.lden)} dB</b>{(() => { const b = [...(snap?.noise?.bands ?? [])].reverse().find((x: any) => hover.lden >= x.lo); return b ? <span style={{ color: b.color }}> · {t(b.en, b.ko)}</span> : null; })()}</div>}
            <div className="font-mono text-[10.5px] text-white/40">{t(<>s {fmt(hover.s, 0)} m · d {fmt(hover.d, 0)} m from THR {hover.refA}</>, <>THR {hover.refA} 기준 s {fmt(hover.s, 0)} m · d {fmt(hover.d, 0)} m</>)}</div>
          </div>
        ) : <div className="mt-2 text-white/45">{t("Move over a surface or a building.", "표면이나 건물 위에 마우스를 올려 보세요.")}</div>}
        <div className="mt-5 space-y-1">
          {surfaces.filter(([k]) => surf.has(k)).map(([k, label, c]) => <div key={k} className="flex items-center gap-2"><span className="h-[2px] w-5" style={{ background: hex(c) }} /><span style={{ color: hex(c) }}>{sn(label)}</span></div>)}
          {st?.scen === "cmp" && <div className="flex items-center gap-2"><span className="h-[2px] w-5 bg-[#cc785c]" /><span className="text-[#cc785c]">{t("Extended OLS", "연장 후 OLS")}</span></div>}
        </div>
      </div>

      {/* bottom left: layer switcher (current layer; the choices unfold beside it) */}
      <div className="absolute bottom-10 left-[68px] z-10 flex items-end gap-2 max-md:bottom-[72px] max-md:left-3"
        onMouseEnter={() => setLayerOpen(true)} onMouseLeave={() => setLayerOpen(false)}>
        <button type="button" aria-expanded={layerOpen} onClick={() => setLayerOpen((o) => !o)} title={t("Layers", "레이어")}
          className="relative size-[68px] overflow-hidden rounded-xl border-2 border-white/70 shadow-lg transition hover:border-white">
          {swatch(st?.base ?? "sat", "absolute inset-0 size-full")}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/85 to-transparent pt-4 pb-1 text-[11px] font-medium text-white">
            <svg viewBox="0 0 20 20" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M10 3l7 3.5-7 3.5-7-3.5zM3 10l7 3.5 7-3.5" /></svg>{t("Layers", "레이어")}
          </span>
        </button>
        <div className={`flex gap-2.5 overflow-hidden rounded-xl bg-[#0b0d10]/85 backdrop-blur transition-all duration-200 ${layerOpen ? "max-w-[260px] border border-white/10 px-3 py-2 opacity-100" : "pointer-events-none max-w-0 border-0 p-0 opacity-0"}`}>
          {LAYERS.map(([k, en, kr]) => (
            <button key={k} type="button" onClick={() => set({ base: k })} className="flex shrink-0 flex-col items-center gap-1 text-[11px] text-white/70 transition hover:text-white">
              <span className={`relative size-12 overflow-hidden rounded-lg border-2 ${st?.base === k ? "border-[#4f7dff]" : "border-transparent"}`}>{swatch(k, "absolute inset-0 size-full")}</span>
              <span className={st?.base === k ? "text-white" : ""}>{t(en, kr)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* bottom right: view and elevation scale, above the coordinates */}
      <div className="absolute right-7 bottom-9 z-10 flex flex-col items-end gap-2 max-md:right-3 max-md:bottom-[152px]">
        <div className="rounded-xl border border-white/10 bg-[#0b0d10]/80 p-2.5 backdrop-blur max-md:max-w-[calc(100vw-108px)]">
          <div className="mb-1.5 text-[11px] text-white/50">{t("View", "화면 선택")}</div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="xs" className={pill} onClick={() => eng.current?.fit("all")}>{t("Overview", "전체")}</Button>
            <Button size="xs" className={pill} onClick={() => eng.current?.fit("rwy")}>{t("Runway", "활주로")}</Button>
            <Button size="xs" className={`${pill} max-md:hidden`} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>{fs ? t("Exit full screen", "전체 화면 종료") : t("Full screen", "전체 화면")}</Button>
            <Toggle size="sm" className={pill} pressed={!!st?.rot} onPressedChange={(v) => set({ rot: v })}>{t("Auto-rotate", "자동 회전")}</Toggle>
          </div>
          <div className="mt-2.5 mb-1.5 text-[11px] text-white/50">{t("Elevation scale", "고도 배율")}</div>
          <ToggleGroup type="single" value={String(st?.zex ?? 1)} onValueChange={(v) => v && set({ zex: +v })} className="justify-start gap-1.5">
            {[1, 2, 5, 10].map((z) => <ToggleGroupItem key={z} value={String(z)} size="sm" className={pill}>{z}×</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <span className="pointer-events-none mt-1 font-mono max-md:hidden text-[11.5px] tracking-wide text-white/60">{ap ? `${Math.abs(ap.origin[0]).toFixed(4)}°${ap.origin[0] < 0 ? "S" : "N"}  ${Math.abs(ap.origin[1]).toFixed(4)}°${ap.origin[1] < 0 ? "W" : "E"}` : ""}</span>
      </div>
      <div className="pointer-events-none absolute right-7 bottom-3 left-[76px] flex justify-between text-[10.5px] text-white/35 max-md:inset-x-3 max-md:bottom-[60px] max-md:text-[9px]">
        <span className="max-md:hidden">{t("Drag to orbit · scroll to zoom · right-drag to pan · hover a building for its clearance", "드래그: 회전 · 스크롤: 확대·축소 · 오른쪽 드래그: 이동 · 건물에 마우스를 올리면 여유고 표시")}</span>
        <span className="truncate">Terrain GEDTM30 © OpenGeoHub (CC BY 4.0) · Buildings © OpenStreetMap contributors · Imagery © Esri</span>
      </div>
    </div>
  );
}
