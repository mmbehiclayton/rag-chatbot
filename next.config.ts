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
  async redirects() {
    if (!movedTo) return [];
    return [
      { source: "/:path*", destination: `${movedTo}/:path*`, permanent: false },
    ];
  },
};

export default nextConfig;
