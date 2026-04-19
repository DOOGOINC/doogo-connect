import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/image/**",
      },
      {
        pathname: "/images/**",
      },
      {
        pathname: "/api/storage/object",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "capa.ai",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
