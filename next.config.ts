import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-indicator rechtsonder, zodat hij de sidebar niet overlapt.
  devIndicators: { position: "bottom-right" },
  logging: {
    // Next.js logt in dev standaard elke Server Function-aanroep mét argumenten.
    // Die argumenten zijn casusteksten; die mogen nooit in een log belanden.
    serverFunctions: false,
  },
  // Opt-in: de dev-server ook vanaf een telefoon op hetzelfde lokale netwerk gebruiken (bijv.
  // CERTUM_DEV_LAN_HOST=192.168.178.138). Alleen dev, geen publieke deployment, geen tunnel. Er is nog geen auth:
  // alleen gebruiken op een vertrouwd thuisnetwerk.
  allowedDevOrigins: process.env.CERTUM_DEV_LAN_HOST ? [process.env.CERTUM_DEV_LAN_HOST.trim()] : [],
};

export default nextConfig;
