# GEDTM30 (OpenLandMap, CC BY 4.0) bare-earth DTM -> simulator terrain grid public/dem/<ID>.bin (int16 LE, decimetres, row 0 = south)
#   python tools/dem/gedtm.py ICN RKSS ...      (needs rasterio; reads the COG over HTTP)
# Grid: the runway thresholds' bounding box ±16.5 km (15 km approach + margin) at 30 m, in the airport's local frame
# (origin from public/data/osm_<ID>.js, x = Δlon·111320·cos(lat0), y = Δlat·110574, as the engine does).
# Prints the demFile entry for src/data/airports.js. Same method as cadip-web tools/ols/dem_gedtm.py.
import sys, json, math, re, pathlib, subprocess, numpy as np, rasterio
from rasterio.windows import from_bounds
ROOT = pathlib.Path(__file__).resolve().parents[2]
COG = '/vsicurl/https://s3.opengeohub.org/global/edtm/legendtm_rf_30m_m_s_20000101_20231231_go_epsg.4326_v20250130.tif'
SRC = 'GEDTM30 (OpenLandMap, CC BY 4.0), bare-earth DTM, EGM2008'
M, STEP = 16500, 30
# Ground changed since the DTM's source data: (name, level m, outline [[lat, lon], ...]). Inside, the terrain is lowered to
# `level`; outside, to at most level + 0.3·distance (a 1:3 edge), so it blends into the surroundings. Never raises.
#   python tools/dem/gedtm.py --patch ICN      applies them to the existing public/dem/<ID>.bin (no download)
PATCHES = {
    'ICN': [('north interchange (former hill, levelled)', 7, [[37.49389, 126.44073], [37.49886, 126.44186], [37.4995, 126.45148], [37.49751, 126.45544], [37.49344, 126.45487], [37.49253, 126.45035], [37.49253, 126.44525]]),
            ('golf course west of the quarry', 8, [[37.49479, 126.45623], [37.49524, 126.46506], [37.48982, 126.4654], [37.48937, 126.47072], [37.48801, 126.47298], [37.4853, 126.47185], [37.48213, 126.46732], [37.48213, 126.4594], [37.48756, 126.45657]])],
}

