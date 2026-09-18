import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ['10.212.134.7', '192.168.15.3'],
};

export default nextConfig;
