import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-indicator rechtsonder, zodat hij de sidebar niet overlapt.
  devIndicators: { position: "bottom-right" },
  logging: {
    // Next.js logt in dev standaard elke Server Function-aanroep mét argumenten.
    // Die argumenten zijn casusteksten; die mogen nooit in een log belanden.
    serverFunctions: false,
  },
};

export default nextConfig;
