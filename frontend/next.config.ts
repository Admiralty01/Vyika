import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    "*.loca.lt",
    "loca.lt",
    "*.ngrok-free.app",
    "*.trycloudflare.com",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.loca.lt",
        "loca.lt",
        "localhost:3000",
        "127.0.0.1:3000",
        "*.ngrok-free.app",
        "*.trycloudflare.com",
      ],
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8000/api/v1/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:8000/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
