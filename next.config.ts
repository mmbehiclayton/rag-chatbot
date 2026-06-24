import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // pdfjs-dist must not be bundled — its internal worker import() uses import.meta.url
  // which resolves to the bundle chunk path (not node_modules) when bundled, breaking worker setup.
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
