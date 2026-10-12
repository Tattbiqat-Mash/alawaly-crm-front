import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Cache Components (and partialPrefetching, which builds on it) stay off: on Cloudflare
  // Workers (OpenNext 1.20, Next 16.4) every page render hangs and the Worker returns 1101.
  // See DECISIONS.md (Environment) before turning them back on.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The dashboard (S02) lives at "/" per the wireframes; /dashboard is a friendly alias.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: false },
      { source: "/:locale(ar|en)/dashboard", destination: "/:locale", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
