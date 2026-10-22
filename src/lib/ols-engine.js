// OLS Simulator engine — ICAO Annex 14 obstacle limitation surfaces, multi-runway (combined OLS = lowest
// governing surface), GEDTM30 / online terrain, OSM buildings, rendered in 3D with Three.js.
// Ported from the single-file simulator (cadip-web public/OLS_Simulator_Global.html); the geometry core is verbatim.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AIRPORTS } from '@/data/airports.js';
import { PROCEDURES } from '@/data/procedures.js';
import { NOISE_TRAFFIC, NOISE_BANDS } from '@/data/noise-traffic.js';
import { ANP } from '@/data/noise-anp.js';
import { table as noiseTable, lden, lnAt } from '@/lib/noise.js';

export { AIRPORTS } from '@/data/airports.js';

// Surface keys (for the per-surface toggles) and display colours. OFZ surfaces only exist when state.ofz.
export const SURFACES = [
  ['strip', 'Runway strip', 0x9aa0a6], ['approach', 'Approach', 0x2f6fe4], ['takeoff', 'Take-off climb', 0x19b3a6],
  ['transitional', 'Transitional', 0xd6409f], ['ih', 'Inner horizontal', 0x5aa9e6], ['conical', 'Conical', 0x8a7bb8],
];
export const OFZ_SURFACES = [
  ['innerapp', 'Inner approach', 0xf472b6], ['innertrans', 'Inner transitional', 0xfb7185], ['balked', 'Balked landing', 0xf59e0b],
];
const COLOR = Object.fromEntries([...SURFACES, ...OFZ_SURFACES].map(([k, , c]) => [k, c]));
export const ALL_KEYS = [...SURFACES, ...OFZ_SURFACES].map(([k]) => k);

// ---------- Annex 14 Vol.I Tab.4-1/4-2 dimensions by code number (half-widths in m) ----------
const OLSP = {
  4: { ihR: 4000, con: 100, strip: 140, appW: 140, app1: 3000, app1s: 0.02, app2: 3600, app2s: 0.025, appL: 15000, trans: 0.143, tocW: 90, tocDiv: 0.125, tocWmax: 900, tocL: 15000, tocS: 0.02 },
  3: { ihR: 4000, con: 75, strip: 140, appW: 140, app1: 3000, app1s: 0.02, app2: 3600, app2s: 0.025, appL: 15000, trans: 0.143, tocW: 90, tocDiv: 0.125, tocWmax: 900, tocL: 15000, tocS: 0.02 },
  2: { ihR: 3500, con: 60, strip: 70, appW: 70, app1: 2500, app1s: 0.0333, app2: 0, app2s: 0, appL: 2500, trans: 0.20, tocW: 40, tocDiv: 0.10, tocWmax: 290, tocL: 2500, tocS: 0.04 },
};
const P_ST = [[0, [232, 165, 90]], [.5, [198, 69, 69]], [1, [127, 29, 29]]];
function rampG(t, st) { t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < st.length; i++) { if (t <= st[i][0]) { const f = (t - st[i - 1][0]) / (st[i][0] - st[i - 1][0]); const a = st[i - 1][1], b = st[i][1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; } }
  return st[st.length - 1][1]; }

