import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
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

