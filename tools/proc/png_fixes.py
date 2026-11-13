# PNG aerodrome instrument approaches from the AIP Papua New Guinea Flight Supplement (23 JAN 2025, read on screen).
# The charts give most fixes as distances from the MAPt / threshold and tracks between them, not coordinates, so every
# point is placed from the airports.js thresholds: final-approach fixes along the runway axis, feeder / missed-approach
# points by chart track (°M + variation) and distance. Altitudes are the chart altitudes; turn points that the chart
# only implies are marked 'ap'. Writes src/data/procedures-png.js.   python tools/proc/png_fixes.py
import re, os
from math import radians, degrees, sin, cos, asin, atan2
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
R = 3440.065
def dest(p, b, d):
    la, lo, b, d = radians(p[0]), radians(p[1]), radians(b), d / R
    la2 = asin(sin(la) * cos(d) + cos(la) * sin(d) * cos(b)); lo2 = lo + atan2(sin(b) * sin(d) * cos(la), cos(d) - sin(la) * sin(la2))
    return (degrees(la2), degrees(lo2))
def brg(a, b):
    la1, lo1, la2, lo2 = map(radians, (*a, *b))
    return (degrees(atan2(sin(lo2 - lo1) * cos(la2), cos(la1) * sin(la2) - sin(la1) * cos(la2) * cos(lo2 - lo1))) + 360) % 360

# runway thresholds from src/data/airports.js
src = open(os.path.join(ROOT, 'src', 'data', 'airports.js'), encoding='utf-8').read()
keys = [(m.start(), m.group(1)) for m in re.finditer(r"\n  ([A-Z]{3,4}):\{", src)]
THR = {}
for i, (p, k) in enumerate(keys):
    b = src[p: keys[i + 1][0] if i + 1 < len(keys) else len(src)]
    for m in re.finditer(r"nameA:'(\w+)', nameB:'(\w+)'.*?llA:\[([^\]]+)\].*?llB:\[([^\]]+)\]", b, re.S):
        A = tuple(eval(x) for x in m.group(3).split(',')); B = tuple(eval(x) for x in m.group(4).split(','))
        THR[(k, m.group(1))] = (A, brg(A, B)); THR[(k, m.group(2))] = (B, brg(B, A))

class Proc:
    """Builds one procedure. Bearings in °M (chart), converted with the aerodrome's variation."""
    def __init__(s, ap, rwy, var, thr_ft):
        s.ap, s.rwy, s.var = ap, rwy, var; s.T, s.land = THR[(ap, rwy)]; s.thr = ['THR ' + rwy, *s.T, thr_ft + 50]
    def axis(s, d):                     # d NM before the threshold on the extended centre line
        return dest(s.T, s.land + 180, d)
    def past(s, d):                     # d NM beyond the threshold along the landing direction
        return dest(s.T, s.land, d)
    def back(s, p, trk, d):             # the point from which `trk`°M for `d` NM reaches p
        return dest(p, trk + s.var + 180, d)
    def fwd(s, p, trk, d):
        return dest(p, trk + s.var, d)
def fx(name, p, ft, ap=False): return [name, p[0], p[1], ft] + (['ap'] if ap else [])

P = {}   # airport → list of procedures (id, rwy, name, colour, paths)
def add(ap, pid, rwy, name, color, paths, ops=None): P.setdefault(ap, []).append((pid, rwy, name, color, paths, ops))
G, B, Y, V = 0x3ddc84, 0x38bdf8, 0xfacc15, 0xc084fc

# BUKA (AYBK) RNAV (GNSS) RWY 04 (12 SEP 2019), var 7°E. Runway 04 is the 05 end in airports.js.
p = Proc('AYBK', '05', 7, 10); I = p.axis(9.9)
add('AYBK', 'RNP04', '05', 'RNAV (GNSS) RWY 04', G, [
  [fx('YBKWE', p.back(I, 41, 5), 3000), fx('YBKWI', I, 3000), fx('YBKWF', p.axis(4.8), 1700), fx('YBKWZ', p.axis(2.5), 910), p.thr],
  [fx('YBKWG', p.back(I, 111, 5), 3000), fx('YBKWI', I, 3000)], [fx('YBKWD', p.back(I, 331, 5), 3000), fx('YBKWI', I, 3000)],
  ('ma', [p.thr, fx('YBKWH', p.past(5.0), 1300, True), fx('041° 3000', p.fwd(p.past(5.0), 41, 4), 3000, True)])])

