// 3D aircraft, copied from AIRTRIX (src/lib/plane3d.js + planform() from src/lib/taxi.js): every part from the type's main
// dimensions, so it is true to length, span, height, wheelbase, track and engine span. Used for the noise sound-wave sources.
// Frame: +x forward with the nose gear at x = 0, y up from the ground, z across.
import * as THREE from 'three';
// AIRTRIX src/data/aircraft.js entry (dims in m)
export const B738 = { mfr: 'Boeing', name: '737-800W [CFM56-7]', mtow: 79000, dims: { length: 39.48, span: 35.8, height: 12.62, wheelbase: 15.6, track: 6.99, noseGearAftNose: 4.09, engineSpan: 12.04 } };

const C = { body: 0xf3f5f7, belly: 0xc9ced6, metal: 0xb7bec8, dark: 0x1d2330, glass: 0x15202e, tyre: 0x22252a, livery: 0x4f7dff };
function mats() {
  const m = (color, extra = {}) => new THREE.MeshPhongMaterial({ color, shininess: 60, specular: 0x333333, ...extra });
  return { body: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x444444, side: THREE.DoubleSide }), wing: m(0xe6e9ee, { side: THREE.DoubleSide }),
    metal: m(C.metal, { shininess: 90, side: THREE.DoubleSide }), dark: m(C.dark, { shininess: 20 }), tyre: m(C.tyre, { shininess: 8 }), fin: m(C.livery, { side: THREE.DoubleSide }),
    prop: new THREE.MeshBasicMaterial({ color: 0x0b0d10, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }) };
}
// a lifting surface from a planform in (x, s) — s spanwise ≥ 0 — extruded to a thickness that tapers with the span
function surface(pl, thick, tipFrac = 0.4) {
  const sh = new THREE.Shape(pl.map(([x, s]) => new THREE.Vector2(x, s)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.3, bevelSize: thick * 0.25, bevelSegments: 2, steps: 1 });
  g.translate(0, 0, -thick / 2); const smax = Math.max(...pl.map((p) => p[1])), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const f = 1 - (1 - tipFrac) * Math.min(1, Math.max(0, p.getY(i) / smax)); p.setZ(i, p.getZ(i) * f); }
  g.computeVertexNormals(); return g;   // planform in the shape's XY, thickness along Z
}
function revolve(xs, r, segs = 40) { const pts = xs.map((x, i) => new THREE.Vector2(Math.max(1e-3, r[i]), x)); const g = new THREE.LatheGeometry(pts, segs); g.rotateZ(-Math.PI / 2); return g; }

