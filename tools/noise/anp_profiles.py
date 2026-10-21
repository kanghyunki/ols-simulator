# ANP v2.3 (EUROCONTROL / EASA legacy data) -> src/data/noise-anp.js: per aircraft the NPD curves (SEL, LAmax) and the
# approach / departure flight profiles, computed from the ANP procedural steps with the ECAC Doc 29 / ICAO Doc 9911
# equations (ISA, sea-level aerodrome, no wind). Profiles are along-track distance (ft; 0 = touchdown for arrivals,
# start of roll for departures), height AFE (ft), true airspeed (kt) and corrected net thrust per engine (lb).
#   python tools/noise/anp_profiles.py <folder with the ANP2.3_*.csv tables>
import csv, json, math, pathlib, sys
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).resolve().parents[2] / 'src' / 'data' / 'noise-anp.js'
# Representative fleet: ANP id -> (label, departure stage length, approach steps taken from, flap for the final descent)
FLEET = {
    '737800':   ('B737-800',     2, None, None),
    'A321-232': ('A321',         2, None, None),
    'A330-343': ('A330-300',     4, None, None),
    '7773ER':   ('B777-300ER',   5, None, None),
    '7878R':    ('B787-8',       5, None, None),
    'A350-941': ('A350-900',     5, '7878R', 'A_FULL_D'),   # ANP has no A350 approach steps: the 787's, with A350 flaps/thrust
    '7478':     ('B747-8F',      6, None, None),
    'F10062':   ('Fokker 100',   2, None, None),
    'ATR72':    ('ATR 72',       1, None, None),             # also stands in for the Dash 8 / Q400 turboprops
}
G, KT = 32.174, 1.68781   # ft/s², ft/s per kt

def rows(name): return list(csv.DictReader(open(SRC / f'ANP2.3_{name}.csv', encoding='latin-1'), delimiter=';'))
def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None
AC = {r['ACFT_ID']: r for r in rows('Aircraft')}
AERO = {(r['ACFT_ID'], r['Op Type'], r['Flap_ID'].strip()): r for r in rows('Aerodynamic_coefficients')}
ENG = {(r['ACFT_ID'], r['Thrust Rating']): r for r in rows('Jet_engine_coefficients')}
WT = {(r['ACFT_ID'], int(r['Stage Length'])): float(r['Weight (lb)']) for r in rows('Default_weights') if r['Stage Length'].isdigit()}
DEP = rows('Default_departure_procedural_steps'); APP = rows('Default_approach_procedural_steps'); NPD = rows('NPD_data')

def atm(h):   # ISA ratios at h ft
    th = 1 - 6.8756e-6 * h; d = th ** 5.2559; return d, th, d / th
def thrust(ac, rating, vc, h):   # corrected net thrust per engine Fn/δ (lb)
    e = ENG[(ac, rating)]; return num(e['E']) + num(e['F']) * vc + num(e['Ga']) * h + (num(e['Gb']) or 0) * h * h
def aero(ac, op, flap):
    r = AERO.get((ac, op, flap)) or next(v for k, v in AERO.items() if k[0] == ac and k[1] == op and k[2] == flap)
    return {k: num(r[k]) for k in 'BCDR'}

