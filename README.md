# OLS Simulator

ICAO Annex 14 장애물제한표면(OLS)을 실제 지형·건물 위에 3D로 보여주고, 활주로 연장·평행활주로 시나리오와
계기접근절차(ILS)를 바로 비교하는 웹 도구입니다. Claude Code로 개발했습니다.

- **실서버:** https://ols-simulator.vercel.app
- **바로 열기:** [잭슨스 공항(PMIA)](https://ols-simulator.vercel.app/#PMIA) ·
  [인천 + ILS 접근절차](https://ols-simulator.vercel.app/?proc=all#ICN) ·
  [김포](https://ols-simulator.vercel.app/?proc=all#RKSS) · [제주](https://ols-simulator.vercel.app/?proc=all#RKPC) · [김해](https://ols-simulator.vercel.app/?proc=all#RKPK)

## 시연 시나리오 (효과 자기신고서 3번과 동일)

화면은 영어·한국어 두 가지입니다. 브라우저 언어가 한국어면 한국어로 열리고, 오른쪽 위 🌐 버튼으로 바꿀 수 있습니다.
아래 표는 버튼 이름을 **영어(한국어)** 로 함께 적었습니다.

| 단계 | 조작 | 기대 결과 |
|---|---|---|
| ① | https://ols-simulator.vercel.app 접속 → **Explore(시작하기)** 클릭 | 랜딩 화면에서 시뮬레이터로 전환 |
| ② | 화면 위쪽 선택 바(Region › Country › Airport / 지역 › 국가 › 공항)에서 **Oceania › Papua New Guinea › Jacksons Intl** (오세아니아 › 파푸아뉴기니 › Jacksons Intl) | OLS 표면이 지형(GEDTM30)·OSM 건물과 함께 3D로 표시. 기본 6개(착륙대·진입·이륙상승·전이·내부수평·원추), 왼쪽 **Check › OFZ (검토 › OFZ)** 를 켜면 OFZ 3개(내부진입·내부전이·착륙복행)까지 9개 |
| ③ | 왼쪽 패널 **Scenario(시나리오)** 에서 RWY 14L/32R의 **14L** 클릭 → 슬라이더로 **+500 m** | 활주로 길이 **2750 → 3250 m**, 연장된 진입·이륙상승표면이 바깥쪽으로 이동 |
| ④ | **Existing(기존 OLS 비교)** 켜고 지표면에 마우스 올리기 | 기존 OLS(주황)와 비교, 오른쪽 **Altitude(고도)** 에 제한고 표시. 내부수평표면 = 공항표고 39 m + 45 m = **84 m** |

- 허용 편차: 표면 제한고는 Annex 14 수기 계산 대비 ±0.5 m. 지형고는 GEDTM30 원자료 정확도(수 m) 범위.
- 화면 폭이 1280 px 미만(노트북 일부·휴대폰)이면 선택 바가 왼쪽 패널(휴대폰은 **Controls(메뉴)**) 안에 있습니다.
- 제출 이후 바뀐 점: 사이트 첫 화면에 랜딩 페이지가 추가되어 **Explore(시작하기)** 를 한 번 더 누릅니다(①). 공항 선택은 왼쪽 버튼에서 위쪽 선택 바로 옮겨졌습니다(②).

## 내 PC에서 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 검사: `npx tsc --noEmit -p .`, 빌드: `npm run build`.

## 기능과 코드 위치

| 기능 | 위치 |
|---|---|
| Annex 14 OLS 기하 계산(진입·이륙상승·전이·내부수평·원추·OFZ), 복수 활주로 최저 지배표면 합성 | `src/lib/ols-engine.js` (`olsCand`, `ols`, `olsAll`) |
| 지형(GEDTM30 내장 / 온라인 지형 타일), 지형·건물 침투 판정 | `src/lib/ols-engine.js` (`demAt`, `penColor`, `buildObstacles`, `stats`) |
| 활주로 연장·평행활주로 시나리오, 기존 OLS 비교 | `src/lib/ols-engine.js` (`frames`, `setExt`), `src/components/simulator.tsx` |
| 계기접근절차(ILS, 실패접근) 3D 표시 — 인천 8개(활주로 양방향)·김포 5개·제주 4개·김해 1개, 연장 시 경로 이동, 항공기 이착륙 애니메이션(인천은 활주로별 이륙·착륙 전용 운영) | `src/data/procedures.js`, `src/lib/ols-engine.js` (`buildProcs`, `procShift`) |
| 화면(공항 선택, 표면 토글, 고도 판독) | `src/components/simulator.tsx` |
| 공항 레지스트리(37개 공항: 활주로 시단 좌표·표고, 가정값 안내) | `src/data/airports.js` |
| 공항별 OSM 활주로·건물·도로 데이터 / 지형 격자 | `public/data/osm_*.js`, `public/dem/*.bin` |
| 랜딩·Product·Project·About·Contact·Log in·Sign up 페이지 | `src/app/` |
| 영어/한국어 전환(🌐 버튼, 브라우저 언어 따라감·선택 기억) | `src/lib/lang.ts`, `src/components/lang-button.tsx` |

공항 데이터(`airports.js`, `public/data`, `public/dem`)는 별도 저장소(cadip-web)의 `tools/ols` 스크립트로
OpenStreetMap(Overpass)·GEDTM30에서 생성했습니다.

## 데이터 출처

- 활주로 시단 좌표·표고: 각국 AIP AD 2 (출처는 공항별 안내 문구에 표기). AIP가 없는 공항은 OpenStreetMap 활주로 끝점과 가정값을 쓰고, 화면에 "가정"으로 표시합니다.
- 지형: GEDTM30 (OpenGeoHub / OpenLandMap, CC BY 4.0), AWS Terrain Tiles
- 건물·도로: © OpenStreetMap contributors (ODbL). `public/data`의 공항별 데이터는 OpenStreetMap에서 추출한 것으로 ODbL을 따릅니다.
- 배경 영상: Esri World Imagery (화면 표시용)
- 계기접근절차: AIP 대한민국 RKSI AD 2-51/55/58/60, 2-62~69 (AIRAC AIP AMDT 13/25, 2/26, 3/26), RKSS AD 2-29/30/32/34/37, RKPC AD 2-21/22/26/27, RKPK AD 2-21 (AIP AMDT 11/26). DME 호와 실패접근 중간 고도(최소 상승률 2.5 %)는 근사값(≈)
