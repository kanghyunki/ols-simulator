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
    (ROOT / 'public' / 'dem').mkdir(exist_ok=True); (ROOT / 'public' / 'dem' / f'{icao}.bin').write_bytes(z.tobytes())
    thr = [(round(float(sample(a, T, np.array([r['llA'][1]]), np.array([r['llA'][0]]))[0]) / 10, 1),
            round(float(sample(a, T, np.array([r['llB'][1]]), np.array([r['llB'][0]]))[0]) / 10, 1)) for r in rwys]
    return {'url': f'dem/{icao}.bin', 'x0': round(x0, 2), 'y0': round(y0, 2), 'dx': STEP, 'dy': STEP, 'nx': nx, 'ny': ny,
            's': 0.1, 'zmax': int(math.ceil(z.max() / 10)), 'src': SRC}, thr

if __name__ == '__main__':
    reg = json.loads(subprocess.check_output(['node', '-e', "import('./src/data/airports.js').then(m=>console.log(JSON.stringify(Object.fromEntries(Object.entries(m.AIRPORTS).map(([k,a])=>[k,a.rwys.map(r=>({llA:r.llA,llB:r.llB,eA:r.eA,eB:r.eB}))])))))"], cwd=ROOT))
    out = {}
    with rasterio.open(COG) as ds:
        for ic in sys.argv[1:]:
            dem, thr = run(ic, reg[ic], ds); out[ic] = dem
            print(ic, f"{dem['nx']}x{dem['ny']} zmax {dem['zmax']} m | THR DTM vs registry:", [(t, (r['eA'], r['eB'])) for t, r in zip(thr, reg[ic])], file=sys.stderr)
    print(json.dumps(out))
