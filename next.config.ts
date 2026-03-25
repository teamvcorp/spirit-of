import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Bundle the Prisma query engine binaries for all routes
    '/**': ['./app/generated/prisma/**'],
  },
};

export default nextConfig;
