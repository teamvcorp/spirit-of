import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling the generated Prisma client so that
  // __dirname stays correct and the .node engine binary can be resolved.
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    // Ensure the Prisma query-engine binaries are included in every route's
    // deployment bundle (Vercel Lambda).
    '/**': ['./app/generated/prisma/**'],
  },
};

export default nextConfig;