# DARU (AYDU) RNAV (GNSS) RWY 14 / RWY 32 (12 SEP 2019), var 5°E
for rwy, pre, ti, tw, te, A_, B_, C_, thr in (('14', 'YDUN', 130, 'YDUND', 'YDUNJ', 60, 200, 130, 18), ('32', 'YDUS', 310, 'YDUSC', 'YDUSA', 20, 240, 310, 21)):
    p = Proc('AYDU', rwy, 5, thr); I = p.axis(10.1); H = p.past(4.5)
    add('AYDU', 'RNP' + rwy, rwy, f'RNAV (GNSS) RWY {rwy}', G if rwy == '14' else B, [
      [fx(pre + ('E' if rwy == '14' else 'B'), p.back(I, C_, 5), 1700), fx(pre + 'I', I, 1700), fx(pre + 'F', p.axis(5.1), 1700), p.thr],
      [fx(tw, p.back(I, A_, 5), 1700), fx(pre + 'I', I, 1700)], [fx(te, p.back(I, B_, 5), 1700), fx(pre + 'I', I, 1700)],
      ('ma', [p.thr, fx(pre + 'H', H, 1000, True), fx(f'{ti}° 1700', p.fwd(H, ti, 3), 1700, True)])])

# GOROKA (AYGA) RNAV-Z (GNSS) RWY 35L (05 OCT 2023), var 5°E. MAPt YGASZ 3.8 NM before the threshold (visual segment).
p = Proc('AYGA', '35L', 5, 5103); M = p.axis(3.8); I = p.axis(3.8 + 10.5); H = p.fwd(M, 125, 8.6)
add('AYGA', 'RNPZ35L', '35L', 'RNAV-Z (GNSS) RWY 35L', G, [
  [fx('YGASA', p.back(I, 323, 10.3), 12600), fx('YGASI', I, 9700), fx('YGASF', p.axis(3.8 + 5.8), 8200), fx('YGASG', p.axis(3.8 + 4.2), 7700),
   fx('YGASZ', M, 6400), p.thr],
  ('ma', [fx('YGASZ', M, 6400), fx('YGASH', H, 8000, True), fx('104° 12600', p.fwd(H, 104, 8), 12600, True)])])
# RNAV-Y (GNSS) RWY 35L (05 OCT 2023): the same IF / FAF / SDF (14.3 / 9.6 / 8.0 NM from the threshold) and YGASH, MAPt YGASY 3.0 NM out
MY = p.axis(3.0)
add('AYGA', 'RNPY35L', '35L', 'RNAV-Y (GNSS) RWY 35L', B, [
  [fx('YGASA', p.back(I, 323, 10.5), 12600), fx('YGASI', I, 9700), fx('YGASF', p.axis(9.6), 8200), fx('YGASG', p.axis(8.0), 7700),
   fx('YGASY', MY, 6200), p.thr],
  ('ma', [fx('YGASY', MY, 6200), fx('YGASH', H, 8000, True), fx('104° 12600', p.fwd(H, 104, 8), 12600, True)])])

# KAVIENG (AYKV) RNAV (GNSS) RWY 30 (12 SEP 2019), var 6°E
p = Proc('AYKV', '30', 6, 15); I = p.axis(10.1); H = p.past(5)
add('AYKV', 'RNP30', '30', 'RNAV (GNSS) RWY 30', G, [
  [fx('YKVEE', p.back(I, 299, 5), 3400), fx('YKVEI', I, 3000), fx('YKVEF', p.axis(5.1), 1700), p.thr],
  [fx('YKVED', p.back(I, 229, 5), 3400), fx('YKVEI', I, 3000)], [fx('YKVEG', p.back(I, 9, 5), 3400), fx('YKVEI', I, 3000)],
  ('ma', [p.thr, fx('YKVEH', H, 1100, True), fx('299° 3400', p.fwd(H, 299, 5), 3400, True)])])

