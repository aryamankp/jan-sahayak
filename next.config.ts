import type { NextConfig } from "next";
import withPWA from "next-pwa";

const config: NextConfig = {
  // PWA Configuration
  ...withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
  }),

  // Image Configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'supabasestorage.co',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },

  // Turbopack compat (empty object as requested by error)
  // Turbopack compat (empty object as requested by error)
  experimental: {
    // turbopack: {},
  }
};

export default config;
