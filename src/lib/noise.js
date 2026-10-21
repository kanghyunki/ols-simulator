// Aircraft noise exposure (Lden) after ECAC Doc 29 / ICAO Doc 9911, segment method, with the ANP v2.3 NPD curves and the
// profiles from tools/noise/anp_profiles.py. Simplifications: straight ground tracks along the extended runway centreline
// (no dispersion, no turns), flat ground at aerodrome level, ISA, no start-of-roll directivity. Screening level only.
import { ANP, NPD_D } from '@/data/noise-anp.js';

const FT = 0.3048, VREF = 160, D0 = 2 / Math.PI * 160 * 0.514444;   // reference speed (kt), Doc 29 scaled-distance d0 (m)
const LOGD = NPD_D.map((d) => Math.log10(d * FT));

// NPD level (metric SEL/LAmax, mode A/D) at power P (lb) and distance d (m): log-distance, linear-power interpolation;
// power is held at the lowest tabulated value (idle thrust can go negative in the engine model) and extrapolated above.
function npd(ac, metric, mode, P, d) {
  const rows = ANP[ac].npd[metric][mode];
  let i = 0; while (i < rows.length - 2 && P > rows[i + 1][0]) i++;
  // distance is not extrapolated below the shortest NPD distance (200 ft, 61 m)
  const lv = (r) => { const ld = Math.log10(Math.max(d, 200 * FT)); let k = 0; while (k < LOGD.length - 2 && ld > LOGD[k + 1]) k++;
    const f = (ld - LOGD[k]) / (LOGD[k + 1] - LOGD[k]); return r[k + 1] + (r[k + 2] - r[k + 1]) * f; };
  if (rows.length === 1) return lv(rows[0]);
  const a = rows[i], b = rows[i + 1], f = Math.max(0, (P - a[0]) / (b[0] - a[0]));
  return lv(a) + (lv(b) - lv(a)) * f;
}
// Lateral attenuation (SAE-AIR-5662) for wing-mounted engines, no bank: β elevation angle (deg), l lateral distance (m)
function lateral(beta, l) {
  const g = l <= 914 ? 1.089 * (1 - Math.exp(-0.00274 * l)) : 1, L = beta <= 50 ? 1.137 - 0.0229 * beta + 9.72 * Math.exp(-0.142 * beta) : 0;
  const p = beta * Math.PI / 180, s = Math.sin(p), c = Math.cos(p), s2 = Math.sin(2 * p), c2 = Math.cos(2 * p);
  return 10 * Math.log10(Math.pow(0.0039 * c * c + s * s, 0.062) / (0.8786 * s2 * s2 + c2 * c2)) - g * L;
}
// SEL (dB) at ground point (s along the track from the profile origin, l lateral), both in metres
function sel(ac, mode, prof, s, l) {
  let e = 0;
  for (let i = 1; i < prof.length; i++) {
    const [x1, h1, v1, p1] = prof[i - 1], [x2, h2, v2, p2] = prof[i]; if (x2 <= x1) continue;
    const ax = x1 * FT, az = h1 * FT, bx = x2 * FT, bz = h2 * FT, dx = bx - ax, dz = bz - az, lam = Math.hypot(dx, dz);
    const ux = dx / lam, uz = dz / lam, q = (s - ax) * ux + (0 - az) * uz;   // along the segment to the foot of the perpendicular
    const fx = ax + q * ux, fz = az + q * uz, dp = Math.hypot(s - fx, l, fz);
    const t = Math.min(1, Math.max(0, q / lam)), P = p1 + (p2 - p1) * t, zc = az + dz * t;
    const le = npd(ac, 'SEL', mode, P, dp), lm = npd(ac, 'LAmax', mode, P, dp);
    const dl = D0 * Math.pow(10, (le - lm) / 10), a1 = -q / dl, a2 = -(q - lam) / dl;
    const frac = (a2 / (1 + a2 * a2) + Math.atan(a2) - a1 / (1 + a1 * a1) - Math.atan(a1)) / Math.PI; if (frac <= 1e-9) continue;
    const v = Math.max(30, (v1 + v2) / 2), beta = Math.atan2(Math.max(0, zc), Math.max(l, 1)) * 180 / Math.PI;
    e += Math.pow(10, (le + 10 * Math.log10(VREF / v) + 10 * Math.log10(frac) + lateral(beta, l)) / 10);
  }
  return e;   // energy 10^(SEL/10)
}

// Exposure tables per aircraft and mode on an (along, lateral) grid, built once and reused for every airport and scenario
export const TAB = { s0: -46000, s1: 36000, ds: 150, l1: 8000, dl: 100 };   // contours of interest (≥ 55 dB) stay well inside
const tabs = new Map();
export function table(ac, mode) {
  const k = ac + mode; if (tabs.has(k)) return tabs.get(k);
  const prof = mode === 'A' ? ANP[ac].app : ANP[ac].dep, ns = Math.round((TAB.s1 - TAB.s0) / TAB.ds) + 1, nl = Math.round(TAB.l1 / TAB.dl) + 1;
  const E = new Float32Array(ns * nl);
  for (let j = 0; j < nl; j++) for (let i = 0; i < ns; i++) E[j * ns + i] = sel(ac, mode, prof, TAB.s0 + i * TAB.ds, j * TAB.dl);
  const t = { E, ns, nl }; tabs.set(k, t); return t;
}
const look = (t, s, l) => { const fi = (s - TAB.s0) / TAB.ds, fj = Math.abs(l) / TAB.dl; if (fi < 0 || fj >= t.nl - 1 || fi >= t.ns - 1) return 0;
  const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j, k = j * t.ns + i, E = t.E;
  return (E[k] * (1 - a) + E[k + 1] * a) * (1 - b) + (E[k + t.ns] * (1 - a) + E[k + t.ns + 1] * a) * b; };

// Lden grid. tracks: [{ x, y, ux, uy, mode: 'A'|'D', n }] (origin = touchdown for arrivals, start of roll for departures;
// n = average daily movements on it, already weighted for evening ×3.16 and night ×10); fleet: [[ac, share]].
// Returns { ex, step, nx, ny, L } with L in dB (−Infinity where nothing reaches).
export function lden(tracks, fleet, ex, step) {
  const nx = Math.floor((ex.x2 - ex.x1) / step) + 1, ny = Math.floor((ex.y2 - ex.y1) / step) + 1, S = new Float64Array(nx * ny);
  for (const tr of tracks) for (const [ac, share] of fleet) { if (!share) continue; const t = table(ac, tr.mode), w = tr.n * share;
    for (let j = 0; j < ny; j++) { const y = ex.y1 + j * step - tr.y;
      for (let i = 0; i < nx; i++) { const x = ex.x1 + i * step - tr.x; S[j * nx + i] += w * look(t, x * tr.ux + y * tr.uy, -x * tr.uy + y * tr.ux); } } }
  const L = new Float32Array(nx * ny); for (let k = 0; k < L.length; k++) L[k] = 10 * Math.log10(S[k] / 86400);
  return { ex, step, nx, ny, L };
}
export const lnAt = (g, x, y) => { const fi = (x - g.ex.x1) / g.step, fj = (y - g.ex.y1) / g.step; if (fi < 0 || fj < 0 || fi >= g.nx - 1 || fj >= g.ny - 1) return -Infinity;
  const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j, k = j * g.nx + i, L = g.L;
  return (L[k] * (1 - a) + L[k + 1] * a) * (1 - b) + (L[k + g.nx] * (1 - a) + L[k + g.nx + 1] * a) * b; };
