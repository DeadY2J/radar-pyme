import type { NextConfig } from "next";

const cabeceras = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: cabeceras },
      // La demo por negocio se puede enmarcar solo desde el propio origen (modo presentación); el resto, nunca.
      { source: "/((?!demo/).*)", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      { source: "/demo/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      // Las páginas reciben la CSP completa con nonce desde src/proxy.ts. Las rutas API (JSON, PDF) solo necesitan esta.
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'none'" }] },
    ];
  },
};
export default nextConfig;