def departure(ac, stage):
    st = [s for s in DEP if s['ACFT_ID'] == ac and s['Profile_ID'] == 'DEFAULT' and s['Stage Length'] == str(stage)]
    st.sort(key=lambda s: int(s['Step Number'])); W = WT[(ac, stage)]; N = int(AC[ac]['Number Of Engines'])
    pts = []; x = h = 0.0; vc = 0.0
    def step_start(rating):   # thrust changes at the step boundary (e.g. the cutback to climb thrust)
        d = atm(h)[0]; f = thrust(ac, rating, vc, h) * d
        if pts and abs(pts[-1][3] - f) > 1: pts.append((x, h, vc / math.sqrt(atm(h)[2]), f))
    for s in st:
        kind, rating, flap = s['Step Type'], s['Thrust Rating'], s['Flap_ID'].strip(); a = aero(ac, 'D', flap)
        if kind == 'Takeoff':
            d, th, _ = atm(0); vc = a['C'] * math.sqrt(W)
            sto = a['B'] * th * (W / d) ** 2 / (N * thrust(ac, rating, vc / math.sqrt(2), 0))
            pts += [(0, 0, 0, thrust(ac, rating, 0, 0) * d), (sto, 0, vc, thrust(ac, rating, vc, 0) * d)]; x = sto
        elif kind == 'Climb':
            h2 = num(s['End Point Altitude (ft)'])
            if h2 is None or h2 <= h: continue
            step_start(rating)
            hm = (h + h2) / 2; d, _, sg = atm(hm); fn = thrust(ac, rating, vc, hm)
            k = 1.01 if vc <= 200 else 0.95; gam = math.asin(max(1e-3, min(.5, k * (N * fn / (W / d) - a['R']))))
            x += (h2 - h) / math.tan(gam); h = h2; d2, _, s2 = atm(h); pts.append((x, h, vc / math.sqrt(s2), thrust(ac, rating, vc, h) * d2))
        elif kind == 'Accelerate':
            v2 = num(s['End Point CAS (kt)']); roc = num(s['Rate Of Climb (ft/min)']); pacc = num(s['Accel Percentage (%)']); step_start(rating)
            dh = 0.0
            for _ in range(3):   # thrust, density at mid segment depend on the height gained
                hm = h + dh / 2; vm = (vc + v2) / 2; d, _, sg = atm(hm); kt2 = 1 / sg
                ex = N * thrust(ac, rating, vm, hm) / (W / d) - a['R']; vt = vm / math.sqrt(sg) * KT
                if roc is not None:
                    gr = roc / 60 / vt; s_ = 0.95 * kt2 * ((v2 * KT) ** 2 - (vc * KT) ** 2) / (2 * max(.05, G * (ex - gr)))
                else:
                    p = (pacc or 50) / 100; gr = (1 - p) * ex; s_ = kt2 * ((v2 * KT) ** 2 - (vc * KT) ** 2) / (2 * max(.05, G * p * ex))
                dh = s_ * gr
            x += s_; h += dh; vc = v2; d2, _, s2 = atm(h); pts.append((x, h, vc / math.sqrt(s2), thrust(ac, rating, vc, h) * d2))
        if h >= 10000: break
    return pts