export function buildAircraft(ac) {
  const P = planform(ac), M = mats(), grp = new THREE.Group(), { R, hc, x0, x1, ln, lt, L } = P;
  // ---- fuselage: painted belly, cockpit glass and a livery cheat line; tail swept up
  const n = 90, xs = [], rs = []; for (let i = 0; i <= n; i++) { const x = x1 + (L * i) / n; xs.push(x); rs.push(P.rAt(x)); }
  const fus = revolve(xs, rs, 48), fp = fus.attributes.position, col = [], cB = new THREE.Color(C.body), cU = new THREE.Color(C.belly), cG = new THREE.Color(C.glass), cL = new THREE.Color(C.livery);
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), y = fp.getY(i), z = fp.getZ(i); fp.setY(i, y + P.upAt(x));
    const rr = Math.hypot(y, z) || 1, a = y / rr; let c = a < -0.35 ? cU : cB;
    const u = (x0 - x) / ln; if (u > 0.18 && u < 0.42 && a > 0.12 && a < 0.62 && Math.abs(z) < rr * 0.9) c = cG;
    if (x < x0 - ln && x > x1 + lt * 0.6 && a > -0.12 && a < 0.0) c = cL;
    col.push(c.r, c.g, c.b); }
  fus.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); fus.computeVertexNormals(); fus.translate(0, hc, 0);
  grp.add(new THREE.Mesh(fus, M.body));
  // ---- wing with dihedral and winglets
  const wg = surface(P.wing, P.cr * 0.1, 0.35); wg.rotateX(Math.PI / 2);   // shape Y (span) → z, thickness → y
  const wp = wg.attributes.position; for (let i = 0; i < wp.count; i++) wp.setY(i, wp.getY(i) + Math.abs(wp.getZ(i)) * Math.tan(P.dih)); wg.computeVertexNormals();
  for (const s of [1, -1]) { const m = new THREE.Mesh(wg, M.wing); m.scale.z = s; m.position.y = P.yw; grp.add(m);
    if (P.wl) { const ct = P.ct, wm = new THREE.Mesh(surface([[0, 0], [-ct * 0.6, P.wl], [-ct * 0.95, P.wl], [-ct, 0]], ct * 0.06, 0.6), M.wing);
      wm.position.set(P.tipLE, P.yw + P.b * Math.tan(P.dih), s * (P.b - 0.05)); grp.add(wm); } }
  // ---- fin (livery colour) and tailplane
  const fm = new THREE.Mesh(surface(P.fin, P.cf * 0.08, 0.45), M.fin); fm.position.y = P.finBase; fm.name = 'fin'; grp.add(fm);
  const tp = surface(P.tail, P.chr * 0.09, 0.4); tp.rotateX(Math.PI / 2);
  for (const s of [1, -1]) { const m = new THREE.Mesh(tp, M.wing); m.scale.z = s; m.position.y = P.yT; grp.add(m); }
  // ---- engines, pylons, propellers
  for (const e of P.engines) { const n2 = 24, ex = [], er = [];
    for (let i = 0; i <= n2; i++) { const t = i / n2; ex.push(e.x - e.le / 2 + e.le * (1 - t)); er.push(e.de / 2 * (t < 0.1 ? 0.9 + t : t < 0.6 ? 1 : 1 - (t - 0.6) * 0.9)); }
    const nac = new THREE.Mesh(revolve(ex.reverse(), er.reverse(), 28), M.metal); nac.position.set(0, e.y, e.z); grp.add(nac);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(e.de * 0.43, 24), M.dark); fan.rotation.y = Math.PI / 2; fan.position.set(e.x + e.le / 2 - e.le * 0.04, e.y, e.z); grp.add(fan);
    if (e.pylon === 'wing') { const py = new THREE.Mesh(new THREE.BoxGeometry(e.le * 0.55, Math.abs(e.yl - e.y) + 0.1, e.de * 0.12), M.wing); py.position.set(e.x - e.le * 0.12, (e.yl + e.y) / 2, e.z); grp.add(py); }
    if (e.pylon === 'side') { const py = new THREE.Mesh(new THREE.BoxGeometry(e.le * 0.5, e.de * 0.15, e.de * 0.7), M.wing); py.position.set(e.x, e.y, Math.sign(e.z) * (R + e.de * 0.1)); grp.add(py); } }
  for (const p of P.props) { const g = new THREE.Mesh(new THREE.CircleGeometry(p.dp / 2, 32), M.prop); g.rotation.y = Math.PI / 2; g.position.set(p.x, p.y, p.z); grp.add(g);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(p.dp * 0.07, p.dp * 0.18, 16).rotateZ(-Math.PI / 2), M.dark); sp.position.set(p.x + p.dp * 0.05, p.y, p.z); grp.add(sp); }
  // ---- landing gear
  const wheel = (x, y, z, r, w) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 18).rotateX(Math.PI / 2), M.tyre); m.position.set(x, y, z); grp.add(m); };
  const strut = (x, z, y0, y1, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.max(0.1, y1 - y0), 8), M.metal); m.position.set(x, (y0 + y1) / 2, z); grp.add(m); };
  const { rwM, rwN } = P; strut(0, 0, rwN, hc - R * 0.85, rwN * 0.18); for (const s of [1, -1]) wheel(0, rwN, s * rwN * 0.55, rwN, rwN * 0.6);
  for (const s of [1, -1]) { strut(P.xm, s * P.tr, rwM, P.lay.high ? hc - R * 0.6 : P.yw, rwM * 0.16);
    for (const dx of P.four ? [rwM * 1.15, -rwM * 1.15] : [0]) for (const dz of [rwM * 0.62, -rwM * 0.62]) wheel(P.xm + dx, rwM, s * P.tr + dz, rwM, rwM * 0.7); }
  grp.userData.fin = fm;
  return grp;
}

