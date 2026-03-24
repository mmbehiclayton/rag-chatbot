import type { NextConfig } from "next";

const dbUrl = "postgresql://neondb_owner:npg_TCgjN0fnc2aP@ep-steep-shadow-amk94n39-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    DATABASE_URL: dbUrl,
  }
};

export default nextConfig;
