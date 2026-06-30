import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