# KIUNGA (AYKI) RNAV (GNSS) RWY 07 (12 SEP 2019), var 4°E
p = Proc('AYKI', '07', 4, 88); I = p.axis(10.2); H = p.past(5)
add('AYKI', 'RNP07', '07', 'RNAV (GNSS) RWY 07', G, [
  [fx('UNGWG', p.back(I, 159, 5), 2000), fx('UNGWI', I, 2000), fx('UNGWF', p.axis(5.2), 1800), p.thr],
  [fx('UNGWD', p.back(I, 339, 5), 2000), fx('UNGWI', I, 2000)],
  ('ma', [p.thr, fx('UNGWH', H, 1000, True), fx('069° 2000', p.fwd(H, 69, 3), 2000, True)])])

# LAE/NADZAB (AYNZ) RNAV (GNSS) RWY 27 / RWY 09 (10 SEP 2020), var 5°E
p = Proc('AYNZ', '27', 5, 216); I = p.axis(11.1); H = p.past(5); LARID = p.back(I, 328, 10)
add('AYNZ', 'RNP27', '27', 'RNAV (GNSS) RWY 27', G, [
  [fx('LARID', LARID, 7600), fx('YNZEI', I, 3600), fx('YNZEZ', p.axis(8.6), 3010), fx('YNZEF', p.axis(5.1), 1900), p.thr],
  # DCT YNZEH, track 270°, at or above 2 700 ft turn left DCT LARID, climb to 7 600 ft
  ('ma', [p.thr, fx('YNZEH', H, 2700, True), fx('left turn', p.fwd(H, 180, 2.5), 4000, True), fx('LARID', LARID, 7600)])])
p = Proc('AYNZ', '09', 5, 238); I = p.axis(10.1); H = p.past(5)
add('AYNZ', 'RNP09', '09', 'RNAV (GNSS) RWY 09', B, [
  [fx('YNZWA', p.back(I, 0, 8.5), 6900), fx('YNZWI', I, 3300), fx('YNZWF', p.axis(5.1), 1900), p.thr],
  [fx('WESFI', p.back(I, 86, 8.4), 6900), fx('YNZWI', I, 3300)],
  ('ma', [p.thr, fx('YNZWH', H, 2000, True), fx('LARID', LARID, 7600)])])

# MADANG (AYMD) RNAV (GNSS) RWY 25 (05 NOV 2020) / RWY 07 (12 SEP 2019), var 5°E
p = Proc('AYMD', '25', 5, 4); I = p.axis(10.2); D = p.back(I, 320, 6)
add('AYMD', 'RNP25', '25', 'RNAV (GNSS) RWY 25', G, [
  [fx('YMDNC', p.back(I, 250, 6), 2700), fx('YMDNI', I, 2700), fx('YMDNF', p.axis(5.2), 1700), p.thr],
  [fx('YMDNA', p.back(I, 180, 6), 2700), fx('YMDNI', I, 2700)], [fx('YMDND', D, 2700), fx('YMDNI', I, 2700)],
  ('ma', [p.thr, fx('left turn', p.fwd(p.past(1.5), 160, 1.5), 1200, True), fx('YMDND', D, 2700)])])
# RWY 07 is an offset approach: final track 058° against the 070° runway, so its fixes lie on the 058° line through the MAPt
p = Proc('AYMD', '07', 5, 18); M = p.back(p.T, 58, 0.7); fin = lambda d: p.back(M, 58, d); I = fin(10.6); H = p.fwd(M, 58, 5)
add('AYMD', 'RNP07', '07', 'RNAV (GNSS) RWY 07', B, [
  [fx('YMDWE', p.back(I, 58, 6), 5600), fx('YMDWI', I, 3690), fx('YMDWF', fin(5.6), 2100), fx('YMDWZ', fin(2.5), 1100), fx('YMDWM', M, 300), p.thr],
  [fx('YMDWG', p.back(I, 128, 6), 5600), fx('YMDWI', I, 3690)], [fx('YMDWD', p.back(I, 348, 6), 5600), fx('YMDWI', I, 3690)],
  ('ma', [fx('YMDWM', M, 300), fx('YMDWH', H, 1300, True), fx('058° 2700', p.fwd(H, 58, 3), 2700, True)])])

