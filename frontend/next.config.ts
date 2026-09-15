import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_INTERNAL_URL || "http://localhost:5000/api";
    const baseBackend = rawApiUrl.replace(/\/api\/?$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${baseBackend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

