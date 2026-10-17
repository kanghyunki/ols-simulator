import type { NextConfig } from "next";

const day = "public, max-age=86400";
const nextConfig: NextConfig = {
  async redirects() {
    return [   // renamed pages keep their old links working
      { source: "/demo", destination: "/contact", permanent: true },
      { source: "/signin", destination: "/signup", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/data/:path*", headers: [{ key: "Cache-Control", value: day }] },
      { source: "/dem/:path*", headers: [{ key: "Cache-Control", value: day }] },
    ];
  },
};
export default nextConfig;