# RABAUL/TOKUA (AYTK) RNAV (GNSS) RWY 28 / RWY 10 (10 SEP 2020), var 6°E
p = Proc('AYTK', '28', 6, 49); I = p.axis(10); H = p.past(5)
add('AYTK', 'RNP28', '28', 'RNAV (GNSS) RWY 28', G, [
  [fx('YTKSD', p.back(I, 190, 6), 3600), fx('YTKSI', I, 3000), fx('YTKSF', p.axis(5), 1700), p.thr],
  [fx('YTKSG', p.back(I, 10, 6), 3600), fx('YTKSI', I, 3000)],
  ('ma', [p.thr, fx('YTKSH', H, 1100, True), fx('280° 4300', p.fwd(H, 280, 4), 4300, True)])])
p = Proc('AYTK', '10', 6, 16); I = p.axis(9.8); T = p.past(3); H = p.fwd(T, 358, 8)
add('AYTK', 'RNP10', '10', 'RNAV (GNSS) RWY 10', B, [
  [fx('YTKWB', p.back(I, 100, 6), 4300), fx('YTKWI', I, 2800), fx('YTKWF', p.axis(5.1), 1700), p.thr],
  [fx('YTKWA', p.back(I, 10, 6), 4300), fx('YTKWI', I, 2800)],
  ('ma', [p.thr, fx('YTKWT', T, 800, True), fx('YTKWH', H, 2500, True), fx('300° 4300', p.fwd(H, 300, 4), 4300, True)])])

# WEWAK/BORAM (AYWK) RNAV (GNSS) A (05 NOV 2020), var 4°E: final 100° onto RWY 10 (150 m lateral offset), circling minima
p = Proc('AYWK', '10', 4, 15); I = p.axis(10); H = p.past(5)
add('AYWK', 'RNPA', '10', 'RNAV (GNSS) A', Y, [
  [fx('YWKWE', p.back(I, 100, 6), 5200), fx('YWKWI', I, 3250), fx('YWKWF', p.axis(5.5), 1800), p.thr],
  [fx('YWKWG', p.back(I, 190, 6), 5200), fx('YWKWI', I, 3250)], [fx('YWKWD', p.back(I, 10, 6), 5200), fx('YWKWI', I, 3250)],
  ('ma', [p.thr, fx('YWKWH', H, 1100, True), fx('100° 3100', p.fwd(H, 100, 4), 3100, True)])])

# ALOTAU/GURNEY (AYGN) RNAV (GNSS) A (30 JAN 2020), var 7°E: 3.5° final 092° towards RWY 09, MAPt 1.5 NM before the threshold
p = Proc('AYGN', '09', 7, 82); M = p.axis(1.5); F = p.axis(1.5 + 7.8); X = p.back(F, 62, 2.5); Iw = p.back(X, 62, 4.5); H = p.fwd(M, 100, 8.2)
add('AYGN', 'RNPA', '09', 'RNAV (GNSS) A', Y, [
  [fx('YGNWD', p.back(Iw, 63, 6), 5800), fx('YGNWI', Iw, 5800), fx('YGNWX', X, 4530), fx('YGNWF', F, 3600), fx('YGNWY', p.axis(1.5 + 5), 2550),
   fx('YGNWZ', p.axis(1.5 + 2), 1440), fx('YGNWM', M, 710), p.thr],
  ('ma', [fx('YGNWM', M, 710), fx('YGNWH', H, 2500, True), fx('100° 5100', p.fwd(H, 100, 4), 5100, True)])])

