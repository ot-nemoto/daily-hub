import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
