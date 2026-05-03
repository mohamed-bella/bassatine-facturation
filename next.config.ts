import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['node-cron', 'ical.js'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bassatine-skoura.com',
      },
      {
        protocol: 'https',
        hostname: 'mohamedbella.com',
      },
    ],
  },
};

export default nextConfig;

