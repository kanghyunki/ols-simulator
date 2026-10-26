// Instrument procedures drawn as 3D paths over the OLS. Altitudes in ft AMSL (chart minimums, flown as straight legs).
// Each procedure: rwy = landing runway end; ops = the runway's role for the animated aircraft ('arr' arrivals only, 'dep' departures only); paths = [{ ma?, legs: [[fix, lat, lon, alt ft, 'ap'?]] }] in flight order; ma = missed approach;
// 'ap' = approximated point, not a published fix: the missed-approach turn at 500 ft is put at the runway end, and the
// DME turn point where the published heading reaches the DME distance, with the altitude from the 2.5 % minimum climb.
const dms = (d, m, s) => d + m / 60 + s / 3600;
const PAMBI = dms(37, 10, 54.3), PAMBI_E = dms(126, 32, 34.4), ENPIL = dms(37, 9, 39.0), ENPIL_E = dms(126, 43, 34.0);
const GE973 = ['GE973', dms(37, 27, 47.0), dms(126, 13, 29.0), 3000], PY985 = ['PY985', dms(37, 23, 19.6), dms(126, 5, 55.4), 3000];
// RKSI 15L/15R/16L/16R (south-flow) fixes
const MUNAN = dms(37, 34, 9.3), MUNAN_E = dms(126, 11, 53.0), BITIM = dms(37, 40, 48.0), BITIM_E = dms(126, 24, 36.1);
const OLTEM = ['OLTEM', dms(37, 40, 18.2), dms(126, 20, 46.3), 3000], ATKON = ['ATKON', dms(37, 39, 59.6), dms(126, 18, 23.2), 3000];
const GC966 = ['GC966', dms(37, 17, 53.0), dms(126, 18, 58.0), 4000], DH989 = ['DH989', dms(37, 18, 55.0), dms(126, 19, 59.0), 2000];

// RKSS / RKPC / RKPK fixes shared between procedures (AIP data tabulations)
const DOKDO = dms(37, 36, 17.1), DOKDO_E = dms(126, 33, 7.1), CAVOI = dms(37, 32, 2.0), CAVOI_E = dms(126, 33, 37.0);
const APOMO = dms(37, 27, 20.9), APOMO_E = dms(127, 11, 4.4), BUMSI = dms(37, 15, 10.2), BUMSI_E = dms(127, 10, 9.6), SUNEM = dms(37, 17, 0.6), SUNEM_E = dms(126, 50, 21.9);
const D5KIP_N = dms(37, 36, 59.7), D5KIP_N_E = dms(126, 43, 4.6);
const PC404 = dms(33, 32, 42.3), PC404_E = dms(126, 33, 23.4), PETAA = dms(33, 31, 18.0), PETAA_E = dms(126, 55, 34.0);
const ICJU_D53 = ['D5.3 ICJU', dms(33, 27, 18.5), dms(126, 22, 53.6), 1800], ICHE_D53 = ['D5.3 ICHE', dms(33, 33, 36.2), dms(126, 35, 8.4), 1800];
const LOTKA = ['LOTKA', dms(33, 21, 11.1), dms(126, 6, 52.2), 6000], R066_D16 = ['R066 D16', 33.652393, 126.759075, 4000, 'ap'];
const AKEVI = ['AKEVI', dms(34, 58, 29.0), dms(128, 57, 48.0), 3300], KEVOX = dms(35, 0, 51.7), KEVOX_E = dms(128, 43, 47.2);

