import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "OLS Simulator · CADIP-II",
  description: "ICAO Annex 14 obstacle limitation surfaces in 3D — multi-runway, with terrain and OSM buildings — for the CADIP-II airports.",
};
export const viewport = { themeColor: "#0b0d10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable} ${mono.variable}`}>
      <body className="h-full overflow-hidden bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
