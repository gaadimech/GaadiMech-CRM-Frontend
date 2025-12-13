import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use server mode for Railway deployment (better for custom domains and HTTPS)
  // Remove 'output: export' to enable Next.js server mode
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // Ensure API calls work correctly
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
  // Enable compression for better performance
  compress: true,
  // Ensure proper handling of custom domains
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
