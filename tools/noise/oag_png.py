# OAG 2026 schedule (KECC_2026.csv) -> annual movements, fleet mix and evening/night shares for the PNG airports
# in src/data/noise-traffic.js.  python tools/noise/oag_png.py [csv]
import csv, sys, collections
SRC = sys.argv[1] if len(sys.argv) > 1 else r"D:\26-PNG MP\02_수신자료\02_PNG-OAG DATA\KECC_2026.csv"
IATA = {'POM': 'PMIA', 'LAE': 'AYNZ', 'HGU': 'AYMH', 'RAB': 'AYTK', 'WWK': 'AYWK', 'MAG': 'AYMD', 'GKA': 'AYGA', 'HKN': 'AYHK',
        'BUA': 'AYBK', 'GUR': 'AYGN', 'MAS': 'AYMO', 'KVG': 'AYKV', 'VAI': 'AYVN', 'UNG': 'AYKI', 'DAU': 'AYDU'}
# OAG aircraft code -> ANP stand-in (only these ANP types are bundled in noise-anp.js)
JET_NB = {'73H', '738', '7M8', '73G', '737', '73W', '320', '32N', '321', '32Q', '319', '32A', '32B'}
WIDE = {'332', '333', '330', '339', '763', '764', '767', '76W', '788', '789', '781', '772', '77W', '359'}
REGJET = {'100', 'F100', '70', 'F70', '220', '221', '223', '22N', 'E90', 'E95', 'E75', 'E70', 'E7W', 'CR9', '717'}
def anp(code):
    if code in JET_NB: return '737800'
    if code in WIDE: return 'A330-343'
    if code in REGJET: return 'F10062'
    return 'ATR72'   # turboprops (ATR, Dash 8) and smaller types
def band(hhmm):
    h = int(hhmm[:2]); return 'night' if h >= 22 or h < 7 else 'evening' if h >= 19 else 'day'

mov = collections.Counter(); fleet = collections.defaultdict(collections.Counter); tod = collections.defaultdict(collections.Counter)
codes = collections.defaultdict(collections.Counter); seen = set(); dup = 0
with open(SRC, encoding='utf-8-sig', newline='') as f:
    for r in csv.DictReader(f):
        key = (r['Dep Airport Code'], r['Arr Airport Code'], r['Local Dep Time'], r['Time series'], r['Specific Aircraft Code'], r['Carrier Code'], r['Flight No'])
        if key in seen: dup += 1; continue
        seen.add(key); n = int(r['Frequency'] or 0); ac = r['Specific Aircraft Code'].strip()
        for end, t in ((r['Dep Airport Code'], r['Local Dep Time']), (r['Arr Airport Code'], r['Local Arr Time'])):
            ap = IATA.get(end)
            if not ap: continue
            mov[ap] += n; fleet[ap][anp(ac)] += n; tod[ap][band(t.zfill(4))] += n; codes[ap][ac] += n
print('duplicate rows skipped:', dup)
for ap in IATA.values():
    m = mov[ap]
    if not m: print(ap, 'no movements'); continue
    fl = [[k, round(v / m, 2)] for k, v in fleet[ap].most_common() if v / m >= 0.005]
    print(f"{ap}: annual {m}, evening {tod[ap]['evening']/m:.3f}, night {tod[ap]['night']/m:.3f}, fleet {fl}")
    print('   types', codes[ap].most_common(8))
