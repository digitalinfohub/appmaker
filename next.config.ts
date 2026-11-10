import type { NextConfig } from "next";

// App Maker ships as a fully static studio so it can be hosted on GitHub Pages.
// For a project page (https://user.github.io/appmaker/) set NEXT_PUBLIC_BASE_PATH=/appmaker
// at build time; for a custom domain or user site leave it unset.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  // The cloud preview serves the dev server through a different hostname.
  allowedDevOrigins: ["pv-9ee97c67f0ee-a4d62d6b-46a5-4371-99f7-c3163fc8f880.style.dev"],
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
