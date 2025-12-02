import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3-us-west-2.amazonaws.com',
        pathname: '/cbi-image-service-prd/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn2.futurepedia.io',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
