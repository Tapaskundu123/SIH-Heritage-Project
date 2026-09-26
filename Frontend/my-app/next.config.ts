import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage builds — produces a self-contained
  // server bundle in .next/standalone that doesn't need node_modules.
  output: "standalone",

  // Allow images from common external domains (extend as needed)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
