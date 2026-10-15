// Instrument procedures drawn as 3D paths over the OLS. Altitudes in ft AMSL (chart minimums, flown as straight legs).
// Each procedure: rwy = landing runway end; paths = [{ ma?, legs: [[fix, lat, lon, alt ft, 'ap'?]] }] in flight order; ma = missed approach;
// 'ap' = approximated point, not a published fix: the missed-approach turn at 500 ft is put at the runway end, and the
// DME turn point where the published heading reaches the DME distance, with the altitude from the 2.5 % minimum climb.
const dms = (d, m, s) => d + m / 60 + s / 3600;
const PAMBI = dms(37, 10, 54.3), PAMBI_E = dms(126, 32, 34.4), ENPIL = dms(37, 9, 39.0), ENPIL_E = dms(126, 43, 34.0);
const GE973 = ['GE973', dms(37, 27, 47.0), dms(126, 13, 29.0), 3000], PY985 = ['PY985', dms(37, 23, 19.6), dms(126, 5, 55.4), 3000];

// AIP Republic of Korea RKSI AD CHART 2-62/64/67/69 (+ -1 data tabulation), ILS or LOC RWY 33L/33R/34L/34R CAT II & III,
// AIRAC AIP AMDT 13/25, WEF 21 JAN 2026. THR elevation 23 ft; the path ends at THR + RDH.
export const PROCEDURES = {
  ICN: [
    { id: 'ILS33L', rwy: '33L', name: 'ILS RWY 33L', color: 0x3ddc84, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 3600], ['POSOK', dms(37, 14, 30.3), dms(126, 38, 56.6), 3600], ['LEGUN', dms(37, 18, 14.5), dms(126, 35, 38.6), 3600],
        ['BATAP', dms(37, 20, 54.7), dms(126, 33, 16.8), 2600], ['THR 33L', dms(37, 27, 15.21), dms(126, 27, 39.08), 75]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['KE019', dms(37, 11, 58.6), dms(126, 41, 10.5), 6000], ['POSOK', dms(37, 14, 30.3), dms(126, 38, 56.6), 5000],
        ['LEGUN', dms(37, 18, 14.5), dms(126, 35, 38.6), 3600]] },
      // RWY HDG, 500 ft turn right HDG 011, NCN D6 turn left direct GE973, 3 000 ft
      { ma: true, legs: [['THR 33L', dms(37, 27, 15.21), dms(126, 27, 39.08), 75], ['500 ft', dms(37, 28, 54.44), dms(126, 26, 10.82), 500, 'ap'],
        ['NCN D6', dms(37, 35, 42.1), dms(126, 26, 28.6), 1500, 'ap'], GE973] },
    ] },
    { id: 'ILS33R', rwy: '33R', name: 'ILS RWY 33R', color: 0x38bdf8, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 3600], ['BIRIN', dms(37, 14, 38.1), dms(126, 39, 10.4), 3600], ['PIBAK', dms(37, 18, 22.2), dms(126, 35, 52.3), 3600],
        ['GOKAK', dms(37, 21, 2.4), dms(126, 33, 30.5), 2600], ['THR 33R', dms(37, 27, 22.97), dms(126, 27, 52.82), 75]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['GE019', dms(37, 12, 6.3), dms(126, 41, 24.3), 6000], ['BIRIN', dms(37, 14, 38.1), dms(126, 39, 10.4), 5000],
        ['PIBAK', dms(37, 18, 22.2), dms(126, 35, 52.3), 3600]] },
      // RWY HDG, 500 ft turn right HDG 010, NCN D6 turn left direct GE973, 3 000 ft
      { ma: true, legs: [['THR 33R', dms(37, 27, 22.97), dms(126, 27, 52.82), 75], ['500 ft', dms(37, 29, 2.20), dms(126, 26, 24.56), 500, 'ap'],
        ['NCN D6', dms(37, 35, 41.8), dms(126, 26, 33.3), 1500, 'ap'], GE973] },
    ] },
    { id: 'ILS34L', rwy: '34L', name: 'ILS RWY 34L', color: 0xfacc15, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 2600], ['KAGOK', dms(37, 13, 43.8), dms(126, 37, 34.2), 1600], ['LENBI', dms(37, 17, 27.8), dms(126, 34, 16.1), 1600],
        ['BODEK', dms(37, 22, 37.3), dms(126, 29, 41.9), 1600], ['THR 34L', dms(37, 26, 28.50), dms(126, 26, 16.45), 78]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['DY019', dms(37, 11, 12.0), dms(126, 39, 48.0), 6000], ['KAGOK', dms(37, 13, 43.8), dms(126, 37, 34.2), 5000],
        ['LENBI', dms(37, 17, 27.8), dms(126, 34, 16.1), 3600], ['BODEK', dms(37, 22, 37.3), dms(126, 29, 41.9), 1600]] },
      // RWY HDG, 500 ft turn left HDG 289, WNG D7 turn left direct PY985, 3 000 ft
      { ma: true, legs: [['THR 34L', dms(37, 26, 28.50), dms(126, 26, 16.45), 78], ['500 ft', dms(37, 28, 7.71), dms(126, 24, 48.18), 500, 'ap'],
        ['WNG D7', dms(37, 28, 56.6), dms(126, 19, 1.2), 1200, 'ap'], PY985] },
    ] },
    { id: 'ILS34R', rwy: '34R', name: 'ILS RWY 34R', color: 0xc084fc, paths: [
      { legs: [['PAMBI', PAMBI, PAMBI_E, 2600], ['NIPUT', dms(37, 13, 51.5), dms(126, 37, 47.9), 1600], ['DALKA', dms(37, 17, 35.6), dms(126, 34, 29.8), 1600],
        ['PIPAN', dms(37, 22, 45.1), dms(126, 29, 55.6), 1600], ['THR 34R', dms(37, 26, 36.29), dms(126, 26, 30.21), 78]] },
      { legs: [['ENPIL', ENPIL, ENPIL_E, 7000], ['PY019', dms(37, 11, 20.4), dms(126, 40, 1.2), 6000], ['NIPUT', dms(37, 13, 51.5), dms(126, 37, 47.9), 5000],
        ['DALKA', dms(37, 17, 35.6), dms(126, 34, 29.8), 3600], ['PIPAN', dms(37, 22, 45.1), dms(126, 29, 55.6), 1600]] },
      // RWY HDG, 500 ft turn left HDG 287, WNG D7 turn left direct PY985, 3 000 ft
      { ma: true, legs: [['THR 34R', dms(37, 26, 36.29), dms(126, 26, 30.21), 78], ['500 ft', dms(37, 28, 22.11), dms(126, 24, 56.06), 500, 'ap'],
        ['WNG D7', dms(37, 29, 1.6), dms(126, 19, 4.1), 1200, 'ap'], PY985] },
    ] },
  ],
};