// ---------- aircraft shape from the main dimensions (shared by the 3D model and the plan drawing) ----------
// The library has length, span, height, wheelbase, track, nose-gear and engine span, but no layout: engine count / place and
// wing height are read off the type name. planform() gives every part in the model frame: +x forward with the nose gear at
// x = 0 (nose tip at x = noseGearAftNose), y up from the ground, z across.
const has = (re, ac) => re.test(`${ac.mfr} ${ac.name}`);
export function layoutOf(ac) {
  const fighter = /\bF-\d|F\/A|Mirage|Rafale|Typhoon|Tornado|Hawk\b|Jaguar|Harrier|\bSu-|JAS|\bJ ?3|AlphaJet|Alca|Albatros|T-50|T-38|Vulcan|Concorde|MQ-|\bAV-8|B-2\b|X-\d/;
  const prop1 = /Cessna (1|Sky|Grand|Cessna)|172|182|Skylane|Cirrus SR|Piper|Diamond|Aquila|Zlin|Lancair|Columbia|\bTB\b|TBM|\bPC-|Caravan|208|Kodiak|A36|V35B|E33|Bonanza|P2010|PAC|Seastar|Beta|Alice|SARAS|HANSA/;
  const prop4 = /C-130|\bP-3|AN-12|Dash 7|DHC-7|A400M|Nimrod|L-188|Electra|Bristol/;
  const prop2 = /ATR|Dash 8|DHC-8|Q[1-4]00|Saab 340|Saab 2000|SAAB 3|EMB-120|CN-?235|C-?295|CASA|Do ?228|Do ?328(?!JET)|Metro|King Air|BCH|Beech|Super King|Shorts|Jetstream|Twin Otter|DHC-6|Avanti|MU-2|YS-11|LET|AN-2[4-8]|AN-3[0-2]|AN-140|Convair|CV|C-27|Transall|P2012|P2006|P68|SkyCourier|BN2|Baron|340A|402|AC|M28|Fairchild Aerospace (Metro|FH)|C-2\b|E-2\b/;
  const jet4 = /A380|A340|\b747|707|AN-124|AN-225|IL-76|IL-96|IL-62|C-17|C-5|C-141|KC-135|\bE-3|\bE-4|\bE-6|VC10|BAe 146|Avro RJ|RJ\d|B-52/;
  const jet3t = /727|DC-10|MD-11|L-1011|TU-154|Yak-?42|Falcon (7X|8X|900|50)|KC-10|Yak-?40/;
  const jet2t = /DC-9|MD-8|MD-9|\b717|CRJ|ERJ|EMB-1[34]5|Legacy (600|650)|Fokker (70|100)|F ?28|BAC1|Gulfstream|Global|Challenger|Continental|LearJet|Citation|Phenom|Praetor|Hawker|HondaJet|Falcon|ARJ|C909|328JET|428JET|PREMIER|Premier|Eclipse|EA5|1124|TU-134|Sabreliner|SF50|SSJ|Westwind/;
  const highWing = /ATR|Dash|DHC|Q[1-4]00|Shorts|CN-?235|C-?295|CASA C|Do ?228|Do ?328|Twin Otter|AN-|C-27|C-130|C-17|C-5\b|C-141|A400M|IL-76|BAe 146|Avro RJ|RJ\d|Transall|Caravan|208|Kodiak|SkyCourier|Cessna (1|Sky)|172|182|Skylane|M28|BN2|LET|P2012|P2006|P68|Fokker F27|F50|Beluga/;
  let kind = 'jet2';
  if (has(fighter, ac)) kind = 'fighter'; else if (has(prop4, ac)) kind = 'prop4'; else if (has(jet4, ac)) kind = 'jet4';
  else if (has(jet3t, ac)) kind = 'jet3t'; else if (has(jet2t, ac)) kind = 'jet2t'; else if (has(prop1, ac)) kind = 'prop1'; else if (has(prop2, ac)) kind = 'prop2';
  return { kind, high: has(highWing, ac), tTail: kind === 'jet2t' || kind === 'jet3t' || has(/ATR|Dash 8|DHC-8|Q[1-4]00|C-17|IL-76|BAe 146|Avro RJ|RJ\d|Fokker (70|100)/, ac) };
}
export function planform(ac) {
  const d = ac.dims, L = d.length, span = d.span, H = d.height, lay = layoutOf(ac), k = lay.kind, prop = k.startsWith('prop');
  const x0 = d.noseGearAftNose, x1 = x0 - L, xm = -d.wheelbase;                                          // nose tip, tail end, main gear
  const D = Math.min(7.2, Math.max(k === 'prop1' ? 1.3 : 1.6, L * (k === 'fighter' ? 0.07 : prop ? 0.085 : 0.094))), R = D / 2;
  const rwM = Math.min(0.75, Math.max(0.28, D * 0.15)), rwN = rwM * 0.65, gearH = Math.min(2.4, Math.max(0.5, H * (lay.high ? 0.06 : 0.1))), hc = R + gearH + (lay.high ? 0 : rwM * 0.6);
  const ln = Math.min(L * 0.18, D * (k === 'fighter' ? 3.2 : 1.7)), lt = Math.min(L * 0.38, D * (k === 'fighter' ? 1.2 : 3.0));
  const rAt = (x) => { if (x > x0 - ln) { const u = (x0 - x) / ln; return R * Math.pow(Math.max(0, 1 - (1 - u) ** 2.2), 0.5); }
    if (x < x1 + lt) { const v = Math.max(0, (x - x1) / lt); return R * (0.1 + 0.9 * Math.pow(v, 0.75)); } return R; };
  const upAt = (x) => (x < x1 + lt ? R * 0.62 * Math.pow(1 - Math.max(0, (x - x1) / lt), 1.6) : 0);    // tail upsweep of the axis
  // wing
  const b = span / 2, sweep = (prop ? 4 : k === 'fighter' ? 42 : 28) * Math.PI / 180, cr = Math.max(1.2, span * (k === 'fighter' ? 0.42 : prop ? 0.1 : 0.19));
  const ct = cr * (k === 'fighter' ? 0.12 : prop ? 0.55 : 0.24), xr = xm + cr * (prop ? 0.35 : 0.62), dih = (lay.high ? -1 : 5) * Math.PI / 180;
  const yw = lay.high ? hc + R * 0.82 : k === 'fighter' ? hc - R * 0.1 : hc - R * 0.55, wl = k === 'jet2' || k === 'jet4' ? Math.min(2.5, span * 0.045) : 0;
  const tipLE = xr - b * Math.tan(sweep), kink = k.startsWith('jet') ? 0.33 : 0, tan = Math.tan(sweep);
  const wing = kink ? [[xr, 0], [tipLE, b], [tipLE - ct, b], [xr - cr - kink * b * tan * 0.35 + cr * 0.35, kink * b], [xr - cr, 0]] : [[xr, 0], [tipLE, b], [tipLE - ct, b], [xr - cr, 0]];
  const teAt = (z) => { const te = wing.slice(2).reverse(); for (let i = 0; i < te.length - 1; i++) { const [xa, za] = te[i], [xb, zb] = te[i + 1]; if (z >= za && z <= zb) return xa + (xb - xa) * (z - za) / (zb - za || 1); } return te[te.length - 1][0]; };
  const leAt = (z) => xr - z * tan;
  // tail
  const finTop = H, finBase = hc + R * 0.55, hf = Math.max(1, finTop - finBase), cf = Math.max(1, Math.min(L * 0.16, hf * 1.05)), fsw = (k === 'fighter' ? 50 : 38) * Math.PI / 180;
  const xfT = x1 + L * 0.015, xfL = xfT + cf, fin = [[xfL, 0], [xfL - hf * Math.tan(fsw), hf], [xfL - hf * Math.tan(fsw) - cf * 0.36, hf], [xfT, 0]];
  const bh = Math.max(1.5, span * (k === 'fighter' ? 0.28 : 0.17)), chr = cf * 0.72, hsw = 32 * Math.PI / 180;
  const yT = lay.tTail ? finTop - cf * 0.04 : hc + R * 0.25, xT = lay.tTail ? xfL - hf * Math.tan(fsw) + chr * 0.1 : x1 + L * 0.02 + chr;
  const tail = [[xT, 0], [xT - bh * Math.tan(hsw), bh], [xT - bh * Math.tan(hsw) - chr * 0.4, bh], [xT - chr, 0]];
  // engines { x centre, y, z, de diameter, le length, pylon: wing / side / none } and propellers { x, y, z, dp }
  const engines = [], props = [], zo = d.engineSpan && d.engineSpan > D * 1.2 ? d.engineSpan / 2 : b * 0.34;
  const underWing = (z, de, le) => { const yl = yw + Math.abs(z) * Math.tan(dih); engines.push({ x: leAt(Math.abs(z)) + le * 0.32, y: yl - (lay.high ? -de * 0.1 : de * 0.62), z, de, le, yl, pylon: 'wing' }); };
  if (k === 'jet2' || k === 'jet4') { const de = Math.min(4.4, D * 0.56), le = de * 2.3;
    if (k === 'jet4') for (const z of [zo, -zo, zo * 0.58, -zo * 0.58]) underWing(z, de * 0.85, le * 0.9); else for (const z of [zo, -zo]) underWing(z, de, le); }
  if (k === 'jet2t' || k === 'jet3t') { const de = Math.max(0.5, D * 0.42), le = de * 2.6, x = x1 + lt * 0.55 + le * 0.5, y = hc + R * 0.35;
    for (const s of [1, -1]) engines.push({ x, y, z: s * (R + de * 0.62), de, le, pylon: 'side' });
    if (k === 'jet3t') engines.push({ x: x - le * 0.2, y: finBase + de * 0.3, z: 0, de, le, pylon: 'none' }); }
  if (k === 'prop2' || k === 'prop4') { const de = Math.max(0.5, D * 0.36), le = de * 2.8, dp = Math.min(5.2, span * 0.14);
    for (const z of k === 'prop4' ? [zo, -zo, zo * 0.52, -zo * 0.52] : [zo, -zo]) { const yl = yw + Math.abs(z) * Math.tan(dih), y = lay.high ? yl - de * 0.25 : yl - de * 0.1, x = leAt(Math.abs(z)) + le * 0.25;
      engines.push({ x, y, z, de, le, pylon: 'none' }); props.push({ x: x + le / 2 + 0.05, y, z, dp }); } }
  if (k === 'prop1') props.push({ x: x0 + 0.1, y: hc, z: 0, dp: Math.min(2.4, span * 0.18) });
  return { lay, L, span, H, x0, x1, xm, D, R, rwM, rwN, gearH, hc, ln, lt, rAt, upAt, b, sweep, cr, ct, xr, dih, yw, wl, tipLE, wing, teAt, leAt,
    finTop, finBase, hf, cf, fsw, xfT, xfL, fin, bh, chr, hsw, yT, xT, tail, engines, props, four: (ac.mtow || 0) > 140000, tr: d.track / 2 };
}
