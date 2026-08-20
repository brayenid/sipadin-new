import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=()",
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['tedious-lucca-sickly.ngrok-free.dev'],
  async redirects() {
    return [
      {
        source: '/dashboard/absensi',
        destination: '/dashboard/presensi',
        permanent: true,
      },
      {
        source: '/dashboard/absensi/:path*',
        destination: '/dashboard/presensi/:path*',
        permanent: true,
      },
      {
        source: '/p/absensi/:token',
        destination: '/p/presensi/:token',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
