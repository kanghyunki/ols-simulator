"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { LangButton } from "@/components/lang-button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PROCEDURES } from "@/data/procedures.js";
import { useT } from "@/lib/lang";
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
  const set = (p: Record<string, unknown>) => eng.current?.set(p);
  const surf = new Set<string>(st?.surf ?? ALL_KEYS);
  const surfaces = st?.ofz ? [...SURFACES, ...OFZ_SURFACES] : SURFACES;
  const airports = Object.entries(AIRPORTS as Record<string, any>).filter(([, a]) => a.region === region && countryOf(a) === country);
  const picker = (rows: string, picked?: () => void) => <>
    <Column label={t("Region", "지역")} rows={rows} items={REGIONS.map(([k]) => [k, regionName(k)])} value={region} onPick={(v) => { setRegion(v); setCountry(regionCountries(v)[0]); }} />
    <Column label={t("Country", "국가")} rows={rows} items={regionCountries(region).map((c) => [c, countryName(c)])} value={country} onPick={setCountry} empty={t("No airports yet", "아직 공항이 없습니다")} />
    <Column label={t("Airport", "공항")} rows={rows} items={airports.map(([k, a]) => [k, airportName(a) ?? k])} value={snap?.apId ?? ""} onPick={(k) => { eng.current?.switchAirport(k); picked?.(); }} />
  </>;
  // Ground imagery and vertical exaggeration: bottom right above the coordinates on wider screens, in the Controls sheet on phones
  const groundVertical = <>
    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
      <span className="mr-1 text-[11px] text-white/45">{t("Ground", "바닥")}</span>
      <ToggleGroup type="single" value={st?.base ?? "sat"} onValueChange={(v) => v && set({ base: v })} className="gap-1.5">
        <ToggleGroupItem value="sat" size="sm" className={pill}>{t("Satellite", "위성")}</ToggleGroupItem>
        <ToggleGroupItem value="osm" size="sm" className={pill}>{t("OSM", "지도")}</ToggleGroupItem>
        <ToggleGroupItem value="none" size="sm" className={pill}>{t("None", "없음")}</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
      <span className="mr-1 text-[11px] text-white/45">{t("Vertical", "수직 과장")}</span>
      <ToggleGroup type="single" value={String(st?.zex ?? 1)} onValueChange={(v) => v && set({ zex: +v })} className="gap-1.5">
        {[1, 2, 5, 10].map((z) => <ToggleGroupItem key={z} value={String(z)} size="sm" className={pill}>{z}×</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
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
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden><path d="M16 10H4M9 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>{t("Home", "홈")}
          </button>
          <Button size="xs" className={`${pill} pointer-events-auto md:hidden`} onClick={() => setMenu((m) => !m)}>{menu ? t("Close", "닫기") : t("Controls", "메뉴")}</Button>
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

      {/* left panel */}
      <div className={`absolute top-14 bottom-10 left-7 w-[270px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.15)_transparent] max-md:inset-x-0 max-md:top-auto max-md:bottom-6 max-md:w-auto max-md:max-h-[50vh] max-md:rounded-t-2xl max-md:bg-[#0b0d10]/90 max-md:px-4 max-md:pt-3 max-md:pb-4 max-md:backdrop-blur ${menu ? "" : "max-md:hidden"}`}>
        <H>{t("View", "보기")}</H>
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" className={pill} onClick={() => eng.current?.fit("all")}>{t("Overview", "전체")}</Button>
          <Button size="xs" className={pill} onClick={() => eng.current?.fit("rwy")}>{t("Runway", "활주로")}</Button>
          <Button size="xs" className={pill} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>{fs ? t("Exit full screen", "전체 화면 종료") : t("Full screen", "전체 화면")}</Button>
          <Toggle size="sm" className={pill} pressed={!!st?.rot} onPressedChange={(v) => set({ rot: v })}>{t("Auto-rotate", "자동 회전")}</Toggle>
        </div>

        <div className="mt-5 grid gap-3 xl:hidden">{picker("h-[104px]")}</div>
        {snap?.loading && <Note>{t("Loading airport data…", "공항 데이터를 불러오는 중…")}</Note>}
        {snap?.failed && <Note>{t("Could not load the airport data (network).", "공항 데이터를 불러오지 못했습니다 (네트워크).")}</Note>}
        {ap && <Note>{ap.sub} · {t(`AD ${ap.E} m AMSL`, `공항표고 ${ap.E} m`)} · Annex 14 {t("code", "코드")} {ap.code} · {ap.dem === "ok" ? t("terrain loaded", "지형 불러옴") : ap.dem === "loading" ? t("terrain loading…", "지형 불러오는 중…") : ap.dem === "failed" ? t("terrain unavailable", "지형 사용 불가") : t("terrain none", "지형 없음")}</Note>}

        {ap && (
          <>
            <H>{t("Runways", "활주로")}</H>
            <div className="flex flex-wrap gap-1.5">
              <Toggle size="sm" className={pill} pressed={ap.rwys.every((r: any) => r.on)} onPressedChange={() => ap.rwys.forEach((_: any, i: number) => eng.current?.setRunway(i, true))}>{t("All runways", "전체 활주로")}</Toggle>
              {ap.rwys.map((r: any, i: number) => <Toggle key={r.id} size="sm" className={pill} pressed={r.on} onPressedChange={(v) => eng.current?.setRunway(i, v)}>RWY {r.id} <span className="font-mono text-[10px] text-white/45">{r.len.toLocaleString("en")}m</span></Toggle>)}
            </div>
          </>
        )}

        <H>{t("Obstacle surfaces", "장애물제한표면")}</H>
        <div className="flex flex-wrap gap-1.5">
          <Toggle size="sm" className={pill} pressed={surf.size === surfaces.length} onPressedChange={() => set({ surf: ALL_KEYS })}>{t("All", "전체")}</Toggle>
          {surfaces.map(([k, label, c]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <Toggle size="sm" className={pill} pressed={surf.has(k)} onPressedChange={(v) => { const s = new Set(surf); if (v) s.add(k); else s.delete(k); set({ surf: [...s] }); }}>
                <span className="size-1.5 rounded-full" style={{ background: hex(c) }} />{sn(label)}
              </Toggle>
              <button className="text-[10px] text-white/35 hover:text-white/80" onClick={() => set({ surf: [k] })}>{t("only", "만 보기")}</button>
            </span>
          ))}
        </div>
        <Note>{t(`ICAO Annex 14 Vol. I Tab. 4-1 / 4-2, code ${ap?.code ?? 4}. Combined OLS = the lowest surface of the included runways.`, `ICAO Annex 14 Vol. I 표 4-1 / 4-2, 코드 ${ap?.code ?? 4}. 통합 OLS = 선택한 활주로들의 표면 중 가장 낮은 표면.`)}</Note>

        {ap && st && (
          <>
            <H>{t("Scenario", "시나리오")}</H>
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
                <span className="w-[92px] text-[11px] text-white/45">{t("Parallel", "평행활주로")}</span>
                {ap.rwys.map((r: any, i: number) => <Button key={r.id} size="xs" className={pill} onClick={() => set({ par: [...st.par, { ri: i, off: 760, len: 0 }] })}>+ ∥ {r.id}</Button>)}
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
          </>
        )}

        {!!ap?.procs?.length && (
          <>
            <H>{t("Flight procedures", "비행절차")}</H>
            <div className="flex flex-wrap gap-1.5">
              <Toggle size="sm" className={pill} pressed={ap.procs.every((p: any) => st?.proc?.includes(p.id))} onPressedChange={(v) => set({ proc: v ? ap.procs.map((p: any) => p.id) : [] })}>{t("All", "전체")}</Toggle>
              {ap.procs.map((p: any) => (
                <Toggle key={p.id} size="sm" className={pill} pressed={!!st?.proc?.includes(p.id)} onPressedChange={(v) => set({ proc: v ? [...(st?.proc ?? []), p.id] : (st?.proc ?? []).filter((x: string) => x !== p.id) })}>
                  <span className="size-1.5 rounded-full" style={{ background: hex(p.color) }} />{p.name}
                </Toggle>
              ))}
            </div>
            <Note>AIP RKSI AD 2-62 ~ 2-69, ILS or LOC CAT II &amp; III (AMDT 13/25). {t("Approaches at chart minimum altitudes, straight legs from PAMBI or ENPIL. Orange: missed approach, turn points approximate (≈).", "차트 최저고도로 그린 접근경로이며, PAMBI 또는 ENPIL에서 직선으로 연결했습니다. 주황: 실패접근, 선회 지점은 근사값(≈).")}</Note>
          </>
        )}
        <H>{t("Check", "검토")}</H>
        <div className="flex flex-wrap gap-1.5">
          <Toggle size="sm" className={pill} pressed={!!st?.obs} onPressedChange={(v) => set({ obs: v })}><span className="size-1.5 rounded-full bg-[#e0443e]" />{t("Buildings through them", "표면 침투 건물")}</Toggle>
          <Toggle size="sm" className={pill} pressed={!!st?.pen} onPressedChange={(v) => set({ pen: v })}><span className="size-1.5 rounded-full bg-[#c64545]" />{t("Terrain through them", "표면 침투 지형")}</Toggle>
          <Toggle size="sm" className={pill} pressed={!!st?.ofz} onPressedChange={(v) => set({ ofz: v })}>{t("OFZ (inner surfaces)", "OFZ (내측 표면)")}</Toggle>
        </div>
        <div className="mt-2 grid gap-2 md:hidden">{groundVertical}</div>
        <Note>{t(`Buildings: OSM height / levels tags, untagged ones assumed ${st?.bldH ?? 6} m. Terrain: ${ap?.demSrc ?? "—"}.`, `건물: OSM 높이·층수 태그 사용, 태그가 없으면 ${st?.bldH ?? 6} m로 가정. 지형: ${ap?.demSrc ?? "—"}.`)}</Note>
      </div>

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
            <div className="font-mono text-[10.5px] text-white/40">{t(<>s {fmt(hover.s, 0)} m · d {fmt(hover.d, 0)} m from THR {hover.refA}</>, <>THR {hover.refA} 기준 s {fmt(hover.s, 0)} m · d {fmt(hover.d, 0)} m</>)}</div>
          </div>
        ) : <div className="mt-2 text-white/45">{t("Move over a surface or a building.", "표면이나 건물 위에 마우스를 올려 보세요.")}</div>}
        <div className="mt-5 space-y-1">
          {surfaces.filter(([k]) => surf.has(k)).map(([k, label, c]) => <div key={k} className="flex items-center gap-2"><span className="h-[2px] w-5" style={{ background: hex(c) }} /><span style={{ color: hex(c) }}>{sn(label)}</span></div>)}
          {st?.scen === "cmp" && <div className="flex items-center gap-2"><span className="h-[2px] w-5 bg-[#cc785c]" /><span className="text-[#cc785c]">{t("Extended OLS", "연장 후 OLS")}</span></div>}
        </div>
      </div>

      <div className="absolute right-7 bottom-9 flex flex-col items-end gap-2 max-md:hidden">
        {groundVertical}
        <span className="pointer-events-none mt-1 font-mono text-[11.5px] tracking-wide text-white/60">{ap ? `${Math.abs(ap.origin[0]).toFixed(4)}°${ap.origin[0] < 0 ? "S" : "N"}  ${Math.abs(ap.origin[1]).toFixed(4)}°${ap.origin[1] < 0 ? "W" : "E"}` : ""}</span>
      </div>
      <div className="pointer-events-none absolute right-7 bottom-3 left-7 flex justify-between text-[10.5px] text-white/35 max-md:inset-x-3 max-md:bottom-1 max-md:text-[9px]">
        <span className="max-md:hidden">{t("Drag to orbit · scroll to zoom · right-drag to pan · hover a building for its clearance", "드래그: 회전 · 스크롤: 확대·축소 · 오른쪽 드래그: 이동 · 건물에 마우스를 올리면 여유고 표시")}</span>
        <span className="truncate">Terrain GEDTM30 © OpenGeoHub (CC BY 4.0) · Buildings © OpenStreetMap contributors · Imagery © Esri</span>
      </div>
    </div>
  );
}
