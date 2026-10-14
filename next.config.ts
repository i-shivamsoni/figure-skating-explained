import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: { position: "bottom-right" },
  // the dev server only trusts localhost and the hostname it was started with; opening the site at
  // 127.0.0.1 (or a LAN address for phone testing) must be allowed or the 3D viewer never loads
  // (its HMR socket and on-demand chunks are refused as cross-origin)
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
