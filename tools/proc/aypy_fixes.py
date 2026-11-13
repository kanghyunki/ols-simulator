# AYPY (Jacksons) procedure points that the charts give only as distance / bearing (AIP PNG Flight Supplement 23 JAN 2025,
# charts dated 12 SEP 2019 – 21 APR 2022), placed from the AD 2 threshold coordinates. Prints lines for src/data/procedures.js.
# Magnetic variation 6° E (charts). python tools/proc/aypy_fixes.py
from math import radians, degrees, sin, cos, asin, atan2
R = 3440.065                       # Earth radius, NM
def dms(d, m, s): return d + m / 60 + s / 3600
T14L = (-dms(9, 25, 51.18), dms(147, 12, 50.07)); T32R = (-dms(9, 27, 7.27), dms(147, 13, 37.11))   # AD 2.12, 30 OCT 2025
def brg(a, b):
    la1, lo1, la2, lo2 = map(radians, (*a, *b))
    return (degrees(atan2(sin(lo2 - lo1) * cos(la2), cos(la1) * sin(la2) - sin(la1) * cos(la2) * cos(lo2 - lo1))) + 360) % 360
def dest(p, b, d):
    la, lo, b, d = radians(p[0]), radians(p[1]), radians(b), d / R
    la2 = asin(sin(la) * cos(d) + cos(la) * sin(d) * cos(b)); lo2 = lo + atan2(sin(b) * sin(d) * cos(la), cos(d) - sin(la) * sin(la2))
    return degrees(la2), degrees(lo2)
VAR = 6.0
RW = brg(T14L, T32R)              # landing direction of 14L (true)
print(f'// runway 14L→32R true bearing {RW:.2f}°')
out14, out32 = (RW + 180) % 360, RW  # bearing from each threshold out along its approach
def pt(name, p, ft, ap=False): return f"['{name}', {p[0]:.6f}, {p[1]:.6f}, {ft}{', ' + repr('ap') if ap else ''}]"
P = {}
# ILS RWY 14L: IAF D7.8 IWG = 7.6 NM fm THR (2500), FAF D4.1 IWG = 3.9 NM (GP check 1400); MA 142° to 1500, right onto 322° to 2500, hold D9 PY
P['IAF14'] = dest(T14L, out14, 7.6); P['FAF14'] = dest(T14L, out14, 3.9); P['D8IWG'] = dest(T14L, out14, 7.8)
P['MA1500'] = dest(T14L, RW, 4.5); P['MATURN14'] = dest(P['MA1500'], RW + 90, 1.5)
# RNAV RWY 14L: VIMIB 10.9 NM, YPYNF 4.9, YPYNZ 2.9, MAPt YPYNM at THR; MA DCT YPYNT (5.0 NM past), right DCT YPYNH (257°M / 7.8 NM fm YPYNT), 323°M to 2900
for n, d in (('VIMIB', 10.9), ('YPYNF', 4.9), ('YPYNZ', 2.9)): P[n] = dest(T14L, out14, d)
P['YPYNT'] = dest(T14L, RW, 5.0); P['YPYNH'] = dest(P['YPYNT'], 257 + VAR, 7.8); P['MAEND14'] = dest(P['YPYNH'], 323 + VAR, 4.0)
# ILS RWY 32R PROC A: TESEM (AIP SUP 7/19) 4000, outbound 160°M 2.5 min, base turn to LLZ, FAF 5.8 NM fm THR (2000); MA 322° to 2500, left DCT TESEM 4000
TESEM = (-dms(9, 27, 39), dms(147, 13, 57))
P['OUT'] = dest(TESEM, 160 + VAR, 7.0); P['JOIN'] = dest(T32R, out32, 8.0); P['FAF32'] = dest(T32R, out32, 5.8)
P['MA2500'] = dest(T32R, (RW + 180) % 360, 5.0)
# RNAV RWY 32R: ISLOK 11 NM fm MAPt, YPYSF 4, MAPt YPYSM 1.7 NM before THR; MA DCT YPYST (6.7 NM), left DCT YPYSH (184°M / 12.0 NM), 143°M to 2900
P['YPYSM'] = dest(T32R, out32, 1.7); P['YPYSF'] = dest(T32R, out32, 5.7); P['ISLOK'] = dest(T32R, out32, 12.7)
P['YPYST'] = dest(P['YPYSM'], (RW + 180) % 360, 6.7); P['YPYSH'] = dest(P['YPYST'], 184 + VAR, 12.0); P['MAEND32'] = dest(P['YPYSH'], 143 + VAR, 4.0)
for k, v in P.items(): print(f'{k:9s} {v[0]:.6f} {v[1]:.6f}  {brg(T14L, v):6.1f}°')
# sanity: TESEM should sit about 0.6 NM SE of THR 32R on the chart profile
from math import hypot
print('TESEM from THR 32R: bearing %.1f°' % brg(T32R, TESEM))
