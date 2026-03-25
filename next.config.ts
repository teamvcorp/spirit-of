import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Ensure the Prisma query-engine binaries are included in every
    // route's Vercel Lambda deployment bundle.
    '/**': ['./app/generated/prisma/**'],
  },
};

export default nextConfig;
