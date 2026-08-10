import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['tedious-lucca-sickly.ngrok-free.dev'],
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