const FILM = 0.15;   // dark film over the imagery so the surfaces read (was 0.3)
const TILE_PROV = {
  osm: { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, attr: '© OpenStreetMap contributors', max: 19 },
  sat: { url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`, attr: 'Imagery © Esri, Maxar', max: 19 },
};
function lon2tx(lon, z) { return (lon + 180) / 360 * (1 << z); }
function lat2ty(lat, z) { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * (1 << z); }
function tx2lon(tx, z) { return tx / (1 << z) * 360 - 180; }
function ty2lat(ty, z) { const n = Math.PI - 2 * Math.PI * ty / (1 << z); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }

const TAG = { communications_tower: 'Communications tower', mast: 'Mast', tower: 'Tower', chimney: 'Chimney', water_tower: 'Water tower', lighthouse: 'Lighthouse', windmill: 'Windmill', power_tower: 'Power pylon', wind: 'Wind turbine' };

// Airport data scripts in flight or loaded, shared by every engine: each osm_<ID>.js declares a top-level const, so it
// must run only once per page even when a second engine starts before the first load finishes
const _osmP = {};

export function createEngine(canvas, cb) {
  // ---------- state ----------
  let AP = null, APID = null;
  // extA/extB: extension (m) per runway at the A / B end; showEx overlays the existing OLS for comparison
  // par: added parallel runways [{ ri, off, len }] — a copy of runway `ri` shifted `off` m to its left (A→B; negative = right),
  // centred on the reference, `len` m long (default: the reference length), same threshold elevations
  const state = { showEx: false, extA: [], extB: [], par: [], E: 39, base: 'sat', pen: true, obs: true, ofz: false, proc: [], bldH: 6,
    surf: new Set(ALL_KEYS), rot: true, zex: 5, noise: false, noiseCfg: null };   // noiseCfg: overrides of NOISE_TRAFFIC (annual, north, evening, night)   // zex: vertical exaggeration, 5× by default so relief and the surfaces' slopes read at airport scale

  // ---------- coordinates / geometry core (per-runway frames) ----------
  function initAp(ap) { if (!ap._k) { const lat0 = ap.osm.origin[0]; ap._k = [111320 * Math.cos(lat0 * Math.PI / 180), 110574]; }
    if (!ap._on) ap._on = ap.rwys.map(() => true); }
  function LL(ap, ll) { const [kx, ky] = ap._k, [lat0, lon0] = ap.osm.origin; return [(ll[1] - lon0) * kx, (ll[0] - lat0) * ky]; }
  // Effective scenario: nothing extended → 'ex'; extended → 'ext', or 'cmp' when the existing OLS is overlaid
  const anyExt = () => state.extA.some(v => v > 0) || state.extB.some(v => v > 0) || state.par.length > 0;
  const scen = () => !anyExt() ? 'ex' : state.showEx ? 'cmp' : 'ext';
  const parKey = () => state.par.map(p => p.ri + ':' + p.off + ':' + (p.len || 0)).join(',');
  function frames(apply) {
    const base = baseFrames(apply); if (!apply) return base;
    return base.concat(state.par.map((p, k) => { const r = base[p.ri]; if (!r) return null;
      const L = p.len > 0 ? p.len : r.L, h = L / 2, mx = (r.A[0] + r.B[0]) / 2 + r.N[0] * p.off, my = (r.A[1] + r.B[1]) / 2 + r.N[1] * p.off;
      const A = [mx - r.U[0] * h, my - r.U[1] * h], B = [mx + r.U[0] * h, my + r.U[1] * h];
      return { ...r, A, B, L, baseA: A, baseB: B, baseL: L, nameA: r.nameA + '′', nameB: r.nameB + '′', par: true, i: base.length + k }; }).filter(Boolean));
  }
  function baseFrames(apply) {
    return AP.rwys.map((r, i) => {
      const A = LL(AP, r.llA), B = LL(AP, r.llB);
      const dx = B[0] - A[0], dy = B[1] - A[1], Lb = Math.hypot(dx, dy);
      const U = [dx / Lb, dy / Lb];
      let a = A.slice(), b = B.slice();
      if (apply) { const ea = state.extA[i] || 0, eb = state.extB[i] || 0;
        if (ea > 0) a = [A[0] - U[0] * ea, A[1] - U[1] * ea];
        if (eb > 0) b = [B[0] + U[0] * eb, B[1] + U[1] * eb]; }
      return { A: a, B: b, L: Math.hypot(b[0] - a[0], b[1] - a[1]), U, N: [-U[1], U[0]],
        eA: r.eA, eB: r.eB, cwyA: r.cwyA, cwyB: r.cwyB, nameA: r.nameA, nameB: r.nameB,
        on: AP._on[i], baseA: A, baseB: B, baseL: Lb, i };
    });
  }
  function sd(P, rw) { const px = P[0] - rw.A[0], py = P[1] - rw.A[1]; return [px * rw.U[0] + py * rw.U[1], px * rw.N[0] + py * rw.N[1]]; }
  function Wp(rw, s, d) { return [rw.A[0] + rw.U[0] * s + rw.N[0] * d, rw.A[1] + rw.U[1] * s + rw.N[1] * d]; }
  function distSeg(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    let t = ((px - ax) * vx + (py - ay) * vy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (ax + vx * t), py - (ay + vy * t)); }
  const olsP = () => OLSP[AP && AP.code] || OLSP[4];

  // Limit height of one runway's OLS at P. allow = Set of surface keys to consider (null = all).
  // Approach / take-off / OFZ use the threshold elevation of their end, strip & transitional the centreline
  // elevation (interpolated between thresholds), inner horizontal & conical the aerodrome elevation.
  function olsR(P, rw, allow) {
    let h = Infinity, name = null, key = null;
    olsCand(P, rw, (hh, n, k) => { if (allow && !allow.has(k)) return; if (hh < h) { h = hh; name = n; key = k; } });
    return h === Infinity ? null : { h, name, key };
  }
  // Every surface of one runway at P: c(height, name, key) per candidate
  function olsCand(P, rw, c) {
    const p = olsP();
    const [s, dd] = sd(P, rw), d = Math.abs(dd), E = state.E, L = rw.L, IH = E + 45;
    const Ecl = rw.eA + (rw.eB - rw.eA) * Math.max(0, Math.min(1, s / L));
    if (s >= -60 && s <= L + 60 && d <= p.strip) c(Ecl, 'Runway strip', 'strip');
    const ends = [{ u: -60 - s, ap: rw.nameA, to: rw.nameB, Et: rw.eA, cwy: rw.cwyA },
                  { u: s - (L + 60), ap: rw.nameB, to: rw.nameA, Et: rw.eB, cwy: rw.cwyB }];
    for (const e of ends) { const u = e.u, Et = e.Et;
      if (u >= 0 && u <= p.appL) {
        const w = p.appW + 0.15 * u, h1 = p.app1 * p.app1s;
        if (d <= w) { const ha = u <= p.app1 ? Et + p.app1s * u : u <= p.app1 + p.app2 ? Et + h1 + p.app2s * (u - p.app1) : Et + h1 + p.app2 * p.app2s; c(ha, 'Approach RWY ' + e.ap, 'approach'); }
        if (u <= p.app1 && d > w) { const ht = Et + p.app1s * u + p.trans * (d - w); if (ht <= IH) c(ht, 'Transitional', 'transitional'); }
        if (state.ofz) {
          if (u <= 900 && d <= 60) c(Et + 0.02 * u, 'Inner approach RWY ' + e.ap, 'innerapp');
          if (u <= 900 && d > 60) { const ht = Et + 0.02 * u + 0.333 * (d - 60); if (ht <= IH) c(ht, 'Inner transitional', 'innertrans'); }
        }
      }
      const ut = u + 60 - Math.max(60, e.cwy);
      if (ut >= 0 && ut <= p.tocL) { const wt = Math.min(p.tocW + p.tocDiv * ut, p.tocWmax); if (d <= wt) c(Et + p.tocS * ut, 'Take-off climb RWY ' + e.to, 'takeoff'); }
      if (state.ofz) { const v = -u - 60 - 1800; if (v >= 0) { const wb = 60 + 0.10 * v; if (d <= wb) c(Et + 0.0333 * v, 'Balked landing RWY ' + e.ap, 'balked'); } }
    }
    if (s >= -60 && s <= L + 60 && d > p.strip) { const ht = Ecl + p.trans * (d - p.strip); if (ht <= IH) c(ht, 'Transitional', 'transitional'); }
    if (state.ofz && s >= -60 && s <= L + 60 && d > 60) { const ht = Ecl + 0.333 * (d - 60); if (ht <= IH) c(ht, 'Inner transitional', 'innertrans'); }
    const S1 = Wp(rw, -60, 0), S2 = Wp(rw, L + 60, 0);
    const r = distSeg(P[0], P[1], S1[0], S1[1], S2[0], S2[1]);
    if (r <= p.ihR) c(IH, 'Inner horizontal', 'ih'); else if (r <= p.ihR + p.con / 0.05) c(IH + 0.05 * (r - p.ihR), 'Conical', 'conical');
  }
  // Each surface on its own (min over the included runways): { key: height } — for drawing full surfaces, not just the governing one
  function olsAll(P, rws) { const o = {};
    for (const rw of rws) { if (!rw.on) continue; olsCand(P, rw, (hh, n, k) => { if (!(k in o) || hh < o[k]) o[k] = hh; }); }
    // With several runways the inner horizontal is their union: the conical starts at its outer edge, so a runway's
    // conical must not show inside another runway's inner horizontal
    if ('ih' in o) delete o.conical;
    return o; }
  // Combined OLS = minimum over the included runways
  function ols(P, rws, allow) { let best = null;
    for (const rw of rws) { if (!rw.on) continue; const r = olsR(P, rw, allow); if (r && (!best || r.h < best.h)) best = r; }
    return best; }

  // ---------- DEM ----------
  function demz(ap) { if (!ap.dem) return null;
    if (!ap._demz) { const bin = atob(ap.dem.z), n = bin.length >> 1, a = new Int16Array(n);
      for (let i = 0; i < n; i++) a[i] = ((bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) << 16) >> 16;
      ap._demz = a; }
    return ap._demz; }
  function demAt(x, y) { const D = AP.dem; if (!D) return null; const Z = demz(AP);
    const fx = (x - D.x0) / D.dx, fy = (y - D.y0) / D.dy, i = Math.floor(fx), j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= D.nx - 1 || j >= D.ny - 1) return null;
    const tx = fx - i, ty = fy - j, k = j * D.nx + i;
    return (Z[k] * (1 - tx) * (1 - ty) + Z[k + 1] * tx * (1 - ty) + Z[k + D.nx] * (1 - tx) * ty + Z[k + D.nx + 1] * tx * ty) * D.s; }
  async function loadFileTerrain() {
    if (!AP || AP.dem || AP._demLoading || AP._demFailed || !AP.demFile) return;
    const ap = AP, id = APID; ap._demLoading = true; emit();
    try { const r = await fetch('/' + ap.demFile.url); if (!r.ok) throw 0;
      const z = new Int16Array(await r.arrayBuffer()); if (z.length !== ap.demFile.nx * ap.demFile.ny) throw 0;
      ap._demz = z; ap.dem = ap.demFile; }
    catch (e) { ap._demFailed = true; }
    finally { ap._demLoading = false; if (APID === id) { scheduleSync(); emit(); } }
  }
  async function loadOnlineTerrain() {
    if (!AP || AP.dem || AP._demLoading || AP._demFailed) return;
    const ap = AP, id = APID; ap._demLoading = true; emit();
    try {
      let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
      ap.rwys.forEach(r => { for (const ll of [r.llA, r.llB]) { const p = LL(ap, ll);
        xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); } });
      const M = 16500; xmin -= M; xmax += M; ymin -= M; ymax += M;
      const [kx, ky] = ap._k, [la0, lo0] = ap.osm.origin, z = 12;
      const latMin = la0 + ymin / ky, latMax = la0 + ymax / ky, lonMin = lo0 + xmin / kx, lonMax = lo0 + xmax / kx;
      const tx0 = Math.floor(lon2tx(lonMin, z)), tx1 = Math.floor(lon2tx(lonMax, z)), ty0 = Math.floor(lat2ty(latMax, z)), ty1 = Math.floor(lat2ty(latMin, z));
      const tiles = new Map(), jobs = [];
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        jobs.push(fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`)
          .then(r => { if (!r.ok) throw 0; return r.blob(); }).then(b => createImageBitmap(b))
          .then(bm => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.drawImage(bm, 0, 0);
            tiles.set(tx + '/' + ty, g.getImageData(0, 0, 256, 256).data); }).catch(() => {}));
      }
      await Promise.all(jobs);
      if (!tiles.size) throw new Error('no tiles');
      const step = 60, nx = Math.ceil((xmax - xmin) / step) + 1, ny = Math.ceil((ymax - ymin) / step) + 1;
      const zz = new Int16Array(nx * ny); let emax = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const lat = la0 + (ymin + j * step) / ky, lon = lo0 + (xmin + i * step) / kx, ftx = lon2tx(lon, z), fty = lat2ty(lat, z);
        const d = tiles.get(Math.floor(ftx) + '/' + Math.floor(fty)); let e = 0;
        if (d) { const px2 = Math.min(255, Math.floor((ftx - Math.floor(ftx)) * 256)), py2 = Math.min(255, Math.floor((fty - Math.floor(fty)) * 256));
          const k = (py2 * 256 + px2) * 4; e = (d[k] * 256 + d[k + 1] + d[k + 2] / 256) - 32768; }
        e = Math.max(-300, Math.min(3200, e)); if (e > emax) emax = e; zz[j * nx + i] = Math.round(e * 10);
      }
      ap.dem = { x0: xmin, y0: ymin, dx: step, dy: step, nx, ny, s: 0.1, zmax: Math.max(120, Math.round(emax)), src: 'AWS Terrain Tiles (terrarium z12, ~30 m) — Mapzen/USGS/SRTM composite' };
      ap._demz = zz;
    } catch (e) { ap._demFailed = true; }
    finally { ap._demLoading = false; if (APID === id) { scheduleSync(); emit(); } }
  }

  // ---------- background tiles ----------
  const tileCache = new Map();
  function tileGet(prov, z, x, y) { const key = prov + '|' + z + '/' + x + '/' + y; let t = tileCache.get(key);
    if (t) return t.ok ? t.img : null;
    const img = new Image(); img.crossOrigin = 'anonymous'; t = { img, ok: false }; tileCache.set(key, t);
    img.onload = () => { t.ok = true; scheduleSync(); }; img.src = TILE_PROV[prov].url(z, x, y); return null; }

  // Terrain penetration colour [r,g,b,alpha] or null
  function penColor(P, z, rwsEx, rwsExt) {
    if (scen() === 'cmp') { const a = ols(P, rwsEx), b = ols(P, rwsExt); const pa = a ? z - a.h : 0, pb = b ? z - b.h : 0;
      if (pa > 0 && pb > 0) return [178, 60, 60, .5]; if (pb > 0) return [123, 31, 162, .6]; if (pa > 0) return [63, 143, 82, .5]; return null; }
    const r = ols(P, scen() === 'ex' ? rwsEx : rwsExt); if (!r) return null; const p = z - r.h; if (p <= 0) return null;
    const c = rampG(p / 80, P_ST); return [c[0], c[1], c[2], .45 + Math.min(.3, p / 150)]; }
  const bH = b => b.h ? b.h : (b.t ? 0 : state.bldH);
  const bTag = b => (b.t ? TAG[b.t] || b.t : 'Building') + ((b.est || !b.h) ? ' (assumed height)' : '');

  // ---------- airport data ----------
  function loadOsm(id) {
    return _osmP[id] || (_osmP[id] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = `/data/osm_${id}.js`;
      s.onload = () => { // the data files declare top-level consts; hand them over through window
        const t = document.createElement('script');
        t.text = `window.__olsOsm=OSM_${id}; window.__olsDem=(typeof DEM_${id}!=='undefined')?DEM_${id}:null;`;
        document.head.appendChild(t); t.remove();
        const ap = AIRPORTS[id]; ap.osm = window.__olsOsm; if (window.__olsDem) ap.dem = window.__olsDem;
        if (ap.osm) res(); else { delete _osmP[id]; rej(); } };
      s.onerror = () => { delete _osmP[id]; rej(); };
      document.head.appendChild(s); }));
  }
  function switchAirport(id) {
    const ap = AIRPORTS[id]; if (!ap) return;
    APID = id; if (cb.onHover) cb.onHover(null);
    if (!ap.osm) { ap._failed = false; emit();
      loadOsm(id).then(() => { if (APID === id) switchAirport(id); }, () => { if (APID === id) { ap._failed = true; emit(); } });
      return; }
    AP = ap; initAp(AP); state.E = AP.E;
    state.extA = AP.rwys.map(() => 0); state.extB = AP.rwys.map(() => 0); state.par = []; state.showEx = false;
    if (AP.ext) (AP.ext.end === 'A' ? state.extA : state.extB)[AP.ext.ri] = AP.ext.len;   // optional registry preset extension
    if (!AP.dem) { if (AP.demFile) loadFileTerrain(); else loadOnlineTerrain(); }
    K.s = K.o = K.g = K.t = K.b = K.p = null; sync(); fit('all'); emit();
  }
  function snapshot() {
    const ap = APID && AIRPORTS[APID];
    return { apId: APID, loading: !!ap && !ap.osm && !ap._failed, failed: !!ap && !!ap._failed, pending: texPending,
      ap: AP ? { procs: (PROCEDURES[APID] || []).map(p => ({ id: p.id, name: p.name, color: p.color, rwy: p.rwy, ops: p.ops || null })), name: AP.name, sub: AP.sub, E: AP.E, code: AP.code || 4, origin: AP.osm.origin, ext: AP.ext || null, assume: AP.assume,
        rwys: AP.rwys.map((r, i) => ({ id: r.id, len: r.len, on: AP._on[i], nameA: r.nameA, nameB: r.nameB })),
        dem: AP.dem ? 'ok' : AP._demLoading ? 'loading' : AP._demFailed ? 'failed' : 'none', demSrc: AP.dem && AP.dem.src } : null,
      state: { ...state, surf: [...state.surf], extA: [...state.extA], extB: [...state.extB], par: state.par.map(p => ({ ...p })), scen: scen() },
      noise: noiseInfo() };
  }
  const emit = () => cb.onStatus && cb.onStatus(snapshot());

  // ---------- 3D ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0d10);
  const camera = new THREE.PerspectiveCamera(50, 1, 20, 150000);
  const ctl = new OrbitControls(camera, canvas); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.5; ctl.maxPolarAngle = Math.PI / 2 - 0.03;
  // map-style mouse: left drag grabs and slides the ground, middle (or right) drag orbits, wheel zooms; Shift + left also orbits
  ctl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE }; ctl.screenSpacePanning = false;
  ctl.dampingFactor = 0.25; ctl.panSpeed = 1.4;   // follow the pointer closely (default damping 0.05 trails it noticeably)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2d33, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-1, 0.6, -1); scene.add(sun);   // low sun from the north-west, like a hillshade
  const G = new THREE.Group(); G.scale.y = state.zex; scene.add(G);          // metres. ENU (x,y,z) → three (x, z, -y). G.scale.y = vertical exaggeration
  const L = { ground: null, groundEx: null, surf: [], grid: [], obs: null, obsList: [], rwy: [], proc: [] };
  const K = {};
  let alive = true, texPending = false, syncQueued = false;
  const texCv = document.createElement('canvas'), ovCv = document.createElement('canvas'), hsCv = document.createElement('canvas');
  // Detail patch: imagery 2 km around the runways (airport hiImg overrides the margin, 0 turns it off) at up to tile zoom 16
  // (~2 m/px, in at most 4096 px) in a texture of its own, which the ground shader uses inside that rectangle instead of the
  // airport-wide texture (~15 m/px).
  const nzCv = document.createElement('canvas');   // noise contour bands, airport-wide like ovCv
  const hiCv = document.createElement('canvas'), hiU = { hiMap: { value: null }, hiRect: { value: new THREE.Vector4() }, hiOn: { value: 0 } };
  let hiTex = null, hiAt = 0, hiTimer = 0, hiPending = false;
  const groundMat = () => { const m = new THREE.MeshLambertMaterial({ map: tex });
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, hiU);
      sh.vertexShader = 'uniform vec4 hiRect;\nvarying vec2 vHiUv;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvHiUv = vec2((position.x - hiRect.x) / (hiRect.z - hiRect.x), (-position.z - hiRect.y) / (hiRect.w - hiRect.y));');
      sh.fragmentShader = 'uniform sampler2D hiMap;\nuniform float hiOn;\nvarying vec2 vHiUv;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          if ( hiOn > 0.5 && all( greaterThan( vHiUv, vec2( 0.0 ) ) ) && all( lessThan( vHiUv, vec2( 1.0 ) ) ) ) sampledDiffuseColor = texture2D( hiMap, vHiUv );
          diffuseColor *= sampledDiffuseColor;
        #endif`); };
    return m; };
  let tex = null;   // CanvasTexture, recreated on every texture rebuild (re-uploading a resized canvas into one texture proved unreliable)

  function clear(list) { list.forEach(m => { G.remove(m); m.geometry.dispose(); }); list.length = 0; }
  function extent(rws) { let x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9, any = false;
    rws.forEach(rw => { if (!rw.on) return; any = true;
      for (const s of [-15660, rw.L + 15660]) for (const d of [-6300, 6300]) { const P = Wp(rw, s, d);
        x1 = Math.min(x1, P[0]); x2 = Math.max(x2, P[0]); y1 = Math.min(y1, P[1]); y2 = Math.max(y2, P[1]); } });
    return any ? { x1, x2, y1, y2 } : { x1: -6000, x2: 6000, y1: -6000, y2: 6000 }; }
  // One grid pass → per-surface height arrays (NaN where the surface does not exist), then a mesh per surface.
  // Surfaces are drawn whole, so the approach and take-off climb rise through the inner horizontal and conical.
  function sampleGrid(ex, step, rws) {
    const nx = Math.floor((ex.x2 - ex.x1) / step) + 1, ny = Math.floor((ex.y2 - ex.y1) / step) + 1, H = {};
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const all = olsAll([ex.x1 + i * step, ex.y1 + j * step], rws);
      for (const k in all) (H[k] || (H[k] = new Float32Array(nx * ny).fill(NaN)))[j * nx + i] = all[k]; }
    return { nx, ny, H }; }
  // Grid cells wholly on the surface are two triangles. A cell the surface's edge runs through keeps only its part on the
  // surface: on each cell side where the surface starts or stops, the edge point is found by bisection (≈8 cm), and the
  // corners on the surface plus those points make the cell's polygon — so the surface ends on a line, not in 80 m steps.
  function meshFrom(ex, step, nx, ny, h, color, key, rws) {
    const pos = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; pos.push(ex.x1 + i * step, isNaN(h[k]) ? 0 : h[k], -(ex.y1 + j * step)); }
    const at = (x, y) => olsAll([x, y], rws)[key], cut = new Map();
    const edgePt = (p, q) => { const id = p < q ? p + ',' + q : q + ',' + p; if (cut.has(id)) return cut.get(id);   // p on the surface, q off it
      let x0 = ex.x1 + (p % nx) * step, y0 = ex.y1 + Math.floor(p / nx) * step, x1 = ex.x1 + (q % nx) * step, y1 = ex.y1 + Math.floor(q / nx) * step, hv = h[p];
      for (let n = 0; n < 10; n++) { const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, v = at(xm, ym); if (v === undefined) { x1 = xm; y1 = ym; } else { x0 = xm; y0 = ym; hv = v; } }
      const v = pos.length / 3; pos.push(x0, hv, -y0); cut.set(id, v); return v; };
    const idx = []; for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      const on = [a, b, d, c].map(v => !isNaN(h[v])), n = on.filter(Boolean).length; if (!n) continue;
      if (n === 4) { idx.push(a, c, b, b, c, d); continue; }
      const ring = [a, b, d, c], poly = [];                                  // walk the cell's corners in order
      for (let e = 0; e < 4; e++) { const p = ring[e], q = ring[(e + 1) % 4], op = on[e], oq = on[(e + 1) % 4];
        if (op) poly.push(p); if (op !== oq) poly.push(op ? edgePt(p, q) : edgePt(q, p)); }
      for (let t = 1; t < poly.length - 1; t++) idx.push(poly[0], poly[t + 1], poly[t]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false })); }
  function linesFrom(ex, step, nx, ny, h, stride) {
    const v = [], at = (i, j) => h[j * nx + i];
    const seg = (i1, j1, i2, j2) => { const a = at(i1, j1), b = at(i2, j2); if (isNaN(a) || isNaN(b)) return;
      v.push(ex.x1 + i1 * step, a, -(ex.y1 + j1 * step), ex.x1 + i2 * step, b, -(ex.y1 + j2 * step)); };
    for (let j = 0; j < ny; j += stride) for (let i = 0; i < nx; i += stride) { if (i + stride < nx) seg(i, j, i + stride, j); if (j + stride < ny) seg(i, j, i, j + stride); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, depthWrite: false })); }

  // Transitional surfaces are planar ribbons: along the strip edge (inner d = dIn at the centreline elevation) and along
  // each approach edge (inner d = dIn + div·u at the approach height), rising at `slope` until they meet the inner horizontal.
  // Built analytically (two quads per side per piece), so their edges are exact lines rather than grid steps.
  function transGeom(rws, dIn, slope, uMax, div) {
    const V = [], E = [], IH = state.E + 45;
    const quad = (rw, a, b, c, d) => { const q = [a, b, c, d].map(([s, dd, h]) => { const P = Wp(rw, s, dd); return [P[0], h, -P[1]]; });
      V.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]); for (let i = 0; i < 4; i++) E.push(...q[i], ...q[(i + 1) % 4]); };
    for (const rw of rws) { if (!rw.on) continue; const L = rw.L;
      if (slope === 0) { quad(rw, [-60, -dIn, rw.eA], [L + 60, -dIn, rw.eB], [L + 60, dIn, rw.eB], [-60, dIn, rw.eA]); continue; }   // the strip itself
      for (const sg of [-1, 1]) {
        if (IH > rw.eA && IH > rw.eB) quad(rw, [-60, sg * dIn, rw.eA], [L + 60, sg * dIn, rw.eB], [L + 60, sg * (dIn + (IH - rw.eB) / slope), IH], [-60, sg * (dIn + (IH - rw.eA) / slope), IH]);
        for (const [s0, dir, Et] of [[-60, -1, rw.eA], [L + 60, 1, rw.eB]]) { const u1 = Math.min(uMax, (IH - Et) / 0.02); if (u1 <= 0) continue;
          const h1 = Et + 0.02 * u1, w1 = dIn + div * u1;
          quad(rw, [s0, sg * dIn, Et], [s0 + dir * u1, sg * w1, h1], [s0 + dir * u1, sg * (w1 + (IH - h1) / slope), IH], [s0, sg * (dIn + (IH - Et) / slope), IH]); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); g.computeVertexNormals();
    const e = new THREE.BufferGeometry(); e.setAttribute('position', new THREE.Float32BufferAttribute(E, 3));
    return [g, e]; }
  const TRANS = { strip: p => [p.strip, 0, 0, 0], transitional: p => [p.strip, p.trans, p.app1, 0.15], innertrans: () => [60, 0.333, 900, 0] };

  function buildSurfaces(rwsEx, rwsExt) {
    clear(L.surf); clear(L.grid);
    const sets = scen() === 'cmp' ? [[rwsEx, null], [rwsExt, 0xcc785c]] : [[scen() === 'ex' ? rwsEx : rwsExt, null]];
    for (const [rws, uni] of sets) {
      const ex = extent(rws), step = 80, { nx, ny, H } = sampleGrid(ex, step, rws);
      const lineMat = () => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, depthWrite: false });
      for (const k of state.surf) {
        if (TRANS[k]) { if (k === 'innertrans' && !state.ofz) continue;
          const [g, e] = transGeom(rws, ...TRANS[k](olsP()));
          const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: uni ?? COLOR[k], transparent: true, opacity: uni ? .3 : .5, side: THREE.DoubleSide, depthWrite: false }));
          G.add(m); L.surf.push(m); const gl = new THREE.LineSegments(e, lineMat()); G.add(gl); L.grid.push(gl); continue; }
        const h = H[k]; if (!h) continue;
        const m = meshFrom(ex, step, nx, ny, h, uni ?? COLOR[k], k, rws); if (uni) m.material.opacity = .3; G.add(m); L.surf.push(m);
        const gl = linesFrom(ex, step, nx, ny, h, 5); G.add(gl); L.grid.push(gl); } } }
  function buildGround() {
    if (L.ground) { G.remove(L.ground); L.ground.geometry.dispose(); }
    const D = AP.dem; let ex, nx, ny;
    if (D) { ex = { x1: D.x0, x2: D.x0 + (D.nx - 1.01) * D.dx, y1: D.y0, y2: D.y0 + (D.ny - 1.01) * D.dy }; const k = Math.max(1, Math.ceil(Math.max(D.nx, D.ny) / 640)); nx = Math.floor(D.nx / k); ny = Math.floor(D.ny / k); }
    else { ex = extent(frames(false)); nx = ny = 2; }
    const g = new THREE.PlaneGeometry(1, 1, nx - 1, ny - 1), p = g.attributes.position;   // row 0 = north (y2), matching the texture top
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = ex.x1 + (ex.x2 - ex.x1) * i / (nx - 1), y = ex.y2 - (ex.y2 - ex.y1) * j / (ny - 1);
      const z = D ? Math.max(0, demAt(x, y) ?? 0) : state.E; p.setXYZ(j * nx + i, x, z, -y); }
    g.computeVertexNormals();
    L.ground = new THREE.Mesh(g, groundMat()); L.groundEx = ex; G.add(L.ground); buildHillshade(); }
  // Hillshade from the DEM (sun NW, 40° up, relief ×2), multiplied into the ground texture so slopes read even at 1×.
  function buildHillshade() { const D = AP.dem, ex = L.groundEx; hsCv.width = hsCv.height = 0; if (!D) return;
    const W = 1024, H = Math.max(64, Math.round(W * (ex.y2 - ex.y1) / (ex.x2 - ex.x1))); hsCv.width = W; hsCv.height = H;
    const c = hsCv.getContext('2d'), img = c.createImageData(W, H), d = img.data, sx = (ex.x2 - ex.x1) / W, sy = (ex.y2 - ex.y1) / H, zf = 2;
    const az = 315 * Math.PI / 180, alt = 40 * Math.PI / 180, lx = Math.cos(alt) * Math.sin(az), ly = Math.cos(alt) * Math.cos(az), lz = Math.sin(alt);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = ex.x1 + (i + .5) * sx, y = ex.y2 - (j + .5) * sy, k = (j * W + i) * 4;
      const zl = demAt(x - sx, y), zr = demAt(x + sx, y), zu = demAt(x, y + sy), zd = demAt(x, y - sy); let b = 1;
      if (zl !== null && zr !== null && zu !== null && zd !== null) { const nx = -(zr - zl) / (2 * sx) * zf, ny = -(zu - zd) / (2 * sy) * zf, nl = Math.hypot(nx, ny, 1);
        b = Math.min(1, 0.45 + 0.75 * Math.max(0, (nx * lx + ny * ly + lz) / nl)); }
      d[k] = d[k + 1] = d[k + 2] = b * 255; d[k + 3] = 255; }
    c.putImageData(img, 0, 0); }
  function buildOverlay(rwsEx, rwsExt) { const ex = L.groundEx, W = 640, H = Math.max(64, Math.round(W * (ex.y2 - ex.y1) / (ex.x2 - ex.x1)));
    ovCv.width = W; ovCv.height = H; const oc = ovCv.getContext('2d'), img = oc.createImageData(W, H), d = img.data;
    if (state.pen && AP.dem) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const P = [ex.x1 + (ex.x2 - ex.x1) * (i + .5) / W, ex.y2 - (ex.y2 - ex.y1) * (j + .5) / H], z = demAt(P[0], P[1]); if (z === null) continue;
      const c = penColor(P, z, rwsEx, rwsExt); if (!c) continue; const k = (j * W + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = c[3] * 255; }
    oc.putImageData(img, 0, 0); }
  function buildBase() { const ex = L.groundEx, W = 2048, H = Math.max(256, Math.round(W * (ex.y2 - ex.y1) / (ex.x2 - ex.x1)));
    texCv.width = W; texCv.height = H; const tc = texCv.getContext('2d'); tc.fillStyle = '#2a2d33'; tc.fillRect(0, 0, W, H); texPending = false;
    if (state.base !== 'none') { const [kx, ky] = AP._k, [la0, lo0] = AP.osm.origin, mpp = (ex.x2 - ex.x1) / W;
      let z = Math.round(Math.log2(156543.03 * Math.cos(la0 * Math.PI / 180) / mpp)); z = Math.max(3, Math.min(TILE_PROV[state.base].max, z));
      const tx0 = Math.floor(lon2tx(lo0 + ex.x1 / kx, z)), tx1 = Math.floor(lon2tx(lo0 + ex.x2 / kx, z)), ty0 = Math.floor(lat2ty(la0 + ex.y2 / ky, z)), ty1 = Math.floor(lat2ty(la0 + ex.y1 / ky, z));
      for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) { const img = tileGet(state.base, z, tx, ty); if (!img) { texPending = true; continue; }
        const xa = (tx2lon(tx, z) - lo0) * kx, xb = (tx2lon(tx + 1, z) - lo0) * kx, yt = (ty2lat(ty, z) - la0) * ky, yb = (ty2lat(ty + 1, z) - la0) * ky;
        tc.drawImage(img, (xa - ex.x1) / mpp, (ex.y2 - yt) / mpp, (xb - xa) / mpp, (yt - yb) / mpp); }
      tc.fillStyle = `rgba(8,10,14,${FILM})`; tc.fillRect(0, 0, W, H); }
    if (hsCv.width) { tc.globalCompositeOperation = 'multiply'; tc.drawImage(hsCv, 0, 0, W, H); tc.globalCompositeOperation = 'source-over'; }
    tc.drawImage(ovCv, 0, 0, W, H); if (state.noise && nzCv.width) tc.drawImage(nzCv, 0, 0, W, H);
    if (tex) tex.dispose(); tex = new THREE.CanvasTexture(texCv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    if (L.ground) { L.ground.material.map = tex; L.ground.material.needsUpdate = true; }
    buildHi(); }
  function buildHi() { hiPending = false; const m = AP.hiImg ?? 2000; if (!m || state.base === 'none' || !L.groundEx) { hiU.hiOn.value = 0; return; }
    const now = performance.now(); if (now - hiAt < 700) { hiPending = true; clearTimeout(hiTimer); hiTimer = setTimeout(scheduleSync, 750); return; }   // tiles stream in: at most every 0.7 s
    hiAt = now; const ex0 = L.groundEx, ends = frames(false).flatMap(f => [f.A, f.B]);   // the runways' own box, not the OLS extent
    const r = { x1: Math.min(...ends.map(q => q[0])), x2: Math.max(...ends.map(q => q[0])), y1: Math.min(...ends.map(q => q[1])), y2: Math.max(...ends.map(q => q[1])) };
    const ex = { x1: Math.max(ex0.x1, r.x1 - m), x2: Math.min(ex0.x2, r.x2 + m), y1: Math.max(ex0.y1, r.y1 - m), y2: Math.min(ex0.y2, r.y2 + m) };
    const [kx, ky] = AP._k, [la0, lo0] = AP.osm.origin, m0 = 156543.03 * Math.cos(la0 * Math.PI / 180);
    const mpp = Math.max(m0 / 2 ** 16, Math.max(ex.x2 - ex.x1, ex.y2 - ex.y1) / 4096);   // large airports: coarser, fewer tiles
    const z = Math.min(TILE_PROV[state.base].max, 16, Math.round(Math.log2(m0 / mpp)));
    const W = Math.round((ex.x2 - ex.x1) / mpp), H = Math.round((ex.y2 - ex.y1) / mpp); hiCv.width = W; hiCv.height = H;
    const tc = hiCv.getContext('2d'); tc.fillStyle = '#2a2d33'; tc.fillRect(0, 0, W, H); let missing = 0;
    const tx0 = Math.floor(lon2tx(lo0 + ex.x1 / kx, z)), tx1 = Math.floor(lon2tx(lo0 + ex.x2 / kx, z)), ty0 = Math.floor(lat2ty(la0 + ex.y2 / ky, z)), ty1 = Math.floor(lat2ty(la0 + ex.y1 / ky, z));
    for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) { const img = tileGet(state.base, z, tx, ty); if (!img) { missing++; continue; }
      const xa = (tx2lon(tx, z) - lo0) * kx, xb = (tx2lon(tx + 1, z) - lo0) * kx, yt = (ty2lat(ty, z) - la0) * ky, yb = (ty2lat(ty + 1, z) - la0) * ky;
      tc.drawImage(img, (xa - ex.x1) / mpp, (ex.y2 - yt) / mpp, (xb - xa) / mpp, (yt - yb) / mpp); }
    tc.fillStyle = `rgba(8,10,14,${FILM})`; tc.fillRect(0, 0, W, H);
    // the same hillshade and penetration overlay as the airport-wide texture, cut to the patch
    const crop = (cv, op) => { if (!cv.width) return; const sx = cv.width / (ex0.x2 - ex0.x1), sy = cv.height / (ex0.y2 - ex0.y1);
      tc.globalCompositeOperation = op; tc.drawImage(cv, (ex.x1 - ex0.x1) * sx, (ex0.y2 - ex.y2) * sy, (ex.x2 - ex.x1) * sx, (ex.y2 - ex.y1) * sy, 0, 0, W, H); tc.globalCompositeOperation = 'source-over'; };
    crop(hsCv, 'multiply'); crop(ovCv, 'source-over'); if (state.noise && nzCv.width) crop(nzCv, 'source-over');
    if (hiTex) hiTex.dispose(); hiTex = new THREE.CanvasTexture(hiCv); hiTex.colorSpace = THREE.SRGBColorSpace; hiTex.anisotropy = 8;
    hiU.hiMap.value = hiTex; hiU.hiRect.value.set(ex.x1, ex.y1, ex.x2, ex.y2); hiU.hiOn.value = 1;
    if (missing) { hiPending = true; clearTimeout(hiTimer); hiTimer = setTimeout(scheduleSync, 750); } }
  function buildObstacles(rws) {
    if (L.obs) { G.remove(L.obs); L.obs.geometry.dispose(); L.obs = null; } L.obsList = [];
    if (!state.obs) return;
    const geos = [], tmp = new THREE.Color();
    (AP.osm.bld || []).forEach(b => { const h = bH(b); if (!h) return; let cx = 0, cy = 0; b.p.forEach(q => { cx += q[0]; cy += q[1]; }); cx /= b.p.length; cy /= b.p.length;
      const g0 = demAt(cx, cy), g = g0 === null ? state.E : g0, r = ols([cx, cy], rws), top = g + h, pen = r ? top - r.h : null;
      let geo;
      try {
        if (b.t || b.p.length < 3) { geo = new THREE.BoxGeometry(10, h, 10).toNonIndexed(); geo.translate(cx, g + h / 2, -cy); }
        else { geo = new THREE.ExtrudeGeometry(new THREE.Shape(b.p.map(q => new THREE.Vector2(q[0], q[1]))), { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, g, 0); }
      } catch (e) { return; }
      const n = geo.attributes.position.count, col = new Float32Array(n * 3), bid = new Float32Array(n).fill(L.obsList.length);
      tmp.setHex(pen > 0 ? 0xe0443e : 0xb8b2a8); for (let i = 0; i < n; i++) { col[3 * i] = tmp.r; col[3 * i + 1] = tmp.g; col[3 * i + 2] = tmp.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('bid', new THREE.BufferAttribute(bid, 1));
      L.obsList.push({ b, h, g, top, r, pen }); geos.push(geo); });
    if (!geos.length) return;
    L.obs = new THREE.Mesh(mergeGeometries(geos, false), new THREE.MeshLambertMaterial({ vertexColors: true })); G.add(L.obs); }
  function buildRunways(rwsEx, rwsExt) { clear(L.rwy);
    const strip = (a, b, eA, eB, color) => { const n = 8, g = new THREE.PlaneGeometry(1, 1, n, 1), p = g.attributes.position;
      const U = [b[0] - a[0], b[1] - a[1]], Lb = Math.hypot(U[0], U[1]); U[0] /= Lb; U[1] /= Lb; const N = [-U[1], U[0]];
      for (let j = 0; j < 2; j++) for (let i = 0; i <= n; i++) { const t = i / n, d = (j ? -1 : 1) * 22.5, x = a[0] + U[0] * Lb * t + N[0] * d, y = a[1] + U[1] * Lb * t + N[1] * d;
        const z = eA + (eB - eA) * t, g0 = demAt(x, y); p.setXYZ(j * (n + 1) + i, x, Math.max(z, g0 ?? z) + 1.5, -y); }
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); G.add(m); L.rwy.push(m); };
    rwsEx.forEach((rw, i) => { const rwE = rwsExt[i];
      if (scen() !== 'ex') { if (state.extA[i] > 0) strip(rwE.A, rw.baseA, rw.eA, rw.eA, 0xe8a55a); if (state.extB[i] > 0) strip(rw.baseB, rwE.B, rw.eB, rw.eB, 0xe8a55a); }
      strip(rw.baseA, rw.baseB, rw.eA, rw.eB, rw.on ? 0xe8e4dc : 0x6b675f); });
    if (scen() !== 'ex') rwsExt.slice(rwsEx.length).forEach(rw => strip(rw.A, rw.B, rw.eA, rw.eB, 0xe8a55a)); }   // added parallel runways

  // Instrument procedures (src/data/procedures.js): each leg a straight tube at its chart altitude, a faint curtain down to
  // the ground so the height over terrain reads, and a labelled marker per fix. Labels live in the scene (not G) so the
  // vertical exaggeration does not stretch them.
  // With a runway extension (scenario), points on that runway's extended centreline move with the nearer runway end:
  // the straight-in course and threshold with the landing end, the 500 ft missed-approach turn with the far end. IAFs and
  // fixes off the centreline (DME turn points, holding fixes) stay where they are published.
  function procShift(pr) { const i = AP.rwys.findIndex(r => r.nameA === pr.rwy || r.nameB === pr.rwy); if (i < 0) return P => P;
    const rw = frames(scen() !== 'ex')[i], dA = [rw.A[0] - rw.baseA[0], rw.A[1] - rw.baseA[1]], dB = [rw.B[0] - rw.baseB[0], rw.B[1] - rw.baseB[1]];
    return P => { const px = P[0] - rw.baseA[0], py = P[1] - rw.baseA[1], s = px * rw.U[0] + py * rw.U[1], d = px * rw.N[0] + py * rw.N[1];
      if (Math.abs(d) > 150) return P; const m = s < rw.baseL / 2 ? dA : dB; return [P[0] + m[0], P[1] + m[1]]; }; }
  function buildProcs() {
    L.proc.forEach(o => { o.parent.remove(o); o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); L.proc.length = 0;
    const procs = (PROCEDURES[APID] || []).filter(p => state.proc.includes(p.id)); if (!procs.length) return;
    const add = (o, parent = G) => { parent.add(o); L.proc.push(o); }, zex = G.scale.y, seen = new Set();
    for (const pr of procs) for (const path of pr.paths) { const mv = procShift(pr);
      const pts = path.legs.map(([, lat, lon, ft], i) => { const P = LL(AP, [lat, lon]), [x, y] = i || path.ma ? mv(P) : P; return new THREE.Vector3(x, ft * 0.3048, -y); });
      const curve = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) curve.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64 * (pts.length - 1), 22, 6, false),
        new THREE.MeshBasicMaterial({ color: path.ma ? 0xf5a524 : pr.color })));
      const V = [], D = [], gz = v => Math.max(0, demAt(v.x, -v.z) ?? 0);
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], ga = gz(a), gb = gz(b);
        V.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, gb, b.z, a.x, a.y, a.z, b.x, gb, b.z, a.x, ga, a.z); }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(V, 3));
      add(new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: path.ma ? 0xf5a524 : pr.color, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false })));
      path.legs.forEach(([name, lat, lon, ft, flag], i) => { const v = pts[i]; D.push(v.x, v.y, v.z, v.x, gz(v), v.z);
        const key = name + lat + lon; if (seen.has(key)) return; seen.add(key);
        const cv = document.createElement('canvas'); cv.width = 320; cv.height = 96; const c = cv.getContext('2d');
        c.font = '600 34px system-ui, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(name, 160, 40);
        c.font = '28px ui-monospace, monospace'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText((flag === 'ap' ? '≈ ' : '') + ft.toLocaleString('en') + ' ft', 160, 80);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, sizeAttenuation: false }));
        sp.scale.set(.1, .03, 1); sp.center.set(.5, -.4); sp.position.set(v.x, v.y * zex, v.z); add(sp, scene);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(55, 12, 8), new THREE.MeshBasicMaterial({ color: flag === 'ap' ? 0x9aa0a6 : 0xffffff }));
        dot.position.copy(v); dot.scale.y = 1 / zex; add(dot); });
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(D, 3));
      add(new THREE.LineSegments(dg, new THREE.LineBasicMaterial({ color: path.ma ? 0xf5a524 : pr.color, transparent: true, opacity: .45 }))); }
    addPlanes(procs, add); }

  // ---------- aircraft on the shown procedures: one flies the approach and lands, one takes off and flies the missed-approach
  // route (there is no SID data). Times are sped up (AIR m/s ≈ 12× an approach speed); each loops with a short pause.
  const AIR = 875, ROLL = 38, planes = [], planeMat = new Map();
  let planeGeo = null;
  const finMat = color => { if (!planeMat.has(color)) planeMat.set(color, new THREE.MeshLambertMaterial({ color })); return planeMat.get(color); };
  function planeModel(color) {   // nose +Z, ~70 m span: about the procedure line's width
    if (!planeGeo) planeGeo = { body: new THREE.MeshLambertMaterial({ color: 0xf4f6f8 }),
      fus: new THREE.CylinderGeometry(4, 3, 58, 12).rotateX(Math.PI / 2), nose: new THREE.ConeGeometry(4, 11, 12).rotateX(Math.PI / 2).translate(0, 0, 34.5),
      wing: new THREE.BoxGeometry(70, 1.6, 11).translate(0, -1.5, 3), stab: new THREE.BoxGeometry(26, 1, 6).translate(0, 1, -25),
      fin: new THREE.BoxGeometry(1, 13, 8).translate(0, 7.5, -24) };
    finMat(color);
    const { body, fus, nose, wing, stab, fin } = planeGeo, g = new THREE.Group();
    for (const geo of [fus, nose, wing, stab]) g.add(new THREE.Mesh(geo, body));
    g.add(new THREE.Mesh(fin, planeMat.get(color))); return g; }
  // nodes: [x, metres AMSL, z, speed m/s, ground?]; the segment time uses the mean of its end speeds
  function track(nodes) { const t = [0];
    for (let i = 1; i < nodes.length; i++) { const a = nodes[i - 1], b = nodes[i];
      t.push(t[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / ((a[3] + b[3]) / 2)); }
    return { nodes, t, T: t[t.length - 1] }; }
  // ops: 'arr' = arrivals only, 'dep' = departures only (the runway's role, e.g. Incheon). The shown procedures of such a
  // runway share one stream that takes its ends in turn (both ends shown → the direction alternates): arrivals land on the
  // procedure's end, departures take off from it and fly its missed-approach route. Departures follow each other as soon
  // as the runway is clear, arrivals 3 s after the previous one has gone. Without ops, one lands and one takes off.
  function addPlanes(procs, add) { planes.length = 0;
    const runs = new Map();                       // runway index + role → launches of the stream
    procs.forEach((pr, k) => { const ri = AP.rwys.findIndex(r => r.nameA === pr.rwy || r.nameB === pr.rwy); if (ri < 0) return;
      const rw = frames(scen() !== 'ex')[ri], atA = rw.nameA === pr.rwy, P0 = atA ? rw.A : rw.B, e = atA ? rw.eA : rw.eB,
        dir = atA ? rw.U : [-rw.U[0], -rw.U[1]], mv = procShift(pr);
      // s metres from the threshold along the runway, on the terrain where it sits above the runway elevation
      const on = s => { const x = P0[0] + dir[0] * s, y = P0[1] + dir[1] * s; return [x, Math.max(e, demAt(x, y) ?? e), -y]; };
      const legPts = (path, from = 0) => path.legs.slice(from).map(([, lat, lon, ft], i) => { const P = LL(AP, [lat, lon]), [x, y] = i + from || path.ma ? mv(P) : P;
        return [x, ft * 0.3048, -y, AIR, false]; });
      const app = pr.paths.find(p => !p.ma), ma = pr.paths.find(p => p.ma);
      let land = null, dep = null;
      if (app) { const n = legPts(app); n.push([...on(300), AIR, true]);            // touchdown 300 m past the threshold, then roll out
        for (let j = 1; j <= 6; j++) n.push([...on(300 + 250 * j), AIR + (ROLL - AIR) * j / 6, true]); land = track(n); }
      if (ma) { const n = []; for (let j = 0; j <= 6; j++) n.push([...on(300 * j), ROLL + (AIR - ROLL) * j / 6, true]);   // roll 1 800 m, lift off
        dep = track([...n, ...legPts(ma, 1)]); }
      const after = tr => ({ tr, gap: tr.T + 3, color: pr.color });                   // next one 3 s after this one is gone
      const clear = tr => ({ tr, gap: tr.t[6] + Math.max(0, rw.L - 1800) / AIR + 1, color: pr.color });   // next one 1 s after this one passes the runway end
      if (pr.ops === 'arr' || pr.ops === 'dep') { const key = ri + pr.ops, l = pr.ops === 'arr' ? land && after(land) : dep && clear(dep);
        if (l) { if (!runs.has(key)) runs.set(key, { seq: [], off: k * 7 }); runs.get(key).seq.push(l); } }
      else { if (land) fly([after(land)], k * 23); if (dep) fly([after(dep)], k * 23 + 11); } });
    for (const { seq, off } of runs.values()) fly(seq, off);
    // a stream: launches in turn, each `gap` s after the previous one; enough aircraft for the launches in the air at once
    function fly(seq, off) { const n = Math.ceil(Math.max(...seq.map(q => q.tr.T)) / Math.min(...seq.map(q => q.gap))) + 1;
      const pool = Array.from({ length: n }, () => { const o = planeModel(seq[0].color); add(o, scene); return o; }); planes.push({ pool, seq, off }); } }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  // Line-sized up close, growing with the camera distance (span ≈ 5 % of it) so it stays visible from the overview.
  // While smaller than the 22 m tube it rides on top of it; larger, it flies on the line. On the ground it sits on its wheels.
  function flyPlanes(now) { if (!planes.length) return; const zex = G.scale.y;
    for (const p of planes) { const cycle = p.seq.reduce((n, q) => n + q.gap, 0), t0 = (now / 1000 + p.off) % cycle;
      const live = [];                                     // launches still in the air: this cycle's and earlier cycles'
      for (let c = 0; c * cycle <= Math.max(...p.seq.map(q => q.tr.T)) + cycle; c++)
        for (let j = 0, start = 0; j < p.seq.length; start += p.seq[j].gap, j++) { const age = t0 - start + c * cycle;
          if (age >= 0 && age < p.seq[j].tr.T) live.push([p.seq[j].tr, age, p.seq[j].color]); }
      p.live = live.length;
      p.pool.forEach((o, n) => { o.visible = n < live.length; if (o.visible) { o.children[4].material = finMat(live[n][2]); flyOne(o, live[n][0], live[n][1], zex); } }); } }
  function flyOne(o, tr, tt, zex) { const { nodes, t } = tr;
      let i = 1; while (i < t.length - 1 && t[i] < tt) i++;
      const f = Math.min(1, (tt - t[i - 1]) / (t[i] - t[i - 1] || 1)), a = nodes[i - 1], b = nodes[i];
      _a.set(a[0], a[1] * zex, a[2]); _b.set(b[0], b[1] * zex, b[2]); o.position.lerpVectors(_a, _b, f);
      const k = Math.max(1, 0.05 * camera.position.distanceTo(o.position) / 70), lift = (n) => (n[4] ? 5 * k : Math.max(0, 22 * zex + 5 - 4 * k));
      o.scale.setScalar(k); o.position.y += lift(a) + (lift(b) - lift(a)) * f; _b.y += lift(b);
      if (o.position.distanceToSquared(_b) > 1) o.lookAt(_b); }

  // ---------- noise (Lden) ----------
  // Tracks: straight along each runway end's extended centreline; arrivals from the touchdown point (THR + 291 m),
  // departures from the start of roll at the threshold. Runway roles from the procedures' ops (Incheon: RWY 1/3
  // departures, 2/4 arrivals); other runways carry both. Computed in small steps so the page stays responsive.
  const NZ = { key: null, grid: null, busy: false, progress: 0, bands: null, run: 0 };
  const noiseCfg = () => { const t = NOISE_TRAFFIC[APID]; return t ? { ...t, ...(state.noiseCfg || {}) } : null; };
  const noiseBands = () => NOISE_BANDS[countryOf() === 'Korea' ? 'kr' : 'intl'];
  const countryOf = () => (AP.sub || '').split(' · ').pop();
  function noiseInfo() { if (!AP) return null; const c = noiseCfg();
    return { available: !!c, cfg: c, busy: NZ.busy, progress: NZ.progress, bands: NZ.bands, scheme: countryOf() === 'Korea' ? 'kr' : 'intl',
      fleet: c ? c.fleet.map(([id, sh]) => [ANP[id].label, sh]) : null }; }
  function noiseTracks(c) {
    const rws = frames(scen() !== 'ex'), procs = PROCEDURES[APID] || [], perDay = c.annual / 365, wN = (1 - c.evening - c.night) + c.evening * 3.1623 + c.night * 10;
    const roleOf = (rw) => { const o = new Set(procs.filter(p => p.rwy === rw.nameA.replace('′', '') || p.rwy === rw.nameB.replace('′', '')).map(p => p.ops).filter(Boolean)); return o.size === 1 ? [...o][0] : 'both'; };
    const on = rws.filter(r => r.on), arrR = on.filter(r => roleOf(r) !== 'dep'), depR = on.filter(r => roleOf(r) !== 'arr'), T = [];
    const north = (rw, atA) => { const u = atA ? rw.U : [-rw.U[0], -rw.U[1]]; return u[1] > 0; };   // heading roughly north (33/34)
    for (const [list, mode] of [[arrR, 'A'], [depR, 'D']]) for (const rw of list) for (const atA of [true, false]) {
      const u = atA ? rw.U : [-rw.U[0], -rw.U[1]], P0 = atA ? rw.A : rw.B, share = north(rw, atA) ? c.north : 1 - c.north;
      const wt = (r) => (c.rwyShare && AP.rwys[r.i] ? c.rwyShare[AP.rwys[r.i].id] ?? 0 : 1), tot = list.reduce((a, r) => a + wt(r), 0) || 1;
      const n = perDay / 2 * wt(rw) / tot * share * wN; if (!n) continue;
      const o = mode === 'A' ? [P0[0] + u[0] * 291, P0[1] + u[1] * 291] : P0;
      T.push({ x: o[0], y: o[1], ux: u[0], uy: u[1], mode, n }); }
    return T; }
  async function buildNoise() {
    const c = noiseCfg(); if (!c || !state.noise) { if (nzCv.width) { nzCv.width = 0; K.b = null; scheduleSync(); } return; }
    const key = [APID, scen(), state.extA.join(), state.extB.join(), parKey(), AP._on.join(''), JSON.stringify(c)].join('|');
    if (key === NZ.key) { if (!nzCv.width && NZ.grid) drawNoise(); return; }
    NZ.key = key; const run = ++NZ.run; NZ.busy = true; NZ.progress = 0; emit();
    const jobs = []; for (const [ac] of c.fleet) for (const m of ['A', 'D']) jobs.push([ac, m]);
    for (let i = 0; i < jobs.length; i++) { noiseTable(...jobs[i]); NZ.progress = (i + 1) / (jobs.length + 1); emit(); await new Promise(r => setTimeout(r, 0)); if (run !== NZ.run) return; }
    const rws = frames(scen() !== 'ex'), ends = rws.flatMap(f => [f.A, f.B]), m = 20000;   // the 55 dB contour stays inside
    const ex = { x1: Math.min(...ends.map(q => q[0])) - m, x2: Math.max(...ends.map(q => q[0])) + m, y1: Math.min(...ends.map(q => q[1])) - m, y2: Math.max(...ends.map(q => q[1])) + m };
    NZ.grid = lden(noiseTracks(c), c.fleet, ex, 100);
    // band areas (km²)
    const B = noiseBands(), area = B.map(() => 0); for (const v of NZ.grid.L) { for (let b = B.length - 1; b >= 0; b--) if (v >= B[b][0]) { area[b] += 0.01; break; } }
    NZ.bands = B.map((b, i) => ({ lo: b[0], ko: b[1], en: b[2], color: b[3], km2: +area[i].toFixed(1) }));
    NZ.busy = false; NZ.progress = 1; drawNoise(); emit(); }
  function drawNoise() { const ex = L.groundEx, g = NZ.grid; if (!ex || !g) return; const B = noiseBands();
    const W = 2048, H = Math.max(64, Math.round(W * (ex.y2 - ex.y1) / (ex.x2 - ex.x1))); nzCv.width = W; nzCv.height = H;
    const c = nzCv.getContext('2d'), img = c.createImageData(W, H), d = img.data, rgb = B.map(b => [1, 3, 5].map(k => parseInt(b[3].slice(k, k + 2), 16)));
    const band = new Int8Array(W * H).fill(-1);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = lnAt(g, ex.x1 + (ex.x2 - ex.x1) * (i + .5) / W, ex.y2 - (ex.y2 - ex.y1) * (j + .5) / H);
      let b = -1; for (let k = B.length - 1; k >= 0; k--) if (v >= B[k][0]) { b = k; break; } band[j * W + i] = b; }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, b = band[k]; if (b < 0) continue;
      const edge = (i && band[k - 1] !== b) || (j && band[k - W] !== b) || (i < W - 1 && band[k + 1] !== b) || (j < H - 1 && band[k + W] !== b);
      const [r, gg, bb] = rgb[b], q = k * 4; d[q] = r; d[q + 1] = gg; d[q + 2] = bb; d[q + 3] = edge ? 235 : 110; }
    c.putImageData(img, 0, 0); K.b = null; scheduleSync(); }

  function sync() { if (!alive || !AP) return;
    const rwsEx = frames(false), rwsExt = frames(true), rws = scen() === 'ext' ? rwsExt : rwsEx;
    const kG = APID + '|' + (AP.dem ? 1 : 0); if (K.g !== kG) { K.g = kG; buildGround(); K.t = null; K.o = null; }   // terrain arrived after the first draw: obstacles' ground heights must be rebuilt too
    const k0 = [APID, scen(), state.extA.join(','), state.extB.join(','), parKey(), state.E, state.ofz ? 1 : 0, AP._on.join('')].join('|');
    const kS = k0 + '|' + [...state.surf].sort().join(',');
    if (K.s !== kS) { K.s = kS; buildSurfaces(rwsEx, rwsExt); }
    if (K.r !== k0) { K.r = k0; buildRunways(rwsEx, rwsExt); }
    const kO = k0 + '|' + state.bldH + '|' + state.obs; if (K.o !== kO) { K.o = kO; buildObstacles(rws); }
    const kT = k0 + '|' + state.pen, kB = kT + '|' + state.base;
    if (K.t !== kT) { K.t = kT; buildOverlay(rwsEx, rwsExt); K.b = null; }
    if (K.b !== kB || texPending) { K.b = kB; buildBase(); } else if (hiPending) buildHi();
    const kN = [k0, state.noise, JSON.stringify(state.noiseCfg)].join('|'); if (K.n !== kN) { K.n = kN; buildNoise(); }
    const kP = [k0, state.proc.join(','), G.scale.y, AP.dem ? 1 : 0].join('|'); if (K.p !== kP) { K.p = kP; buildProcs(); } }
  function scheduleSync() { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; sync(); }); }
  function fit(kind) { if (!AP) return;
    const procs = (PROCEDURES[APID] || []).filter(p => state.proc.includes(p.id));
    if (kind === 'all' && procs.length) {   // overview with procedures shown: frame the whole procedure area
      const P = procs.flatMap(p => p.paths.flatMap(q => q.legs.map(l => LL(AP, [l[1], l[2]])))), xs = P.map(q => q[0]), ys = P.map(q => q[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * .95;
      ctl.target.set(cx, state.E * G.scale.y, -cy); camera.position.set(cx + r * .9, state.E * G.scale.y + r * .55, -cy + r * .6); ctl.update(); return; }
    const r = kind === 'rwy' ? AP.fitRwy : AP.fitAll, ax = frames(false)[0], c = Wp(ax, ax.L / 2, 0);
    ctl.target.set(c[0], state.E * G.scale.y, -c[1]); camera.position.set(c[0] - r * .9, state.E * G.scale.y + r * .8, -c[1] + r * .9); ctl.update(); }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function loop() { if (!alive) return; ctl.update(); flyPlanes(performance.now()); renderer.render(scene, camera); requestAnimationFrame(loop); }

  // ---------- picking: obstacle → its clearance, otherwise the OLS limit at that point ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(e) { const rc = canvas.getBoundingClientRect(); ptr.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); return ray.intersectObjects([L.obs, L.ground, ...L.surf].filter(Boolean), false)[0]; }
  function hoverInfo(h) {
    if (h.object === L.obs) { const o = L.obsList[L.obs.geometry.attributes.bid.getX(h.face.a)];
      return { kind: 'obstacle', name: o.b.n || null, tag: bTag(o.b), h: o.h, g: o.g, top: o.top, limit: o.r ? { h: o.r.h, name: o.r.name } : null, pen: o.pen }; }
    const P = [h.point.x, -h.point.z], rwsEx = frames(false), rwsExt = frames(true), ax = rwsEx[0];
    const a = ols(P, rwsEx), b = ols(P, rwsExt), [s, d] = sd(P, ax), g = demAt(P[0], P[1]);
    return { kind: 'point', s, d, ground: g, ex: a, ext: b, refA: ax.nameA, lden: state.noise && NZ.grid ? lnAt(NZ.grid, P[0], P[1]) : null }; }
  const onMove = e => { if (!AP || !cb.onHover) return; const h = pick(e); cb.onHover(h ? hoverInfo(h) : null); };
  canvas.addEventListener('pointermove', onMove);

  // ---------- public API ----------
  function set(patch) {
    for (const [k, v] of Object.entries(patch)) { if (k === 'surf') state.surf = new Set(v); else if (k === 'extA' || k === 'extB') state[k] = [...v];
      else if (k === 'par') state.par = v.map(p => ({ ri: p.ri, off: +p.off || 0, len: Math.max(0, +p.len || 0) })).filter(p => AP && AP.rwys[p.ri]); else state[k] = v; }
    if ('rot' in patch) ctl.autoRotate = !!patch.rot;
    if ('zex' in patch) { const dy = state.E * (+patch.zex - G.scale.y); G.scale.y = +patch.zex; ctl.target.y += dy; camera.position.y += dy; }   // keep the view: camera rides up with the aerodrome
    sync(); emit(); }
  // Summary for reports: terrain above the combined OLS on a 60 m grid (km², max), and the buildings through it
  function stats() { if (!AP) return null;
    const rws = frames(true), ex = extent(rws), by = {}; let n = 0, worst = null;
    for (let x = ex.x1; x <= ex.x2; x += 60) for (let y = ex.y1; y <= ex.y2; y += 60) { const g = demAt(x, y); if (g === null) continue;
      const r = ols([x, y], rws); if (!r) continue; const pen = g - r.h; if (pen <= 0) continue;
      const e = by[r.key] || (by[r.key] = { name: r.name.replace(/ RWY .*/, ''), n: 0, max: 0 }); e.n++; e.area = +(e.n * 0.0036).toFixed(2); if (pen > e.max) e.max = +pen.toFixed(1);
      if (!worst || pen > worst.pen) worst = { pen: +pen.toFixed(1), surface: r.name }; n++; }
    const bad = L.obsList.filter(o => o.pen > 0).sort((a, b) => b.pen - a.pen)
      .map(o => ({ name: o.b.n || null, tag: bTag(o.b), h: o.h, top: +o.top.toFixed(1), limit: +o.r.h.toFixed(1), surface: o.r.name, pen: +o.pen.toFixed(1) }));
    return { apId: APID, dem: AP.dem ? AP.dem.src : null, area: +(n * 0.0036).toFixed(2), worst, bySurface: by, obsChecked: L.obsList.length, obsBad: bad }; }
  function setExt(i, end, len) { if (!AP) return; (end === 'A' ? state.extA : state.extB)[i] = Math.max(0, +len || 0); sync(); emit(); }
  function setRunway(i, on) { if (!AP) return; AP._on[i] = on; sync(); emit(); }
  function destroy() { alive = false; canvas.removeEventListener('pointermove', onMove); ctl.dispose(); renderer.dispose(); }

  resize(); loop();
  // console probes for terrain checks: __ols.probe.dem(x, y), __ols.probe.ols(x, y), __ols.probe.xy(lat, lon), __ols.probe.cam(x, y, h, tx, ty)
  const probe = { noiseEdge: () => noiseEdge(), dem: (x, y) => demAt(x, y), ols: (x, y) => ols([x, y], frames(true)), xy: (lat, lon) => LL(AP, [lat, lon]), cam: (x, y, h, tx, ty) => { state.rot = false; camera.position.set(x, h, -y); ctl.target.set(tx, 0, -ty); ctl.update(); }, rws: () => frames(false).map(f => ({ A: f.A, B: f.B, eA: f.eA, eB: f.eB })), demInfo: () => AP.dem && { src: AP.dem.src, dx: AP.dem.dx, dy: AP.dem.dy, nx: AP.dem.nx, ny: AP.dem.ny } };
  const noiseEdge = () => { const g = NZ.grid; if (!g) return null; let m = -1e9; for (let i = 0; i < g.nx; i++) m = Math.max(m, g.L[i], g.L[(g.ny - 1) * g.nx + i]); for (let j = 0; j < g.ny; j++) m = Math.max(m, g.L[j * g.nx], g.L[j * g.nx + g.nx - 1]); return +m.toFixed(1); };
  const debug = () => ({ hi: { on: hiU.hiOn.value, rect: hiU.hiRect.value.toArray().map(Math.round), w: hiCv.width, h: hiCv.height, img: hiCv.width ? hiCv.toDataURL('image/jpeg', .4) : null, mat: !!L.ground?.material.onBeforeCompile }, planes: planes.map(p => ({ T: p.seq.map(q => Math.round(q.tr.T)), gap: p.seq.map(q => +q.gap.toFixed(1)), pool: p.pool.length, live: p.live, pos: p.pool.filter(o => o.visible).map(o => o.position.toArray().map(Math.round)) })), pending: texPending, K: { ...K }, texW: texCv.width, texH: texCv.height, hsW: hsCv.width, tex: texCv.toDataURL('image/jpeg', .5), hs: hsCv.width ? hsCv.toDataURL('image/jpeg', .5) : null });
  return { switchAirport, set, setExt, setRunway, fit, resize, destroy, snapshot, stats, debug, probe };
}