def approach(ac, src_ac, final_flap):
    st = [s for s in APP if s['ACFT_ID'] == (src_ac or ac) and s['Profile_ID'] == 'DEFAULT']; st.sort(key=lambda s: int(s['Step Number']))
    W = 0.9 * float(AC[ac]['Max Gross Landing Weight (lb)']); N = int(AC[ac]['Number Of Engines']); fmax = float(AC[ac]['Max Sea Level Static Thrust (lb)'])
    seg = []   # built from the touchdown backwards in the end; first as a forward list of (dx, h_end, cas_end, thrust)
    def flapR(f): return aero(ac, 'A', f)['R'] if f and (ac, 'A', f) in AERO else ar['R']
    def balance(R_, h, sin_g=0.0): d = atm(h)[0]; return max(0, (W / d) * (R_ - sin_g) / N) * d   # thrust for steady flight
    def idle(vc, h, R_=None): return thrust(ac, 'IdleApproach', vc, h) * atm(h)[0] if (ac, 'IdleApproach') in ENG else balance(R_ or ar['R'], h, 0.0523)
    for s in st: s['Step Type'] = {'Level-Decel': 'Level', 'Descend-Decel': 'Descend'}.get(s['Step Type'].strip(), s['Step Type'].strip())
    fl = final_flap or next((s['Flap_ID'].strip() for s in reversed(st) if s['Step Type'] in ('Descend', 'Land') and s['Flap_ID'].strip()), None)
    ar = aero(ac, 'A', fl); vland = ar['D'] * math.sqrt(W)
    # forward pass: positions measured from the first point (x = 0)
    pts = []; x = 0.0; h = num(st[0]['Start Altitude(ft)']); vc = num(st[0]['Start CAS (kt)'])
    for i, s in enumerate(st):
        kind = s['Step Type']; nxt = st[i + 1] if i + 1 < len(st) else None
        h1 = num(s['Start Altitude(ft)']) if num(s['Start Altitude(ft)']) is not None else h; v1 = num(s['Start CAS (kt)']) or vc
        h, vc = h1, v1
        if not pts: pts.append([x, h, vc, idle(vc, h)])
        if kind in ('Descend-Idle', 'Descend', 'Level-Idle', 'Level'):
            h2 = num(nxt['Start Altitude(ft)']) if nxt and num(nxt['Start Altitude(ft)']) is not None else (0 if kind == 'Descend' else h)
            v2 = num(nxt['Start CAS (kt)']) if nxt and num(nxt['Start CAS (kt)']) is not None else (vland if kind == 'Descend' else vc)
            if kind.startswith('Descend'):
                ang = math.radians(num(s['Descent Angle (deg)']) or 3); dx = (h - h2) / math.tan(ang)
            else: dx = num(s['Distance (ft)']) or 0
            Rs = flapR(s['Flap_ID'].strip() or (fl if kind == 'Descend' else None))
            if kind == 'Descend': fn = balance(Rs, (h + h2) / 2, math.sin(math.radians(num(s['Descent Angle (deg)']) or 3)))
            elif kind == 'Level': fn = balance(Rs, h)
            else: fn = idle(v2, h2, Rs)
            if abs(pts[-1][3] - fn) > 1 and kind in ('Descend', 'Level'): pts.append([x, h, vc, fn])
            x += dx; h, vc = h2, v2; pts.append([x, h, vc, fn])
        elif kind == 'Land':
            x += num(s['Touchdown Roll (ft)']) or 0; pts.append([x, 0, vland, pts[-1][3]])
        elif kind == 'Decelerate':
            dx = num(s['Distance (ft)']) or 0; v2 = num(s['Start CAS (kt)']) if nxt is None else (num(nxt['Start CAS (kt)']) or 30)
            if dx <= 0: continue
            fr = (num(s['Start Thrust']) or 10) / 100 * fmax; pts.append([x, 0, pts[-1][2], fr])
            x += dx; pts.append([x, 0, v2, fr])
    # touchdown = the first point at h = 0; shift so it is 0, TAS from CAS
    td = next(p[0] for p in pts if p[1] <= 0)
    return [(p[0] - td, p[1], p[2] / math.sqrt(atm(p[1])[2]), p[3]) for p in pts]

def npd(nid):
    out = {}
    for r in NPD:
        if r['NPD_ID'] != nid or r['Noise Metric'] not in ('SEL', 'LAmax'): continue
        out.setdefault(r['Noise Metric'], {}).setdefault(r['Op Mode'], []).append(
            [float(r['Power Setting'])] + [float(r[k]) for k in r if k.startswith('L_')])
    for m in out.values():
        for v in m.values(): v.sort()
    return out

data = {}
for ac, (label, stage, app_src, fflap) in FLEET.items():
    stages = sorted({int(s['Stage Length']) for s in DEP if s['ACFT_ID'] == ac and s['Stage Length'].isdigit()}); stage = min(stages, key=lambda s: abs(s - stage))
    dep, app = departure(ac, stage), approach(ac, app_src, fflap)
    data[ac] = {'label': label, 'engines': int(AC[ac]['Number Of Engines']), 'npd': npd(AC[ac]['NPD_ID']), 'stage': stage,
                'dep': [[round(v, 1) for v in p] for p in dep], 'app': [[round(v, 1) for v in p] for p in app]}
    print(ac, 'dep stage', stage, 'to 10000 ft at', round(dep[-1][0] / 6076), 'NM; roll', round(dep[1][0]), 'ft | app from', round(-app[0][0] / 6076, 1), 'NM; final thrust', round(app[[i for i, p in enumerate(app) if p[0] < 0][-1]][3]), file=sys.stderr)
OUT.write_text('// Generated by tools/noise/anp_profiles.py from the ANP v2.3 legacy tables (EUROCONTROL, published by EASA). Do not edit by hand.\n'
               '// NPD distances (ft) for the level columns:\nexport const NPD_D = [200, 400, 630, 1000, 2000, 4000, 6300, 10000, 16000, 25000];\n'
               'export const ANP = ' + json.dumps(data, separators=(',', ':')) + ';\n', encoding='utf-8')
print('wrote', OUT, OUT.stat().st_size, 'bytes', file=sys.stderr)
