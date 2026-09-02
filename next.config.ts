import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's native bindings can't be bundled — mark them external so
  // Turbopack/Next.js leaves them as a runtime require.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "prisma"],

  images: {
    // next/image serves two kinds of local files: build-time assets in
    // public/ (logo, PWA icons) and runtime uploads streamed by the
    // /uploads/[...path] route handler off the persistent volume.
    // The dashboard appends ?v=<timestamp> to bust the cache after a profile
    // photo is replaced, so query strings have to be allowed too.
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/uploads/**", search: "**" },
    ],
  },

  experimental: {
    serverActions: {
      // Allow photo uploads from phones (iPhone photos are typically 3–8 MB,
      // and we accept up to 12 photos per work batch). Server-side validation
      // in src/app/dashboard/profile/photo-actions.ts caps each FILE at 12 MB.
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
