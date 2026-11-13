// Traffic for the noise (Lden) model, per airport. Movements are annual (arrivals + departures).
// Runway roles (arrivals / departures only) come from the procedures' `ops`; runways without one carry both, shared by
// `rwyShare` (runway id → weight; default equal). fleet: [ANP aircraft id, share] — representative types standing in
// for the real mix (see tools/noise/anp_profiles.py). evening / night: shares of the movements 19–22 h and 22–07 h.
// north: share flown towards the northern half of the compass (the rest the reciprocal). All but `annual` are assumptions.

// Fleet mixes by kind of traffic
const NB_DOM = [['737800', 0.5], ['A321-232', 0.35], ['A330-343', 0.1], ['7773ER', 0.05]];           // Korean trunk routes
const NB_REG = [['737800', 0.6], ['A321-232', 0.35], ['A330-343', 0.05]];                            // Korean regional / short international
const NB_SMALL = [['737800', 0.55], ['A321-232', 0.3], ['ATR72', 0.15]];                             // small Korean airports (incl. turboprops)
const GULF = [['737800', 0.25], ['A321-232', 0.3], ['A330-343', 0.1], ['7773ER', 0.15], ['7878R', 0.1], ['A350-941', 0.05], ['7478', 0.05]];
const MOZ = [['737800', 0.4], ['A321-232', 0.1], ['7878R', 0.05], ['ATR72', 0.45]];                  // LAM 737/E190/Q400, regional carriers

const KR = '항공정보포털 2025년 공항별 운항 (국내선 출발×2 + 국제선 출도착), 군 운항 제외';
const kr = (annual, fleet, o = {}) => ({ annual, source: KR, fleet, evening: 0.15, night: 0.03, north: 0.5, ...o });
const est = (annual, fleet, source, o = {}) => ({ annual, source, fleet, evening: 0.1, night: 0.02, north: 0.5, estimate: true, ...o });
const oag = (annual, fleet, evening, night) => ({ annual, source: `OAG 2026 운항 스케줄 (${annual.toLocaleString('en-US')}회)`, fleet, evening, night, north: 0.5 });

