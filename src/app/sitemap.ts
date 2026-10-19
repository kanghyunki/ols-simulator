import type { MetadataRoute } from "next";

// Public pages for search engines (Sign up / Log in left out)
const SITE = "https://ols-simulator.vercel.app";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/product", "/project", "/about", "/contact"].map((p) => ({ url: SITE + p, changeFrequency: "monthly", priority: p ? 0.7 : 1 }));
}
