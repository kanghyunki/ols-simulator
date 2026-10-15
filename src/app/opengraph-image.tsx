import { ImageResponse } from "next/og";

export const alt = "OLS Simulator · CADIP-II";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// KakaoTalk / Slack / Facebook link preview. Rendered by Next at /opengraph-image.
export default function OpenGraphImage() {
  const cx = 930, cy = 315; // plan-view OLS centred on the right half
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0b0d10 0%, #121826 100%)",
          color: "#e6e9ef",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", top: 0, left: 0 }}>
          {/* conical */}
          <ellipse cx={cx} cy={cy} rx="320" ry="330" fill="#a855f7" fillOpacity="0.08" stroke="#c084fc" strokeOpacity="0.7" strokeWidth="2" />
          {/* inner horizontal */}
          <ellipse cx={cx} cy={cy} rx="215" ry="225" fill="#3b82f6" fillOpacity="0.12" stroke="#60a5fa" strokeWidth="2" />
          {/* approach fans, both ends */}
          <polygon points={`${cx - 30},${cy - 95} ${cx + 30},${cy - 95} ${cx + 150},${cy - 345} ${cx - 150},${cy - 345}`} fill="#f59e0b" fillOpacity="0.22" stroke="#fbbf24" strokeWidth="2" />
          <polygon points={`${cx - 30},${cy + 95} ${cx + 30},${cy + 95} ${cx + 150},${cy + 345} ${cx - 150},${cy + 345}`} fill="#f59e0b" fillOpacity="0.22" stroke="#fbbf24" strokeWidth="2" />
          {/* transitional (both sides of strip) */}
          <polygon points={`${cx - 30},${cy - 95} ${cx - 30},${cy + 95} ${cx - 95},${cy + 150} ${cx - 95},${cy - 150}`} fill="#22c55e" fillOpacity="0.2" stroke="#4ade80" strokeWidth="2" />
          <polygon points={`${cx + 30},${cy - 95} ${cx + 30},${cy + 95} ${cx + 95},${cy + 150} ${cx + 95},${cy - 150}`} fill="#22c55e" fillOpacity="0.2" stroke="#4ade80" strokeWidth="2" />
          {/* strip + runway */}
          <rect x={cx - 30} y={cy - 95} width="60" height="190" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
          <rect x={cx - 9} y={cy - 85} width="18" height="170" fill="#e5e7eb" />
          <line x1={cx} y1={cy - 70} x2={cx} y2={cy + 70} stroke="#111827" strokeWidth="2" strokeDasharray="8 7" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px", justifyContent: "space-between", height: "100%", width: 640 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, letterSpacing: 6, color: "#93c5fd", fontWeight: 600 }}>CADIP-II</div>
            <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05, marginTop: 12 }}>OLS Simulator</div>
            <div style={{ fontSize: 30, color: "#9aa4b2", marginTop: 20, lineHeight: 1.35 }}>
              ICAO Annex 14 obstacle limitation surfaces in 3D, with terrain and buildings
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 22, color: "#cbd5e1" }}>
            {["Approach", "Transitional", "Inner Horizontal", "Conical", "Take-off"].map((s) => (
              <div key={s} style={{ padding: "7px 16px", border: "1px solid #334155", borderRadius: 999, background: "rgba(255,255,255,0.04)" }}>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