# KIMBE/HOSKINS (AYHK) RNAV (GNSS) A (12 SEP 2019), var 6°E: final 285°, MAPt 0.7 NM before RWY 30, circling
p = Proc('AYHK', '30', 6, 77); M = p.axis(0.7)
ax = lambda d: p.back(M, 285, d)
I = ax(13.2); H = p.fwd(M, 285, 5)
add('AYHK', 'RNPA', '30', 'RNAV (GNSS) A', Y, [
  [fx('YHKEA', p.back(I, 240, 8.6), 5000), fx('YHKEI', I, 2500), fx('YHKEF', ax(8.2), 2000), fx('YHKEZ', ax(2.7), 1450), fx('YHKEM', M, 1180), p.thr],
  [fx('YHKEC', p.back(I, 15, 8.8), 5700), fx('YHKEI', I, 2500)],
  ('ma', [fx('YHKEM', M, 1180), fx('YHKEH', H, 2500, True), fx('285° 5000', p.fwd(H, 285, 5), 5000, True)])])

# MT HAGEN/KAGAMUGA (AYMH) RNAV (GNSS) A (31 OCT 2024), var 5°E: final 237° to the MAPt over the aerodrome, circling
p = Proc('AYMH', '30', 5, 5386); M = dest(p.T, p.land, 0.7)          # MAPt over the runway (mid-field)
F = p.back(M, 237, 7.7); I = p.back(F, 267, 5); O = p.fwd(M, 237, 9.3)
add('AYMH', 'RNPA', '30', 'RNAV (GNSS) A', Y, [
  [fx('YMHEA', p.back(I, 197, 10), 12200), fx('YMHEI', I, 10000), fx('YMHEF', F, 8800), fx('YMHEM', M, 7250, True)],
  [fx('YMHEB', p.back(I, 296, 6), 10800), fx('YMHEI', I, 10000)],
  ('ma', [fx('YMHEM', M, 7250, True), fx('OTGIS', O, 8500, True), fx('BETLA', p.fwd(O, 171, 8), 9400, True)])])

# MOMOTE (AYMO) NDB (10 NOV 2016), var 4.9°E: MOE NDB at the aerodrome, outbound 348° 2 min, base turn, inbound 150° onto RWY 16
p = Proc('AYMO', '16', 4.9, 12); N = p.T
add('AYMO', 'NDB', '16', 'NDB', Y, [
  [fx('MOE NDB', N, 2000, True), fx('348° 2 min', p.fwd(N, 348, 5), 1800, True), fx('base turn', p.fwd(N, 333, 5.5), 1500, True),
   fx('150° inbound', p.back(N, 150, 2.5), 1000, True), p.thr],
  ('ma', [p.thr, fx('150° 2000', p.past(5), 2000, True)])])

# VANIMO (AYVN) NDB (26 APR 2018), var 3.7°E: VNO NDB at the aerodrome, outbound 086° 2 min, right turn, inbound 287°, circling to RWY 30
p = Proc('AYVN', '30', 3.7, 16); N = dest(p.T, p.land, 0.6)
add('AYVN', 'NDB', '30', 'NDB', Y, [
  [fx('VNO NDB', N, 4500, True), fx('086° 2 min', p.fwd(N, 86, 6), 3500, True), fx('right turn', p.fwd(N, 96, 8), 3000, True),
   fx('287° inbound', p.back(p.T, 287, 4), 2500, True), fx('MDA', p.back(p.T, 287, 1), 1300, True), p.thr],
  ('ma', [p.thr, fx('VNO NDB', N, 1300, True), fx('005° 3500', p.fwd(N, 5, 5), 3500, True)])])

