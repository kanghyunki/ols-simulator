import type { NextConfig } from "next";

const day = "public, max-age=86400";
const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/data/:path*", headers: [{ key: "Cache-Control", value: day }] },
      { source: "/dem/:path*", headers: [{ key: "Cache-Control", value: day }] },
    ];
  },
};
export default nextConfig;
