import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"] });
const serif = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "OLS Simulator · 3D Design Simulation",
  description: "Obstacle limitation surfaces over real terrain and buildings, runway scenarios and instrument procedures.",
};
export const viewport = { themeColor: "#0b0d10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body className="h-full overflow-hidden bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
