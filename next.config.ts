import type { NextConfig } from "next";

// Set MOVED_TO_URL on the old Vercel project at cutover, so its address sends
// teachers (and their bookmarks) to the VPS instead of writing to the old database.
const movedTo = process.env.MOVED_TO_URL?.trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  // The Docker image runs .next/standalone (see Dockerfile and docs/deploy-vps.md).
  output: "standalone",
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // The service worker must never be cached, or teachers keep an old one after a deploy.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  async redirects() {
    if (!movedTo) return [];
    return [
      { source: "/:path*", destination: `${movedTo}/:path*`, permanent: false },
    ];
  },
};

export default nextConfig;
