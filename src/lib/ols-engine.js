// OLS Simulator engine — ICAO Annex 14 obstacle limitation surfaces, multi-runway (combined OLS = lowest
// governing surface), GEDTM30 / online terrain, OSM buildings, rendered in 3D with Three.js.
// Ported from the single-file simulator (cadip-web public/OLS_Simulator_Global.html); the geometry core is verbatim.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AIRPORTS } from '@/data/airports.js';

export { AIRPORTS, REGIONS } from '@/data/airports.js';

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

const TILE_PROV = {
  osm: { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, attr: '© OpenStreetMap contributors', max: 19 },
  sat: { url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`, attr: 'Imagery © Esri, Maxar', max: 19 },
};
function lon2tx(lon, z) { return (lon + 180) / 360 * (1 << z); }
function lat2ty(lat, z) { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * (1 << z); }
function tx2lon(tx, z) { return tx / (1 << z) * 360 - 180; }
function ty2lat(ty, z) { const n = Math.PI - 2 * Math.PI * ty / (1 << z); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }

const TAG = { communications_tower: 'Communications tower', mast: 'Mast', tower: 'Tower', chimney: 'Chimney', water_tower: 'Water tower', lighthouse: 'Lighthouse', windmill: 'Windmill', power_tower: 'Power pylon', wind: 'Wind turbine' };

export function createEngine(canvas, cb) {
  // ---------- state ----------
  let AP = null, APID = null;
  // extA/extB: extension (m) per runway at the A / B end; showEx overlays the existing OLS for comparison
  const state = { showEx: false, extA: [], extB: [], E: 39, base: 'sat', pen: true, obs: true, ofz: false, bldH: 6,
    surf: new Set(ALL_KEYS), rot: true, zex: 2 };   // zex: vertical exaggeration, 2× by default so relief reads at 1:1-ish views

  // ---------- coordinates / geometry core (per-runway frames) ----------
  function initAp(ap) { if (!ap._k) { const lat0 = ap.osm.origin[0]; ap._k = [111320 * Math.cos(lat0 * Math.PI / 180), 110574]; }
    if (!ap._on) ap._on = ap.rwys.map(() => true); }
  function LL(ap, ll) { const [kx, ky] = ap._k, [lat0, lon0] = ap.osm.origin; return [(ll[1] - lon0) * kx, (ll[0] - lat0) * ky]; }
  // Effective scenario: nothing extended → 'ex'; extended → 'ext', or 'cmp' when the existing OLS is overlaid
  const anyExt = () => state.extA.some(v => v > 0) || state.extB.some(v => v > 0);
  const scen = () => !anyExt() ? 'ex' : state.showEx ? 'cmp' : 'ext';
  function frames(apply) {
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
  const _osmP = {};
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
    state.extA = AP.rwys.map(() => 0); state.extB = AP.rwys.map(() => 0); state.showEx = false;
    if (AP.ext) (AP.ext.end === 'A' ? state.extA : state.extB)[AP.ext.ri] = AP.ext.len;   // registry preset (PMIA 32R +750 m)
    if (!AP.dem) { if (AP.demFile) loadFileTerrain(); else loadOnlineTerrain(); }
    K.s = K.o = K.g = K.t = K.b = null; sync(); fit('all'); emit();
  }
  function snapshot() {
    const ap = APID && AIRPORTS[APID];
    return { apId: APID, loading: !!ap && !ap.osm && !ap._failed, failed: !!ap && !!ap._failed,
      ap: AP ? { name: AP.name, sub: AP.sub, E: AP.E, code: AP.code || 4, origin: AP.osm.origin, ext: AP.ext || null, assume: AP.assume,
        rwys: AP.rwys.map((r, i) => ({ id: r.id, len: r.len, on: AP._on[i], nameA: r.nameA, nameB: r.nameB })),
        dem: AP.dem ? 'ok' : AP._demLoading ? 'loading' : AP._demFailed ? 'failed' : 'none', demSrc: AP.dem && AP.dem.src } : null,
      state: { ...state, surf: [...state.surf], extA: [...state.extA], extB: [...state.extB], scen: scen() } };
  }
  const emit = () => cb.onStatus && cb.onStatus(snapshot());

  // ---------- 3D ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0d10);
  const camera = new THREE.PerspectiveCamera(50, 1, 20, 150000);
  const ctl = new OrbitControls(camera, canvas); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.5; ctl.maxPolarAngle = Math.PI / 2 - 0.03;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2d33, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-1, 0.6, -1); scene.add(sun);   // low sun from the north-west, like a hillshade
  const G = new THREE.Group(); G.scale.y = state.zex; scene.add(G);          // metres. ENU (x,y,z) → three (x, z, -y). G.scale.y = vertical exaggeration
  const L = { ground: null, groundEx: null, surf: [], grid: [], obs: null, obsList: [], rwy: [] };
  const K = {};
  let alive = true, texPending = false, syncQueued = false;
  const texCv = document.createElement('canvas'), ovCv = document.createElement('canvas'), hsCv = document.createElement('canvas');
  const tex = new THREE.CanvasTexture(texCv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;

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
  function meshFrom(ex, step, nx, ny, h, color) {
    const pos = new Float32Array(nx * ny * 3);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; pos[3 * k] = ex.x1 + i * step; pos[3 * k + 1] = isNaN(h[k]) ? 0 : h[k]; pos[3 * k + 2] = -(ex.y1 + j * step); }
    const idx = []; for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      if (!isNaN(h[a]) && !isNaN(h[b]) && !isNaN(h[c]) && !isNaN(h[d])) idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
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
        const m = meshFrom(ex, step, nx, ny, h, uni ?? COLOR[k]); if (uni) m.material.opacity = .3; G.add(m); L.surf.push(m);
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
    L.ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex })); L.groundEx = ex; G.add(L.ground); buildHillshade(); }
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
      tc.fillStyle = 'rgba(8,10,14,.3)'; tc.fillRect(0, 0, W, H); }
    if (hsCv.width) { tc.globalCompositeOperation = 'multiply'; tc.drawImage(hsCv, 0, 0, W, H); tc.globalCompositeOperation = 'source-over'; }
    tc.drawImage(ovCv, 0, 0, W, H); tex.needsUpdate = true; }
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
      strip(rw.baseA, rw.baseB, rw.eA, rw.eB, rw.on ? 0xe8e4dc : 0x6b675f); }); }

  function sync() { if (!alive || !AP) return;
    const rwsEx = frames(false), rwsExt = frames(true), rws = scen() === 'ext' ? rwsExt : rwsEx;
    const kG = APID + '|' + (AP.dem ? 1 : 0); if (K.g !== kG) { K.g = kG; buildGround(); K.t = null; }
    const k0 = [APID, scen(), state.extA.join(','), state.extB.join(','), state.E, state.ofz ? 1 : 0, AP._on.join('')].join('|');
    const kS = k0 + '|' + [...state.surf].sort().join(',');
    if (K.s !== kS) { K.s = kS; buildSurfaces(rwsEx, rwsExt); }
    if (K.r !== k0) { K.r = k0; buildRunways(rwsEx, rwsExt); }
    const kO = k0 + '|' + state.bldH + '|' + state.obs; if (K.o !== kO) { K.o = kO; buildObstacles(rws); }
    const kT = k0 + '|' + state.pen, kB = kT + '|' + state.base;
    if (K.t !== kT) { K.t = kT; buildOverlay(rwsEx, rwsExt); K.b = null; }
    if (K.b !== kB || texPending) { K.b = kB; buildBase(); } }
  function scheduleSync() { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; sync(); }); }
  function fit(kind) { if (!AP) return; const r = kind === 'rwy' ? AP.fitRwy : AP.fitAll, ax = frames(false)[0], c = Wp(ax, ax.L / 2, 0);
    ctl.target.set(c[0], state.E * G.scale.y, -c[1]); camera.position.set(c[0] - r * .9, r * .8, -c[1] + r * .9); ctl.update(); }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function loop() { if (!alive) return; ctl.update(); renderer.render(scene, camera); requestAnimationFrame(loop); }

  // ---------- picking: obstacle → its clearance, otherwise the OLS limit at that point ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(e) { const rc = canvas.getBoundingClientRect(); ptr.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); return ray.intersectObjects([L.obs, L.ground, ...L.surf].filter(Boolean), false)[0]; }
  function hoverInfo(h) {
    if (h.object === L.obs) { const o = L.obsList[L.obs.geometry.attributes.bid.getX(h.face.a)];
      return { kind: 'obstacle', name: o.b.n || null, tag: bTag(o.b), h: o.h, g: o.g, top: o.top, limit: o.r ? { h: o.r.h, name: o.r.name } : null, pen: o.pen }; }
    const P = [h.point.x, -h.point.z], rwsEx = frames(false), rwsExt = frames(true), ax = rwsEx[0];
    const a = ols(P, rwsEx), b = ols(P, rwsExt), [s, d] = sd(P, ax), g = demAt(P[0], P[1]);
    return { kind: 'point', s, d, ground: g, ex: a, ext: b, refA: ax.nameA }; }
  const onMove = e => { if (!AP || !cb.onHover) return; const h = pick(e); cb.onHover(h ? hoverInfo(h) : null); };
  canvas.addEventListener('pointermove', onMove);

  // ---------- public API ----------
  function set(patch) {
    for (const [k, v] of Object.entries(patch)) { if (k === 'surf') state.surf = new Set(v); else if (k === 'extA' || k === 'extB') state[k] = [...v]; else state[k] = v; }
    if ('rot' in patch) ctl.autoRotate = !!patch.rot;
    if ('zex' in patch) { G.scale.y = +patch.zex; ctl.target.y = state.E * G.scale.y; }
    sync(); emit(); }
  function setExt(i, end, len) { if (!AP) return; (end === 'A' ? state.extA : state.extB)[i] = Math.max(0, +len || 0); sync(); emit(); }
  function setRunway(i, on) { if (!AP) return; AP._on[i] = on; sync(); emit(); }
  function destroy() { alive = false; canvas.removeEventListener('pointermove', onMove); ctl.dispose(); renderer.dispose(); }

  resize(); loop();
  return { switchAirport, set, setExt, setRunway, fit, resize, destroy, snapshot };
}
