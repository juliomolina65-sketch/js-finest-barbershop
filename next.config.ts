import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's native bindings can't be bundled — mark them external so
  // Turbopack/Next.js leaves them as a runtime require.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "prisma"],

  images: {
    // Next 16 restricts images.qualities to [75] by default and silently
    // coerces anything else to the nearest allowed value. The hero logo is
    // fine gold linework on black, where the default lossy pass is visible,
    // so 95 has to be allowed explicitly for the quality prop to take effect.
    qualities: [75, 95],

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
    // Middleware/proxy truncates request bodies at 10MB by default, which is
    // SEPARATE from serverActions.bodySizeLimit below. Without this, a barber
    // uploading a few phone photos got "Unexpected end of form" because the
    // multipart body was cut off mid-stream. Named proxyClientMaxBodySize in
    // this version (middlewareClientMaxBodySize is the deprecated alias; the
    // two cannot both be set).
    proxyClientMaxBodySize: "60mb",

    serverActions: {
      // Allow photo uploads from phones (iPhone photos are typically 3–8 MB,
      // and we accept up to 12 photos per work batch). Server-side validation
      // in src/app/dashboard/profile/photo-actions.ts caps each FILE at 12 MB.
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