export const NOISE_TRAFFIC = {
  ICN: {
    annual: 425760,   // 2025, Incheon International Airport Corporation (record year)
    source: '인천국제공항공사 2025년 운항 실적 (425,760회)',
    // assumed mix (not in the public statistics): narrow-body ~40 %, wide-body twins ~50 %, 747-8F freighters ~10 %
    fleet: [['737800', 0.22], ['A321-232', 0.18], ['A330-343', 0.13], ['7773ER', 0.20], ['7878R', 0.08], ['A350-941', 0.09], ['7478', 0.10]],
    evening: 0.15, night: 0.15, north: 0.5,
  },
  // Korea, 2025 (Airportal, 한국공항공사): domestic departures ×2 + international arrivals and departures
  RKSS: kr(127596, NB_DOM, { night: 0.01 }),        // curfew 23–06
  RKPK: kr(103829, NB_REG, { night: 0.02 }),        // curfew 23–06
  RKPC: kr(172836, NB_DOM, { night: 0.04, rwyShare: { '07/25': 0.95, '13/31': 0.05 } }),
  RKTN: kr(23385, NB_REG), RKTU: kr(29858, NB_REG),
  RKJJ: kr(13090, NB_SMALL, { night: 0 }), RKJY: kr(4770, NB_SMALL, { night: 0 }), RKPU: kr(4292, NB_SMALL, { night: 0 }),
  RKNY: kr(408, NB_SMALL, { night: 0 }), RKTH: kr(2038, NB_SMALL, { night: 0 }), RKPS: kr(1872, NB_SMALL, { night: 0 }),
  RKJK: kr(1742, NB_SMALL, { night: 0 }), RKNW: kr(1384, NB_SMALL, { night: 0 }),
  RKJB: kr(0, NB_SMALL, { source: '2025년 운항 없음 (2024.12 사고 이후 폐쇄)', night: 0 }),
  // Saudi Arabia 2025 (GASTAT), Singapore 2025 (Changi Airport Group)
  OEJN: { annual: 314400, source: 'GASTAT 2025 (314,400회)', fleet: GULF, evening: 0.15, night: 0.25, north: 0.5 },
  OERK: { annual: 296800, source: 'GASTAT 2025 (296,800회)', fleet: GULF, evening: 0.15, night: 0.25, north: 0.5 },
  OEDF: { annual: 108500, source: 'GASTAT 2025 (108,500회)', fleet: GULF, evening: 0.15, night: 0.2, north: 0.5 },
  WSSS: { annual: 374000, source: 'Changi Airport Group 2025 (374,000회)', fleet: GULF, evening: 0.15, night: 0.2, north: 0.5,
          rwyShare: { '02L/20R': 0.45, '02C/20C': 0.45, '02R/20L': 0.1 } },
  // Mozambique: Maputo from a logistics-cluster airport profile (year not stated); Beira and Pemba estimated from schedules
  FQMA: est(21234, MOZ, 'Logistics Cluster 공항 개요 (연도 미기재, 21,234회)'),
  FQBR: est(3000, MOZ, '운항 스케줄 기반 추정'), FQPB: est(1500, MOZ, '운항 스케줄 기반 추정'),
  // Papua New Guinea: OAG 2026 schedules (tools/noise/oag_png.py). Movements and evening (19–22 h) / night (22–07 h) shares from
  // the scheduled local times; types mapped to the bundled ANP stand-ins: ATR 72 and Dash 8 → ATR72, Fokker 70/100 and A220 → F10062,
  // 737-800 → 737800, 767-300 → A330-343.
  PMIA: oag(43427, [['ATR72', 0.58], ['F10062', 0.24], ['737800', 0.14], ['A330-343', 0.04]], 0.03, 0.08),
  AYNZ: oag(10855, [['ATR72', 0.7], ['737800', 0.19], ['F10062', 0.11]], 0, 0.065),
  AYMH: oag(7208, [['ATR72', 0.67], ['F10062', 0.33]], 0, 0),
  AYTK: oag(8040, [['ATR72', 0.65], ['F10062', 0.35]], 0, 0.115),
  AYWK: oag(5669, [['ATR72', 0.69], ['F10062', 0.31]], 0, 0),
  AYMD: oag(3596, [['ATR72', 0.91], ['F10062', 0.09]], 0, 0.085),
  AYGA: oag(2902, [['ATR72', 0.97], ['F10062', 0.03]], 0, 0),
  AYHK: oag(4543, [['ATR72', 1]], 0, 0.053),
  AYBK: oag(1896, [['F10062', 0.52], ['ATR72', 0.48]], 0, 0),
  AYGN: oag(1148, [['ATR72', 0.37], ['F10062', 0.35], ['737800', 0.28]], 0, 0),
  AYMO: oag(1019, [['F10062', 0.7], ['737800', 0.3]], 0, 0),
  AYKV: oag(3069, [['F10062', 0.59], ['ATR72', 0.3], ['737800', 0.11]], 0, 0.37),     // first departures 06:00–06:30
  AYVN: oag(3096, [['ATR72', 0.53], ['F10062', 0.47]], 0, 0.497),                     // first departures 06:00–06:30
  AYKI: oag(2057, [['ATR72', 1]], 0, 0),
  AYDU: oag(1387, [['ATR72', 1]], 0, 0),
};

// Contour bands (Lden dB, lower bound) and labels. Korea: 공항소음방지법 시행령 제2조 / 시행규칙 제3조 (Lden, from 2023).
// Elsewhere: 5 dB bands from 55 dB as in EU strategic noise maps (Directive 2002/49/EC).
export const NOISE_BANDS = {
  kr: [[57, '인근지역', 'Adjacent area', '#fde68a'], [61, '제3종 다', 'Zone 3 (c)', '#fbbf24'], [66, '제3종 나', 'Zone 3 (b)', '#f97316'],
       [70, '제3종 가', 'Zone 3 (a)', '#ef4444'], [75, '제2종', 'Zone 2', '#be123c'], [79, '제1종', 'Zone 1', '#7f1d1d']],
  intl: [[55, '55–60 dB', '55–60 dB', '#fde68a'], [60, '60–65 dB', '60–65 dB', '#fbbf24'], [65, '65–70 dB', '65–70 dB', '#f97316'],
         [70, '70–75 dB', '70–75 dB', '#ef4444'], [75, '75 dB 이상', '75 dB +', '#7f1d1d']],
};
