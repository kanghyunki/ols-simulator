# OSM (Overpass) -> simulator data public/data/osm_<ICAO>.js + meta_<ICAO>.json. From CADIP_Web tools/ols/fetch_osm.py
#   python tools/osm/fetch_osm.py EIDW --urban     |  --prune EIDW: drop assumed-height masts inside the aerodrome of an existing file
# ENU 투영은 시뮬레이터 initAp 과 동일: x=(lon-lon0)*111320*cos(lat0), y=(lat-lat0)*110574
import sys, json, math, time, re, urllib.request, urllib.parse, pathlib
import numpy as np

PNG = []
OUT = pathlib.Path(__file__).resolve().parents[2] / 'public' / 'data'
UA = 'OLS-Simulator/1.0 (kanghhkk@gmail.com)'
EPS = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']
R = 8000   # m, 추출 반경(건물·도로·수계). 접근표면 15km 는 지형(DEM)만으로 검토

def overpass(q):
    for attempt in range(3):          # 504 가 잦다 — 미러 순환 + 백오프
        for ep in EPS:
            try:
                req = urllib.request.Request(ep, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=300) as r: return json.load(r)
            except Exception as e: print('  overpass fail', ep, e); time.sleep(10)
        time.sleep(30 * (attempt + 1))
    raise SystemExit('all overpass endpoints failed')

def ends_pca(pts):
    """여러 세그먼트/폴리곤 점들 -> 주축 위 양 끝점 (활주로 시단 근사)."""
    P = np.array(pts); c = P.mean(0); u = np.linalg.svd(P - c)[2][0]
    t = (P - c) @ u
    return (c + u * t.min()).tolist(), (c + u * t.max()).tolist()

def num(v):
    if v is None: return None
    m = re.match(r'\s*([\d.]+)\s*(ft|\')?', str(v).replace(',', '.'))
    if not m: return None
    x = float(m.group(1)); return round(x * 0.3048, 1) if m.group(2) else x

URBAN=False   # --urban: 도심 공항(서울·부산권) — 건물은 높이≥20m 또는 6층 이상만, 도로는 간선만 (Overpass 용량·파일 크기)

def aerodrome_edges(icao):
    """Boundary segments [(lat, lon), (lat, lon)] of the aerodrome way or relation (outer members), for an even-odd test."""
    E = []
    for e in overpass(f'[out:json][timeout:120];nwr["aeroway"="aerodrome"]["icao"="{icao}"];out geom;')['elements']:
        rings = [e['geometry']] if 'geometry' in e else [m['geometry'] for m in e.get('members', []) if m.get('role') in ('outer', '') and 'geometry' in m]
        for g in rings: E += [((p['lat'], p['lon']), (q['lat'], q['lon'])) for p, q in zip(g, g[1:])]
    return E

def inside(E, lat, lon):
    c = False
    for (ay, ax), (by, bx) in E:
        if (ay > lat) != (by > lat) and lon < (bx - ax) * (lat - ay) / (by - ay) + ax: c = not c
    return c

def prune(icao, o=None):
    """Point obstacles inside the aerodrome with an assumed height (est) are the airport's own ILS/beacon/lighting masts,
    sited and frangible by rule — 25–30 m guesses there only make false penetrations, so they are dropped."""
    path = OUT / f'osm_{icao}.js'; save = o is None
    if save: s = path.read_text(encoding='utf-8'); o = json.loads(s[s.index('=') + 1:].rstrip().rstrip(';'))
    E = aerodrome_edges(icao)
    if not E: print('  no aerodrome outline, nothing pruned'); return o
    lat0, lon0 = o['origin']; kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
    keep = [b for b in o['bld'] if not (b.get('est') and inside(E, lat0 + b['p'][0][1] / ky, lon0 + b['p'][0][0] / kx))]
    print(f'  pruned {len(o["bld"]) - len(keep)} assumed-height points inside the aerodrome'); o['bld'] = keep
    if save: path.write_text(f'const OSM_{icao}=' + json.dumps(o, separators=(',', ':')) + ';\n', encoding='utf-8')
    return o

