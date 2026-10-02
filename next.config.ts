import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-indicator rechtsonder, zodat hij de sidebar niet overlapt.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
