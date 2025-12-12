import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use static export for production builds (Railway can serve static files)
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // Ensure API calls work correctly
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
};

export default nextConfig;
