import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // ブラウザの console ログをターミナルへ転送する dev 機能を無効化（Clerk 開発キー警告等のノイズ抑止）
  logging: {
    browserToTerminal: false,
  },
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
