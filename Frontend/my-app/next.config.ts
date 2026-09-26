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

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:5000/uploads/:path*",
      },
      {
        source: "/ai/:path*",
        destination: "http://127.0.0.1:8000/ai/:path*",
      },
    ];
  },
};

export default nextConfig;