def run(icao, force=False):
    print('==', icao)
    if not force and (OUT / f'osm_{icao}.js').exists(): print('  exists, skip'); return
    a = overpass(f'[out:json][timeout:120];nwr["aeroway"="aerodrome"]["icao"="{icao}"];out center tags;')['elements']
    if not a: print('  no aerodrome'); return
    a = a[0]; t = a['tags']; c = a.get('center', {'lat': a.get('lat'), 'lon': a.get('lon')})
    lat0, lon0 = c['lat'], c['lon']
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
    dlat, dlon = R / ky, R / kx
    bbox = f'{lat0-dlat},{lon0-dlon},{lat0+dlat},{lon0+dlon}'
    # 인프라와 건물을 나눠 요청 (한 번에 하면 504). 건물은 ±7km — 원추표면 밖은 OLS 와 무관
    els = overpass(f'''[out:json][timeout:240][bbox:{bbox}];
(way["aeroway"~"^(runway|taxiway|apron)$"];
 way["highway"~"^({'trunk|primary|secondary' if URBAN else 'trunk|primary|secondary|tertiary|residential|unclassified'})$"];
 way["natural"~"^(water|coastline)$"];way["waterway"="riverbank"];);
out geom;''')['elements']
    dlat, dlon = 7000 / ky, 7000 / kx   # 건물: 원추표면 외측단(~6km) 커버
    els += overpass(f'[out:json][timeout:240][bbox:{lat0-dlat},{lon0-dlon},{lat0+dlat},{lon0+dlon}];{'(way["building"]["height"](if:number(t["height"])>=20);way["building"]["building:levels"](if:number(t["building:levels"])>=6););' if URBAN else 'way["building"];'}out geom;')['elements']
    # 점 장애물: 철탑·마스트·굴뚝·급수탑·등대·송전탑 (노드/웨이). 높이 태그 없으면 종류별 가정 높이(est) — 반경 R 전체
    els += overpass(f'''[out:json][timeout:240][bbox:{bbox}];
(nwr["man_made"~"^(tower|mast|communications_tower|chimney|water_tower|lighthouse|windmill)$"];nwr["power"="tower"];
 nwr["generator:source"="wind"];);out center tags;''')['elements']
    # 원점 = 최장 활주로 중점 (PMIA 와 같은 관례). 먼저 활주로를 ref 별로 묶는다
    rw = {}
    for e in els:
        tg = e.get('tags', {})
        if tg.get('aeroway') != 'runway' or 'geometry' not in e: continue
        ref = re.sub(r'\s+', '', tg.get('ref', '') or '')
        g = rw.setdefault(ref or f'way{e["id"]}', {'ll': [], 'len': tg.get('length'), 'w': tg.get('width'), 'surf': tg.get('surface')})
        g['ll'] += [[n['lat'], n['lon']] for n in e['geometry']]
    if not rw: print('  no runway'); return
    main = None
    for k, g in rw.items():
        A, B = ends_pca(g['ll']); g['A'], g['B'] = A, B
        g['L'] = round(math.hypot((B[1]-A[1])*kx, (B[0]-A[0])*ky), 1)
        if main is None or g['L'] > rw[main]['L']: main = k
    A, B = rw[main]['A'], rw[main]['B']
    lat0, lon0 = (A[0]+B[0])/2, (A[1]+B[1])/2
    kx = 111320 * math.cos(math.radians(lat0))
    xy = lambda n: [round((n['lon']-lon0)*kx, 1), round((n['lat']-lat0)*ky, 1)]
    o = {'origin': [lat0, lon0], 'rwy': {}, 'twy': [], 'apron': [], 'bld': [], 'road': [], 'water': [], 'coast': []}
    nobld = 0
    TOWER_H = {'communications_tower': 40, 'mast': 30, 'tower': 25, 'chimney': 25, 'water_tower': 15, 'lighthouse': 15, 'windmill': 15, 'power_tower': 25, 'wind': 80}
    for e in els:
        tg = e.get('tags', {}); g = e.get('geometry')
        kind = tg.get('man_made') if tg.get('man_made') in TOWER_H else 'power_tower' if tg.get('power') == 'tower' else 'wind' if tg.get('generator:source') == 'wind' else None
        if kind:   # 점 장애물 → 1점 폴리곤. est=True 면 가정 높이
            c = e.get('center') or e
            if 'lat' not in c: continue
            pt = xy({'lat': c['lat'], 'lon': c['lon']})
            h = None if 'height' in (tg.get('fixme') or '').lower() else num(tg.get('height')); est = h is None; h = h if h else TOWER_H[kind]
            o['bld'].append({'p': [pt], 'h': h, 'n': tg.get('name') or tg.get('operator'), 't': kind, 'est': est}); continue
        if not g: continue
        pts = [xy(n) for n in g]; aw = tg.get('aeroway')
        if aw == 'runway':
            ref = re.sub(r'\s+', '', tg.get('ref', '') or '') or f'way{e["id"]}'
            r = o['rwy'].setdefault(ref, {'pts': [], 'len': tg.get('length') or '', 'w': tg.get('width') or ''}); r['pts'] += pts
        elif aw == 'taxiway': o['twy'].append(pts)
        elif aw == 'apron': o['apron'].append(pts)
        elif 'building' in tg:
            h = num(tg.get('height')); lv = num(tg.get('building:levels'))
            if h is None and lv: h = round(lv * 3.5, 1)
            if h is None:
                if nobld >= 8000: continue   # ponytail: 높이 미상 건물 상한 8000동 (시뮬레이터가 가정 높이 적용)
                nobld += 1
            o['bld'].append({'p': pts, 'h': h, 'n': tg.get('name')})
        elif 'highway' in tg: o['road'].append(pts)
        elif tg.get('natural') == 'coastline': o['coast'].append(pts)
        else: o['water'].append(pts)
    # 시단(주축 끝점) 을 ENU/위경도 둘 다 기록. 방위로 A/B 이름 결정: A->B 방위 = A 쪽 시단 번호
    meta = {'icao': icao, 'name': t.get('name'), 'iata': t.get('iata'), 'ele_tag': num(t.get('ele')), 'origin': [lat0, lon0], 'rwys': []}
    for k, g in sorted(rw.items(), key=lambda kv: -kv[1]['L']):
        A, B = g['A'], g['B']
        brg = (math.degrees(math.atan2((B[1]-A[1])*kx, (B[0]-A[0])*ky)) + 360) % 360
        names = k.split('/') if '/' in k else []
        if len(names) == 2:
            nA = int(re.sub(r'\D', '', names[0]) or 0) * 10
            if min(abs(brg-nA), 360-abs(brg-nA)) > 90: names = names[::-1]   # 첫 이름이 A->B 방위와 반대면 뒤집기
        else:
            n = int(round(brg/10)) % 36 or 36; names = [f'{n:02d}', f'{(n+18-1)%36+1:02d}']
        if k.startswith('way'):   # ref 없는 활주로: 방위로 만든 이름을 키로 (충돌 시 * 접미)
            nk = f'{names[0]}/{names[1]}'
            while nk in o['rwy']: nk += '*'
            o['rwy'][nk] = o['rwy'].pop(k); k = nk
        meta['rwys'].append({'ref': k, 'nameA': names[0], 'nameB': names[1], 'llA': A, 'llB': B, 'L_osm': g['L'],
                             'len_tag': num(g['len']), 'w_tag': num(g['w']), 'surface': g['surf'], 'bearingAB': round(brg, 1)})
    OUT.mkdir(exist_ok=True); prune(icao, o)
    (OUT / f'osm_{icao}.js').write_text(f'const OSM_{icao}=' + json.dumps(o, separators=(',', ':')) + ';\n', encoding='utf-8')
    (OUT / f'meta_{icao}.json').write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding='utf-8')
    print(f"  {t.get('name')} | rwy {[(m['ref'], m['nameA'], m['nameB'], m['L_osm']) for m in meta['rwys']]} | bld {len(o['bld'])} (h: {sum(1 for b in o['bld'] if b['h'] and not b.get('t'))}, towers: {sum(1 for b in o['bld'] if b.get('t'))}) twy {len(o['twy'])} road {len(o['road'])}")

if __name__ == '__main__':
    if '--prune' in sys.argv:   # re-apply prune() to existing files without refetching
        for ic in [a for a in sys.argv[1:] if not a.startswith('--')]: prune(ic)
        raise SystemExit
    force = '--force' in sys.argv; URBAN = '--urban' in sys.argv; ids = [a for a in sys.argv[1:] if not a.startswith('--')] or PNG
    for i, ic in enumerate(ids):
        if i: time.sleep(25)   # Overpass rate limit (429)
        run(ic, force)