def patch(icao, z, x0, y0, nx, ny, lat0, lon0):
    """Lower z (dm, row 0 = south) inside each PATCHES outline of icao, with a 1:3 edge outside it."""
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
    for name, level, ll in PATCHES.get(icao, []):
        P = np.array([((lo - lon0) * kx, (la - lat0) * ky) for la, lo in ll]); E = 120   # edge width considered (m)
        i0, i1 = int((P[:, 0].min() - E - x0) // STEP), int((P[:, 0].max() + E - x0) // STEP) + 2
        j0, j1 = int((P[:, 1].min() - E - y0) // STEP), int((P[:, 1].max() + E - y0) // STEP) + 2
        X, Y = np.meshgrid(x0 + np.arange(i0, i1) * STEP, y0 + np.arange(j0, j1) * STEP)
        inside = np.zeros(X.shape, bool); dist = np.full(X.shape, np.inf)
        for (ax, ay), (bx, by) in zip(P, np.roll(P, -1, axis=0)):
            inside ^= ((ay > Y) != (by > Y)) & (X < (bx - ax) * (Y - ay) / (by - ay + 1e-12) + ax)
            t = np.clip(((X - ax) * (bx - ax) + (Y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2), 0, 1)
            dist = np.minimum(dist, np.hypot(X - ax - t * (bx - ax), Y - ay - t * (by - ay)))
        cap = np.where(inside, level, level + 0.3 * dist) * 10
        w = z[j0:j1, i0:i1]; n = int((w > cap).sum()); z[j0:j1, i0:i1] = np.minimum(w, cap).astype(z.dtype)
        print(f'  {icao} patch "{name}": {n} cells lowered to ≤ {level} m', file=sys.stderr)
    return z

def sample(a, T, lon, lat):
    """Bilinear sample of window a (transform T) at lon/lat arrays (pixel centres)."""
    fc = (lon - T.c) / T.a - 0.5; fr = (lat - T.f) / T.e - 0.5
    i = np.clip(np.floor(fc).astype(int), 0, a.shape[1] - 2); j = np.clip(np.floor(fr).astype(int), 0, a.shape[0] - 2)
    tx = np.clip(fc - i, 0, 1); ty = np.clip(fr - j, 0, 1)
    return a[j, i] * (1 - tx) * (1 - ty) + a[j, i + 1] * tx * (1 - ty) + a[j + 1, i] * (1 - tx) * ty + a[j + 1, i + 1] * tx * ty

def run(icao, rwys, ds):
    lat0, lon0 = json.loads(re.search(r'"origin":(\[[^\]]+\])', (ROOT / 'public' / 'data' / f'osm_{icao}.js').read_text(encoding='utf-8')).group(1))
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
    P = np.array([p for r in rwys for p in (r['llA'], r['llB'])])
    xs = (P[:, 1] - lon0) * kx; ys = (P[:, 0] - lat0) * ky
    x0, x1 = xs.min() - M, xs.max() + M; y0, y1 = ys.min() - M, ys.max() + M
    nx, ny = int((x1 - x0) // STEP) + 1, int((y1 - y0) // STEP) + 1
    lon = lon0 + (x0 + np.arange(nx) * STEP) / kx; lat = lat0 + (y0 + np.arange(ny) * STEP) / ky
    w = from_bounds(lon.min() - .002, lat.min() - .002, lon.max() + .002, lat.max() + .002, ds.transform).round_offsets().round_lengths()
    a = ds.read(1, window=w).astype(np.float64); a[a < -1e8] = 0; T = ds.window_transform(w)
    LON, LAT = np.meshgrid(lon, lat)
    z = np.clip(np.rint(sample(a, T, LON, LAT)), -3000, 32767).astype('<i2')   # GEDTM30 is in dm already
    z = patch(icao, z, x0, y0, nx, ny, lat0, lon0)
    (ROOT / 'public' / 'dem').mkdir(exist_ok=True); (ROOT / 'public' / 'dem' / f'{icao}.bin').write_bytes(z.tobytes())
    thr = [(round(float(sample(a, T, np.array([r['llA'][1]]), np.array([r['llA'][0]]))[0]) / 10, 1),
            round(float(sample(a, T, np.array([r['llB'][1]]), np.array([r['llB'][0]]))[0]) / 10, 1)) for r in rwys]
    return {'url': f'dem/{icao}.bin', 'x0': round(x0, 2), 'y0': round(y0, 2), 'dx': STEP, 'dy': STEP, 'nx': nx, 'ny': ny,
            's': 0.1, 'zmax': int(math.ceil(z.max() / 10)), 'src': SRC}, thr

if __name__ == '__main__' and sys.argv[1] == '--patch':
    for ic in sys.argv[2:]:
        d = json.loads(subprocess.check_output(['node', '-e', f"import('./src/data/airports.js').then(m=>console.log(JSON.stringify(m.AIRPORTS['{ic}'].demFile)))"], cwd=ROOT))
        lat0, lon0 = json.loads(re.search(r'"origin":(\[[^\]]+\])', (ROOT / 'public' / 'data' / f'osm_{ic}.js').read_text(encoding='utf-8')).group(1))
        f = ROOT / 'public' / 'dem' / f'{ic}.bin'; z = np.frombuffer(f.read_bytes(), '<i2').reshape(d['ny'], d['nx']).copy()
        f.write_bytes(patch(ic, z, d['x0'], d['y0'], d['nx'], d['ny'], lat0, lon0).tobytes())
    sys.exit()
if __name__ == '__main__':
    reg = json.loads(subprocess.check_output(['node', '-e', "import('./src/data/airports.js').then(m=>console.log(JSON.stringify(Object.fromEntries(Object.entries(m.AIRPORTS).map(([k,a])=>[k,a.rwys.map(r=>({llA:r.llA,llB:r.llB,eA:r.eA,eB:r.eB}))])))))"], cwd=ROOT))
    out = {}
    with rasterio.open(COG) as ds:
        for ic in sys.argv[1:]:
            dem, thr = run(ic, reg[ic], ds); out[ic] = dem
            print(ic, f"{dem['nx']}x{dem['ny']} zmax {dem['zmax']} m | THR DTM vs registry:", [(t, (r['eA'], r['eB'])) for t, r in zip(thr, reg[ic])], file=sys.stderr)
    print(json.dumps(out))
