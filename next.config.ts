import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
