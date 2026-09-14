import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ['26.178.104.165:3000', '26.178.104.165', '192.168.15.3', '*'],
};

export default nextConfig;
