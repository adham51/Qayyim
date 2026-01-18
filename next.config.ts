import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Only use standalone for production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This is the fix for Hot Reloading on Windows/Docker
  experimental: {
    watchOptions: {
      pollIntervalMs: 1000,
    },
  },
};

export default nextConfig;