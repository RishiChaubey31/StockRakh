import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['mongodb'],
  // Use webpack instead of Turbopack for better MongoDB compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('mongodb');
    }
    return config;
  },
};

export default nextConfig;
