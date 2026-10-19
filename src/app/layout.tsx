import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"] });
const serif = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });
// Korean serif for the headings in Korean mode (Instrument Serif has no Hangul); only the slices in use are fetched
const serifKo = Noto_Serif_KR({ variable: "--font-serif-ko", subsets: ["latin"], weight: "500", preload: false });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

const SITE = "https://ols-simulator.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "OLS Simulator · 3D Design Simulation",
  description: "Obstacle limitation surfaces over real terrain and buildings, runway scenarios and instrument procedures.",
  // Link previews (KakaoTalk etc.) show the title in bold with the description underneath: two lines
  openGraph: { title: "안녕하세요 OLS 시뮬레이터입니다", description: "여기를 눌러 경험해보세요" },
  twitter: { card: "summary_large_image", title: "안녕하세요 OLS 시뮬레이터입니다", description: "여기를 눌러 경험해보세요" },
  // Google Search Console ownership (URL-prefix property https://ols-simulator.vercel.app/)
  verification: { google: "KIfcJYPCW6deg1G5-WFLRxkJOI92zu7oFWo4dWt-vCQ" },
};
export const viewport = { themeColor: "#0b0d10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable} ${serif.variable} ${serifKo.variable} ${mono.variable}`}>
      <body className="h-full overflow-hidden bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