// AIP Republic of Korea RKSI AD CHART 2-62/64/67/69 (+ -1 data tabulation), ILS or LOC RWY 33L/33R/34L/34R CAT II & III,
// AIRAC AIP AMDT 13/25, WEF 21 JAN 2026. THR elevation 23 ft; the path ends at THR + RDH.
export const PROCEDURES = {
  ICN: [
    { id: 'ILS33L', ops: 'dep', rwy: '33L', name: 'ILS RWY 33L', color: 0x3ddc84, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 3600], ['POSOK', dms(37, 14, 30.3), dms(126, 38, 56.6), 3600], ['LEGUN', dms(37, 18, 14.5), dms(126, 35, 38.6), 3600],
        ['BATAP', dms(37, 20, 54.7), dms(126, 33, 16.8), 2600], ['THR 33L', dms(37, 27, 15.21), dms(126, 27, 39.08), 75]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['KE019', dms(37, 11, 58.6), dms(126, 41, 10.5), 6000], ['POSOK', dms(37, 14, 30.3), dms(126, 38, 56.6), 5000],
        ['LEGUN', dms(37, 18, 14.5), dms(126, 35, 38.6), 3600]] },
      // RWY HDG, 500 ft turn right HDG 011, NCN D6 turn left direct GE973, 3 000 ft
      { ma: true, legs: [['THR 33L', dms(37, 27, 15.21), dms(126, 27, 39.08), 75], ['500 ft', dms(37, 28, 54.44), dms(126, 26, 10.82), 500, 'ap'],
        ['NCN D6', dms(37, 35, 42.1), dms(126, 26, 28.6), 1500, 'ap'], GE973] },
    ] },
    { id: 'ILS33R', ops: 'arr', rwy: '33R', name: 'ILS RWY 33R', color: 0x38bdf8, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 3600], ['BIRIN', dms(37, 14, 38.1), dms(126, 39, 10.4), 3600], ['PIBAK', dms(37, 18, 22.2), dms(126, 35, 52.3), 3600],
        ['GOKAK', dms(37, 21, 2.4), dms(126, 33, 30.5), 2600], ['THR 33R', dms(37, 27, 22.97), dms(126, 27, 52.82), 75]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['GE019', dms(37, 12, 6.3), dms(126, 41, 24.3), 6000], ['BIRIN', dms(37, 14, 38.1), dms(126, 39, 10.4), 5000],
        ['PIBAK', dms(37, 18, 22.2), dms(126, 35, 52.3), 3600]] },
      // RWY HDG, 500 ft turn right HDG 010, NCN D6 turn left direct GE973, 3 000 ft
      { ma: true, legs: [['THR 33R', dms(37, 27, 22.97), dms(126, 27, 52.82), 75], ['500 ft', dms(37, 29, 2.20), dms(126, 26, 24.56), 500, 'ap'],
        ['NCN D6', dms(37, 35, 41.8), dms(126, 26, 33.3), 1500, 'ap'], GE973] },
    ] },
    { id: 'ILS34L', ops: 'arr', rwy: '34L', name: 'ILS RWY 34L', color: 0xfacc15, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 2600], ['KAGOK', dms(37, 13, 43.8), dms(126, 37, 34.2), 1600], ['LENBI', dms(37, 17, 27.8), dms(126, 34, 16.1), 1600],
        ['BODEK', dms(37, 22, 37.3), dms(126, 29, 41.9), 1600], ['THR 34L', dms(37, 26, 28.50), dms(126, 26, 16.45), 78]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['DY019', dms(37, 11, 12.0), dms(126, 39, 48.0), 6000], ['KAGOK', dms(37, 13, 43.8), dms(126, 37, 34.2), 5000],
        ['LENBI', dms(37, 17, 27.8), dms(126, 34, 16.1), 3600], ['BODEK', dms(37, 22, 37.3), dms(126, 29, 41.9), 1600]] },
      // RWY HDG, 500 ft turn left HDG 289, WNG D7 turn left direct PY985, 3 000 ft
      { ma: true, legs: [['THR 34L', dms(37, 26, 28.50), dms(126, 26, 16.45), 78], ['500 ft', dms(37, 28, 7.71), dms(126, 24, 48.18), 500, 'ap'],
        ['WNG D7', dms(37, 28, 56.6), dms(126, 19, 1.2), 1200, 'ap'], PY985] },
    ] },
    { id: 'ILS34R', ops: 'dep', rwy: '34R', name: 'ILS RWY 34R', color: 0xc084fc, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 2600], ['NIPUT', dms(37, 13, 51.5), dms(126, 37, 47.9), 1600], ['DALKA', dms(37, 17, 35.6), dms(126, 34, 29.8), 1600],
        ['PIPAN', dms(37, 22, 45.1), dms(126, 29, 55.6), 1600], ['THR 34R', dms(37, 26, 36.29), dms(126, 26, 30.21), 78]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['PY019', dms(37, 11, 20.4), dms(126, 40, 1.2), 6000], ['NIPUT', dms(37, 13, 51.5), dms(126, 37, 47.9), 5000],
        ['DALKA', dms(37, 17, 35.6), dms(126, 34, 29.8), 3600], ['PIPAN', dms(37, 22, 45.1), dms(126, 29, 55.6), 1600]] },
      // RWY HDG, 500 ft turn left HDG 287, WNG D7 turn left direct PY985, 3 000 ft
      { ma: true, legs: [['THR 34R', dms(37, 26, 36.29), dms(126, 26, 30.21), 78], ['500 ft', dms(37, 28, 22.11), dms(126, 24, 56.06), 500, 'ap'],
        ['WNG D7', dms(37, 29, 1.6), dms(126, 19, 4.1), 1200, 'ap'], PY985] },
    ] },
    // RKSI AD CHART 2-51/55/58/60 (+ -1), ILS Z RWY 15L, ILS Z RWY 15R, ILS RWY 16L, ILS RWY 16R CAT II & III (AMDT 13/25, 2/26, 3/26).
    // Missed approach: 15L/R turn at 720 ft (put where the 2.5 % climb reaches it), 16L/R turn at 500 ft (put at the runway end).
    { id: 'ILSZ15R', ops: 'dep', rwy: '15R', name: 'ILS Z RWY 15R', color: 0x86efac, paths: [
      { legs: [['MUNAN', MUNAN, MUNAN_E, 3000], ['TASUR', dms(37, 37, 46.4), dms(126, 18, 16.2), 3000], ['ANBOG', dms(37, 35, 14.6), dms(126, 20, 31.9), 2600],
        ['THR 15R', dms(37, 28, 54.44), dms(126, 26, 10.82), 75]] },
      { legs: [['BITIM', BITIM, BITIM_E, 3500], OLTEM, ['TASUR', dms(37, 37, 46.4), dms(126, 18, 16.2), 3000]] },
      // RWY HDG, 720 ft turn left HDG 107, NCN D8 turn right direct GC966, 4 000 ft
      { ma: true, legs: [['THR 15R', dms(37, 28, 54.44), dms(126, 26, 10.82), 75], ['720 ft', 37.419343, 126.491834, 720, 'ap'],
        ['NCN D8', 37.411554, 126.561607, 1230, 'ap'], GC966] },
    ] },
    { id: 'ILSZ15L', ops: 'arr', rwy: '15L', name: 'ILS Z RWY 15L', color: 0x7dd3fc, paths: [
      { legs: [['MUNAN', MUNAN, MUNAN_E, 3000], ['PUDIM', dms(37, 37, 54.2), dms(126, 18, 30.0), 3000], ['SAKOS', dms(37, 35, 22.4), dms(126, 20, 45.7), 2600],
        ['THR 15L', dms(37, 29, 2.20), dms(126, 26, 24.56), 75]] },
      { legs: [['BITIM', BITIM, BITIM_E, 3500], OLTEM, ['PUDIM', dms(37, 37, 54.2), dms(126, 18, 30.0), 3000]] },
      // RWY HDG, 720 ft turn left HDG 108, NCN D8 turn right direct GC966, 4 000 ft
      { ma: true, legs: [['THR 15L', dms(37, 29, 2.20), dms(126, 26, 24.56), 75], ['720 ft', 37.421498, 126.495651, 720, 'ap'],
        ['NCN D8', 37.413030, 126.562966, 1210, 'ap'], GC966] },
    ] },
    { id: 'ILS16L', ops: 'dep', rwy: '16L', name: 'ILS RWY 16L', color: 0xf0abfc, paths: [
      { legs: [['BITIM', BITIM, BITIM_E, 3500], ATKON, ['IPKOL', dms(37, 37, 7.4), dms(126, 17, 7.3), 3000], ['RUMRI', dms(37, 32, 12.9), dms(126, 21, 30.4), 1600],
        ['THR 16L', dms(37, 28, 22.11), dms(126, 24, 56.05), 78]] },
      { legs: [['MUNAN', MUNAN, MUNAN_E, 2000], ['IPKOL', dms(37, 37, 7.4), dms(126, 17, 7.3), 1600], ['RUMRI', dms(37, 32, 12.9), dms(126, 21, 30.4), 1600]] },
      // RWY HDG, 500 ft turn right HDG 189, WNG D4 turn right direct DH989, 2 000 ft
      { ma: true, legs: [['THR 16L', dms(37, 28, 22.11), dms(126, 24, 56.05), 78], ['500 ft', dms(37, 26, 36.29), dms(126, 26, 30.21), 500, 'ap'],
        ['WNG D4', 37.366466, 126.441725, 1050, 'ap'], DH989] },
    ] },
    { id: 'ILS16R', ops: 'arr', rwy: '16R', name: 'ILS RWY 16R', color: 0xfde68a, paths: [
      { legs: [['BITIM', BITIM, BITIM_E, 3500], ATKON, ['OLKIK', dms(37, 36, 59.6), dms(126, 16, 53.5), 3000], ['OSERI', dms(37, 31, 59.0), dms(126, 21, 22.1), 1600],
        ['THR 16R', dms(37, 28, 7.71), dms(126, 24, 48.18), 78]] },
      { legs: [['MUNAN', MUNAN, MUNAN_E, 2000], ['OLKIK', dms(37, 36, 59.6), dms(126, 16, 53.5), 1600], ['OSERI', dms(37, 31, 59.0), dms(126, 21, 22.1), 1600]] },
      // RWY HDG, 500 ft turn right HDG 188, WNG D4 turn right direct DH989, 2 000 ft
      { ma: true, legs: [['THR 16R', dms(37, 28, 7.71), dms(126, 24, 48.18), 78], ['500 ft', dms(37, 26, 28.50), dms(126, 26, 16.45), 500, 'ap'],
        ['WNG D4', 37.366645, 126.439542, 1010, 'ap'], DH989] },
    ] },
  ],
  // AIP Republic of Korea RKSS AD CHART 2-29/30/32/34/37 (+ -1 data tabulation), ILS Z/Y RWY 14L, ILS RWY 14R/32L/32R,
  // AIRAC AIP AMDT 13/25 and AIP AMDT 2/26. Path ends at THR + RDH. SEL D19 arc (ILS Y 14L) drawn through points every ~6°.
  RKSS: [
    { id: 'ILSZ14L', rwy: '14L', name: 'ILS Z RWY 14L', color: 0x3ddc84, paths: [
      { legs: [['DOKDO', DOKDO, DOKDO_E, 4000], ['GU009', dms(37, 40, 40.0), dms(126, 38, 36.6), 2800], ['GU004', dms(37, 37, 7.1), dms(126, 43, 4.8), 1400],
        ['THR 14L', dms(37, 34, 14.55), dms(126, 46, 41.80), 90]] },
      // climb to 4 000 ft on HDG 144 to KIP D5, then right to intercept R 311 SEL to DOKDO
      { ma: true, legs: [['THR 14L', dms(37, 34, 14.55), dms(126, 46, 41.80), 90], ['D5 KIP', dms(37, 29, 58.1), dms(126, 52, 2.1), 950, 'ap'],
        ['DOKDO', DOKDO, DOKDO_E, 4000]] },
    ] },
    { id: 'ILSY14L', rwy: '14L', name: 'ILS Y RWY 14L', color: 0x38bdf8, paths: [
      { legs: [['CAVOI', CAVOI, CAVOI_E, 4000], ['SEL D19', 37.562811, 126.577205, 3500, 'ap'], ['SEL D19', 37.591265, 126.598601, 3000, 'ap'],
        ['R318 SEL', 37.613513, 126.619232, 2600, 'ap'], ['D7.4 ISEL', dms(37, 39, 20.6), dms(126, 40, 16.7), 1800],
        ['D4.3 ISEL', dms(37, 37, 7.1), dms(126, 43, 4.8), 1400], ['THR 14L', dms(37, 34, 14.55), dms(126, 46, 41.80), 90]] },
      // climb to 4 000 ft on HDG 144 to KIP D5, then right to intercept R 301 SEL to CAVOI
      { ma: true, legs: [['THR 14L', dms(37, 34, 14.55), dms(126, 46, 41.80), 90], ['D5 KIP', dms(37, 29, 58.1), dms(126, 52, 2.1), 950, 'ap'],
        ['CAVOI', CAVOI, CAVOI_E, 4000]] },
    ] },
    { id: 'ILS14R', rwy: '14R', name: 'ILS RWY 14R', color: 0xfacc15, paths: [
      { legs: [['DOKDO', DOKDO, DOKDO_E, 4000], ['DU009', dms(37, 40, 31.8), dms(126, 38, 26.2), 2800], ['DU004', dms(37, 36, 59.0), dms(126, 42, 54.3), 1400],
        ['THR 14R', dms(37, 34, 6.19), dms(126, 46, 31.60), 88]] },
      // climb to 4 000 ft on HDG 144 to KIP D5, then right to intercept R 311 SEL to DOKDO
      { ma: true, legs: [['THR 14R', dms(37, 34, 6.19), dms(126, 46, 31.60), 88], ['D5 KIP', dms(37, 29, 50.7), dms(126, 51, 52.7), 950, 'ap'],
        ['DOKDO', DOKDO, DOKDO_E, 4000]] },
    ] },
    { id: 'ILS32L', rwy: '32L', name: 'ILS RWY 32L', color: 0xc084fc, paths: [
      { legs: [['APOMO', APOMO, APOMO_E, 7000], ['KT018', dms(37, 25, 41.9), dms(127, 5, 11.1), 5500], ['WONKO', dms(37, 24, 2.0), dms(126, 59, 8.0), 4000],
        ['DT009', dms(37, 26, 36.1), dms(126, 55, 55.6), 2800], ['DT007', dms(37, 27, 44.9), dms(126, 54, 29.5), 2300], ['DT006', dms(37, 28, 42.9), dms(126, 53, 17.0), 2000],
        ['THR 32L', dms(37, 32, 52.83), dms(126, 48, 3.71), 95]] },
      { legs: [['BUMSI', BUMSI, BUMSI_E, 8000], ['PUDUB', dms(37, 20, 26.5), dms(127, 3, 36.6), 5500], ['WONKO', dms(37, 24, 2.0), dms(126, 59, 8.0), 4000]] },
      { legs: [['SUNEM', SUNEM, SUNEM_E, 7000], ['PT017', dms(37, 20, 30.7), dms(126, 54, 50.7), 5500], ['WONKO', dms(37, 24, 2.0), dms(126, 59, 8.0), 4000]] },
      // after 500 ft climb on HDG 324 to KIP D5, continue to 4 000 ft, turn left direct CAVOI
      { ma: true, legs: [['THR 32L', dms(37, 32, 52.83), dms(126, 48, 3.71), 95], ['D5 KIP', D5KIP_N, D5KIP_N_E, 910, 'ap'], ['CAVOI', CAVOI, CAVOI_E, 4000]] },
    ] },
    { id: 'ILS32R', rwy: '32R', name: 'ILS RWY 32R', color: 0xfb7185, paths: [
      { legs: [['APOMO', APOMO, APOMO_E, 7000], ['KT018', dms(37, 25, 41.9), dms(127, 5, 11.1), 5300], ['MOBAK', dms(37, 24, 4.7), dms(126, 59, 25.2), 4000],
        ['GT009', dms(37, 26, 39.3), dms(126, 56, 12.2), 2800], ['GT007', dms(37, 27, 47.4), dms(126, 54, 47.0), 2300], ['GT006', dms(37, 28, 42.2), dms(126, 53, 38.9), 2000],
        ['THR 32R', dms(37, 32, 51.89), dms(126, 48, 25.58), 96]] },
      { legs: [['BUMSI', BUMSI, BUMSI_E, 8000], ['GT020', dms(37, 18, 25.8), dms(127, 6, 27.1), 6500, 'ap'], ['NOGUB', dms(37, 20, 51.6), dms(127, 3, 25.8), 5300],
        ['MOBAK', dms(37, 24, 4.7), dms(126, 59, 25.2), 4000]] },
      { legs: [['SUNEM', SUNEM, SUNEM_E, 7000], ['PT017', dms(37, 20, 30.7), dms(126, 54, 50.7), 5300], ['MOBAK', dms(37, 24, 4.7), dms(126, 59, 25.2), 4000]] },
      // after 500 ft climb on HDG 324 to KIP D5, continue to 4 000 ft, turn left direct CAVOI
      { ma: true, legs: [['THR 32R', dms(37, 32, 51.89), dms(126, 48, 25.58), 96], ['D5 KIP', D5KIP_N, D5KIP_N_E, 940, 'ap'], ['CAVOI', CAVOI, CAVOI_E, 4000]] },
    ] },
  ],

  // AIP Republic of Korea RKPC AD CHART 2-21/22/26/27 (+ -1 data tabulation), ILS Z/Y RWY 07 and 25, AIRAC AIP AMDT 5/26.
  // Path ends at THR + RDH. YDM DME arcs (D12, D16, D22) drawn through points every ~6-10°.
  RKPC: [
    { id: 'ILSZ07', rwy: '07', name: 'ILS Z RWY 07', color: 0x3ddc84, paths: [
      { legs: [['YUMIN', dms(33, 27, 25.7), dms(126, 13, 15.5), 4000], ['LIMSO', dms(33, 25, 3.0), dms(126, 18, 31.0), 2900], ICJU_D53,
        ['THR 07', dms(33, 29, 59.57), dms(126, 28, 6.50), 146]] },
      // climb to 8 000 ft on track 066 to PC404, then right on track 102 to PETAA
      { ma: true, legs: [['THR 07', dms(33, 29, 59.57), dms(126, 28, 6.50), 146], ['PC404', PC404, PC404_E, 870, 'ap'], ['PETAA', PETAA, PETAA_E, 8000]] },
    ] },
    { id: 'ILSY07', rwy: '07', name: 'ILS Y RWY 07', color: 0x38bdf8, paths: [
      { legs: [['AKBIN', dms(33, 31, 21.5), dms(126, 14, 55.3), 4000], ['YDM D12', 33.490352, 126.249243, 3700, 'ap'], ['YDM D12', 33.459528, 126.256179, 3400, 'ap'],
        ['LR254 YDM', 33.429987, 126.268802, 3200, 'ap'], ['D10.5 ICJU', dms(33, 24, 35.0), dms(126, 17, 36.8), 2900], ICJU_D53,
        ['THR 07', dms(33, 29, 59.57), dms(126, 28, 6.50), 146]] },
      // straight ahead to YDM D4, then right to intercept R 096 YDM to PETAA, 8 000 ft
      { ma: true, legs: [['THR 07', dms(33, 29, 59.57), dms(126, 28, 6.50), 146], ['D4 YDM', PC404, PC404_E, 870, 'ap'], ['PETAA', PETAA, PETAA_E, 8000]] },
    ] },
    { id: 'ILSZ25', rwy: '25', name: 'ILS Z RWY 25', color: 0xfacc15, paths: [
      { legs: [['DUKAL', dms(33, 38, 58.6), dms(126, 45, 38.8), 4000], ['TOKIN', dms(33, 36, 21.9), dms(126, 40, 32.2), 2900], ICHE_D53,
        ['THR 25', dms(33, 30, 53.56), dms(126, 29, 51.51), 127]] },
      // climb to 6 000 ft on track 246 to PC403, then right on track 263 to LOTKA
      { ma: true, legs: [['THR 25', dms(33, 30, 53.56), dms(126, 29, 51.51), 127], ['PC403', dms(33, 22, 44.4), dms(126, 14, 3.0), 2430, 'ap'], LOTKA] },
    ] },
    { id: 'ILSY25', rwy: '25', name: 'ILS Y RWY 25', color: 0xc084fc, paths: [
      { legs: [['OMKEL', dms(33, 43, 16.2), dms(126, 41, 8.0), 4000], ['YDM D16', 33.702968, 126.710100, 4000, 'ap'], ['LR058 YDM', 33.682525, 126.732908, 4000, 'ap'],
        R066_D16, ['D10.5 ICHE', dms(33, 36, 18.2), dms(126, 40, 24.9), 2900], ICHE_D53, ['THR 25', dms(33, 30, 53.56), dms(126, 29, 51.51), 127]] },
      { legs: [['PETAA', PETAA, PETAA_E, 8000], ['YDM D22', 33.586912, 126.917827, 6700, 'ap'], ['LR072 YDM', 33.648067, 126.895699, 5300, 'ap'],
        ['R066 D22', 33.705085, 126.861113, 4000, 'ap'], R066_D16] },
      // straight ahead to YDM D7, intercept R 246 YDM to D15, right HDG 263 to LOTKA, 6 000 ft
      { ma: true, legs: [['THR 25', dms(33, 30, 53.56), dms(126, 29, 51.51), 127], ['D7 YDM', dms(33, 26, 59.7), dms(126, 22, 8.6), 1220, 'ap'],
        ['D15 YDM', dms(33, 22, 45.9), dms(126, 14, 1.5), 2430, 'ap'], LOTKA] },
    ] },
  ],

  // AIP Republic of Korea RKPK AD CHART 2-21 (+ -1 data tabulation), ILS X or LOC X RWY 36L, AIP AMDT 11/26, 15 OCT 2026.
  // Path ends at THR + RDH.
  RKPK: [
    { id: 'ILSX36L', rwy: '36L', name: 'ILS X RWY 36L', color: 0x3ddc84, paths: [
      { legs: [['PEDLO', dms(34, 59, 23.1), dms(129, 8, 15.3), 6000], AKEVI, ['GUBGI', dms(35, 3, 40.0), dms(128, 57, 8.1), 2100],
        ['THR 36L', dms(35, 9, 54.69), dms(128, 56, 19.79), 69]] },
      { legs: [['KEVOX', KEVOX, KEVOX_E, 6000], ['PK711', dms(34, 57, 51.9), dms(128, 50, 32.3), 5000], AKEVI] },
      // 500 ft, climbing left turn to 5 000 ft direct OPONO, track 232 to GAYHA (6 000 ft), track 167 to KEVOX
      { ma: true, legs: [['THR 36L', dms(35, 9, 54.69), dms(128, 56, 19.79), 69], ['500 ft', 35.1938722, 128.9351278, 500, 'ap'],
        ['OPONO', dms(35, 18, 24.2), dms(128, 43, 46.2), 5000], ['GAYHA', dms(35, 13, 22.4), dms(128, 37, 54.4), 6000], ['KEVOX', KEVOX, KEVOX_E, 6000]] },
    ] },
  ],
  // AIP Ireland EIDW AD 2.24-27/30/33/36/39 (+ .2 coded tables), ILS CAT I/II or LOC RWY 28L/28R/10L/10R, ILS CAT I RWY 16,
  // AIRAC 2026-05-14. West longitudes negative. FAF altitude = the 3° path at the FAF (THR + 50 ft), rounded to 100 ft;
  // missed-approach fixes without a published altitude take the 2.5 % climb. 10L/28R THR = the displaced thresholds.
  EIDW: [
    { id: 'ILS28L', rwy: '28L', name: 'ILS RWY 28L', color: 0x3ddc84, paths: [
      { legs: [['DUB', dms(53, 29, 57.8), -dms(6, 18, 25.6), 3000], ['DW017', dms(53, 30, 39.7), -dms(5, 55, 38.6), 3000], ['LAPMO', dms(53, 24, 11.0), -dms(5, 56, 44.1), 3000],
        ['MAXEV', dms(53, 24, 33.5), -dms(6, 3, 17.3), 2500], ['THR 28L', dms(53, 25, 12.94), -dms(6, 15, 2.08), 252]] },
      { legs: [['PIZSA', dms(53, 28, 44.3), -dms(5, 48, 33.6), 3000], ['LAPMO', dms(53, 24, 11.0), -dms(5, 56, 44.1), 3000]] },
      { legs: [['OBINU', dms(53, 20, 1.7), -dms(5, 49, 31.2), 3000], ['LAPMO', dms(53, 24, 11.0), -dms(5, 56, 44.1), 3000]] },
      // straight ahead to GANET, turn right DW034, DUB, 3 000 ft
      { ma: true, legs: [['THR 28L', dms(53, 25, 12.94), -dms(6, 15, 2.08), 252], ['GANET', dms(53, 26, 6.5), -dms(6, 31, 33.8), 3000],
        ['DW034', dms(53, 30, 37.4), -dms(6, 33, 42.6), 3000], ['DUB', dms(53, 29, 57.8), -dms(6, 18, 25.6), 3000]] },
    ] },
    { id: 'ILS28R', rwy: '28R', name: 'ILS RWY 28R', color: 0x38bdf8, paths: [
      { legs: [['SIDUQ', dms(53, 31, 42.4), -dms(6, 7, 3.6), 3000], ['DW017', dms(53, 30, 39.7), -dms(5, 55, 38.6), 3000], ['ABIVU', dms(53, 25, 5.7), -dms(5, 56, 31.5), 3000],
        ['OKEDO', dms(53, 25, 28.2), -dms(6, 3, 14.0), 2500], ['THR 28R', dms(53, 26, 6.73), -dms(6, 14, 41.87), 263]] },
      { legs: [['OBINU', dms(53, 20, 1.7), -dms(5, 49, 31.2), 3000], ['ABIVU', dms(53, 25, 5.7), -dms(5, 56, 31.5), 3000]] },
      // straight ahead DW040, turn right DW041, DW042, SIDUQ, 3 000 ft
      { ma: true, legs: [['THR 28R', dms(53, 26, 6.73), -dms(6, 14, 41.87), 263], ['DW040', dms(53, 26, 23.8), -dms(6, 19, 44.4), 700],
        ['DW041', dms(53, 30, 11.9), -dms(6, 27, 12.8), 3000], ['DW042', dms(53, 32, 44.1), -dms(6, 18, 29.1), 3000], ['SIDUQ', dms(53, 31, 42.4), -dms(6, 7, 3.6), 3000]] },
    ] },
    { id: 'ILS10R', rwy: '10R', name: 'ILS RWY 10R', color: 0xf59e0b, paths: [
      { legs: [['OSLEX', dms(53, 21, 55.8), -dms(6, 41, 44.5), 5000], ['RAQAR', dms(53, 26, 36.1), -dms(6, 41, 1.2), 4000],
        ['GANET', dms(53, 26, 6.5), -dms(6, 31, 33.8), 3000], ['THR 10R', dms(53, 25, 20.75), -dms(6, 17, 24.27), 293]] },
      { legs: [['IFBAP', dms(53, 32, 30.8), -dms(6, 40, 6.2), 4000], ['RAQAR', dms(53, 26, 36.1), -dms(6, 41, 1.2), 4000]] },
      // straight ahead to DW031 (D9.76 IDE), turn right direct UMOWI, 4 000 ft
      { ma: true, legs: [['THR 10R', dms(53, 25, 20.75), -dms(6, 17, 24.27), 293], ['DW031', dms(53, 24, 25.9), -dms(6, 0, 29.2), 2000],
        ['UMOWI', dms(53, 20, 2.9), -dms(6, 8, 59.1), 4000]] },
    ] },
    { id: 'ILS10L', rwy: '10L', name: 'ILS RWY 10L', color: 0xa78bfa, paths: [
      { legs: [['IFBAP', dms(53, 32, 30.8), -dms(6, 40, 6.2), 4000], ['SUBOF', dms(53, 27, 32.5), -dms(6, 40, 52.5), 4000],
        ['EBEZA', dms(53, 27, 0.2), -dms(6, 31, 2.2), 3000], ['THR 10L', dms(53, 26, 13.79), -dms(6, 16, 50.22), 285]] },
      { legs: [['OSLEX', dms(53, 21, 55.8), -dms(6, 41, 44.5), 5000], ['SUBOF', dms(53, 27, 32.5), -dms(6, 40, 52.5), 4000]] },
      // straight ahead to DW906, turn left DW907 (3 000 ft), DW908, BATAF 4 000 ft
      { ma: true, legs: [['THR 10L', dms(53, 26, 13.79), -dms(6, 16, 50.22), 285], ['DW906', dms(53, 26, 5.4), -dms(6, 14, 17.6), 500],
        ['DW907', dms(53, 28, 40.1), -dms(6, 4, 53.0), 3000], ['DW908', dms(53, 32, 44.8), -dms(6, 12, 35.1), 3000], ['BATAF', dms(53, 32, 36.0), -dms(6, 23, 20.5), 4000]] },
    ] },
    { id: 'ILS16', rwy: '16', name: 'ILS RWY 16', color: 0xf472b6, paths: [
      { legs: [['ULTAG', dms(53, 42, 1.0), -dms(6, 44, 17.2), 6000], ['UMDAR', dms(53, 38, 3.3), -dms(6, 31, 35.5), 3000], ['BAPDA', dms(53, 37, 40.0), -dms(6, 24, 3.7), 3000],
        ['GARTI', dms(53, 34, 12.8), -dms(6, 21, 32.1), 3000], ['THR 16', dms(53, 26, 13.16), -dms(6, 15, 43.12), 268]] },
      { legs: [['KERAV', dms(53, 37, 42.7), -dms(5, 45, 57.3), 6000], ['ERUDA', dms(53, 40, 29.0), -dms(6, 16, 55.0), 3000], ['BAPDA', dms(53, 37, 40.0), -dms(6, 24, 3.7), 3000]] },
      // straight ahead to DW007 (MATP), climbing to 5 000 ft
      { ma: true, legs: [['THR 16', dms(53, 26, 13.16), -dms(6, 15, 43.12), 268], ['DW007', dms(53, 20, 3.5), -dms(6, 11, 15.7), 1200]] },
    ] },
  ],
};

// Source line shown under Flight procedures, per airport
export const PROC_NOTES = {
  ICN: 'AIP RKSI AD 2-51/55/58/60, 2-62 ~ 2-69, ILS RWY 15L/15R/16L/16R/33L/33R/34L/34R CAT II & III (AMDT 13/25, 2/26, 3/26).',
  RKSS: 'AIP RKSS AD 2-29/30/32/34/37, ILS RWY 14L/14R/32L/32R (AMDT 13/25, 2/26).',
  RKPC: 'AIP RKPC AD 2-21/22/26/27, ILS RWY 07/25 (AMDT 5/26).',
  RKPK: 'AIP RKPK AD 2-21, ILS X RWY 36L (AMDT 11/26).',
  EIDW: 'AIP Ireland EIDW AD 2.24-27/30/33/36/39, ILS RWY 28L/28R/10L/10R/16 (AIRAC 2026-05-14).',
};