# ---- VOR procedures. The VOR positions come from the charts themselves: PY from the MAPt's distance to the threshold and
# its DME (the VOR/DME 14L and 32R charts agree within 0.01 NM), NZ 1.9 DME at THR 27 (VOR/DME 27), KVG 1.0 DME at THR 12.
P2, P3, P4 = 0xf472b6, 0x2dd4bf, 0xa3e635
# PORT MORESBY/JACKSONS (AYPY = PMIA), var 6°E. Take-off 14L / landing 32R as the other PMIA procedures (AD 2.21.1).
p = Proc('PMIA', '14L', 6, 103); M = p.fwd(p.T, 322, 2.5); PY = p.fwd(M, 152, 3.7); F = p.fwd(PY, 332, 10)
add('PMIA', 'VORDME14L', '14L', 'VOR/DME RWY 14L', P2, [      # 21 APR 2022
  [fx('PY VOR', PY, 4000), fx('R317 outbound', p.fwd(PY, 317, 9), 3000, True), fx('base turn', p.fwd(PY, 325, 11), 2500, True),
   fx('10 DME', F, 2500), fx('3.7 DME', M, 850), p.thr],
  # 142° DR track to 2 500 ft, right turn direct PY, climb to 4 000 ft
  ('ma', [p.thr, fx('2500 ft', p.fwd(p.T, 142, 5), 2500, True), fx('PY VOR', PY, 4000)])], ops='dep')
p = Proc('PMIA', '32R', 6, 128); M = p.fwd(p.T, 142, 2.6); F = p.fwd(PY, 130, 8)
for pid, name, col, fafn, mapn, mda, sub in (('VORDME32R', 'VOR/DME RWY 32R', P3, '8 DME', '3 DME', 800, M),     # 27 APR 2017
                                             ('VOR32R', 'VOR RWY 32R', P4, '310° inbound', 'PY VOR', 1000, PY)):  # timed: 148° 2.5 min, MAPt over PY
    add('PMIA', pid, '32R', name, col, [
      [fx('PY VOR', PY, 4000), fx('R148 outbound', p.fwd(PY, 148, 8.3), 3000, True), fx('base turn', p.fwd(PY, 140, 9.5), 2400, True),
       fx(fafn, F, 2400, fafn != '8 DME'), fx(mapn, sub, mda), p.thr],
      ('ma', [p.thr, fx('2500 ft', p.fwd(p.T, 322, 5), 2500, True), fx('PY VOR', PY, 4000)])], ops='arr')
# LAE/NADZAB (AYNZ), var 5.4°E (VOR charts)
p = Proc('AYNZ', '09', 5.4, 238); q = Proc('AYNZ', '27', 5.4, 216); NZ = q.past(1.9)
LARID_N = q.back(q.axis(11.1), 328, 10)       # the RNAV LARID: 20.2 DME / 114.5° from NZ (chart 20 DME / 115°)
add('AYNZ', 'VORDME09', '09', 'VOR/DME RWY 09 (via WESFI)', P2, [   # 10 SEP 2020
  [fx('WESFI 18 DME', p.fwd(NZ, 268, 18), 6000), fx('IF 10 DME', p.fwd(NZ, 268, 10), 2600), fx('FAF 5 DME', p.fwd(NZ, 268, 5), 1500),
   fx('MAPt 0.6 DME', p.fwd(NZ, 268, 0.6), 650), p.thr],
  # 088° DR track to 1 500 ft, right turn direct NZ, track 268° to WESFI, climb to 6 000 ft
  ('ma', [p.thr, fx('1500 ft', p.fwd(NZ, 88, 4), 1500, True), fx('NZ VOR', NZ, 3000, True), fx('WESFI 18 DME', p.fwd(NZ, 268, 18), 6000)])])
FZ = p.fwd(NZ, 88, 6.7); IF27 = q.back(FZ, 306, 5.6)
add('AYNZ', 'VORDME27', '27', 'VOR/DME RWY 27 (via LARID)', P3, [   # 10 SEP 2020
  [fx('LARID 20 DME', LARID_N, 6300), fx('IF 12 DME', IF27, 3000), fx('FAF 6.7 DME', FZ, 1700), q.thr],
  # 268° DR track to 2 000 ft, left turn direct NZ, track 115° to LARID, climb to 6 300 ft
  ('ma', [q.thr, fx('2000 ft', q.past(3), 2000, True), fx('NZ VOR', NZ, 3000, True), fx('LARID 20 DME', LARID_N, 6300)])])
