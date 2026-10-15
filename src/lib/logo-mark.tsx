import { ImageResponse } from "next/og";

// The header logo (white roof line + approach-blue bar) on a dark rounded tile, as a PNG for favicons and home-screen icons.
export function logoMark(px: number) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0d10", borderRadius: px * 0.22 }}>
        <svg width={px * 0.7} height={px * 0.7} viewBox="0 0 20 20">
          <path d="M2 14 L10 4 L18 14" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M5 17 H15" stroke="#4f7dff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