add('AYNZ', 'VOR09', '09', 'VOR RWY 09', P4, [                      # 10 SEP 2020: outbound 285° 4.5 min, left turn, inbound 088°, MAPt over NZ
  [fx('NZ VOR', NZ, 6000), fx('285° 4.5 min', p.fwd(NZ, 285, 11), 3500, True), fx('left turn', p.fwd(NZ, 279, 12.5), 2500, True),
   fx('088° inbound', p.fwd(NZ, 268, 8), 2500, True), fx('NZ VOR (MAPt)', NZ, 750), p.thr],
  ('ma', [p.thr, fx('1500 ft', p.fwd(NZ, 88, 3), 1500, True), fx('R115', p.fwd(NZ, 115, 8), 3500, True), fx('LARID', LARID_N, 6300)])])
# KAVIENG (AYKV) DVOR/DME RWY 12 (12 SEP 2019), var 6°E: KVG 1.0 DME at THR 12, outbound 321°/314° 3 min, inbound 122°
p = Proc('AYKV', '12', 6, 12); KVG = p.past(1.0)
add('AYKV', 'DVOR12', '12', 'DVOR/DME RWY 12', P2, [
  [fx('KVG DVOR', KVG, 2500), fx('R321 3 min', p.fwd(KVG, 318, 8), 2000, True), fx('base turn', p.fwd(KVG, 308, 8.5), 1500, True),
   fx('D6.0 KVG', p.fwd(KVG, 302, 6), 1200), fx('D2.0 KVG', p.fwd(KVG, 302, 2), 490), p.thr],
  # track 122° climbing to 2 500 ft, passing 5.5 DME turn left direct KVG
  ('ma', [p.thr, fx('D5.5 KVG', p.fwd(KVG, 122, 5.5), 1800, True), fx('KVG DVOR', KVG, 2500)])])

# ---- write src/data/procedures-png.js
def leg(l):
    n, la, lo, ft, *f = l
    return f"['{n}', {la:.6f}, {lo:.6f}, {ft}{', ' + repr(f[0]) if f else ''}]"
out = ['// Generated by tools/proc/png_fixes.py from the AIP Papua New Guinea Flight Supplement (23 JAN 2025). Do not edit by hand.',
       '// Fixes are placed from the airports.js thresholds by chart distance and track; \'ap\' marks a turn point the chart only implies.',
       '// PMIA here holds only its VOR procedures; procedures.js appends them to the ILS / RNAV ones.',
       'export const PNG_PROCEDURES = {']
for ap, procs in P.items():
    out.append(f'  {ap}: [')
    for pid, rwy, name, col, paths, ops in procs:
        out.append(f"    {{ id: '{pid}', {f"ops: '{ops}', " if ops else ''}rwy: '{rwy}', name: '{name}', color: 0x{col:06x}, paths: [")
        for path in paths:
            ma = isinstance(path, tuple); legs = path[1] if ma else path
            out.append(f"      {{ {'ma: true, ' if ma else ''}legs: [{', '.join(leg(l) for l in legs)}] }},")
        out.append('    ] },')
    out.append('  ],')
out.append('};')
open(os.path.join(ROOT, 'src', 'data', 'procedures-png.js'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
# self-check: every final ends at its threshold, every feeder joins a fix of the main path, all inside 60 NM of the runway
for ap, procs in P.items():
    for pid, rwy, name, col, paths, ops in procs:
        T = THR[(ap, rwy)][0]; main = paths[0]; names = {l[0] for l in main}
        assert main[-1][0] in ('THR ' + rwy,) or main[-1][-1] == 'ap', (ap, pid)
        for path in paths[1:]:
            if not isinstance(path, tuple): assert path[-1][0] in names, (ap, pid, path[-1][0])
        for path in paths:
            for l in (path[1] if isinstance(path, tuple) else path):
                d = 60 * ((l[1] - T[0]) ** 2 + ((l[2] - T[1]) * cos(radians(T[0]))) ** 2) ** .5
                assert d < 60, (ap, pid, l[0], d)
print('wrote', sum(len(v) for v in P.values()), 'procedures for', len(P), 'airports')
