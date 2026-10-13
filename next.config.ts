import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  /**
   * Set here rather than in vercel.json so they also apply in
   * development and survive a move off Vercel.
   *
   * No Content-Security-Policy yet: this app loads a Google font and
   * renders lesson bodies written by creators, so a policy written
   * without measuring what actually loads would break the product in
   * production and nowhere else. It is worth adding, in report-only
   * first.
   */
  /**
   * `(setup)` is a route group, so its pages serve at `/academy` and
   * `/onboarding` — the parentheses never reach the URL. Five
   * components redirected to `/setup/academy` anyway and every one of
   * them 404'd. They are fixed, but the dead path has already been in
   * production and may sit in a history entry or a bookmark.
   *
   * Permanent, and a prefix rather than the one path: if a `/setup/…`
   * link survives somewhere I did not find, this lands it on the real
   * route instead of a 404.
   */
  async redirects() {
    return [
      { source: "/setup", destination: "/onboarding", permanent: true },
      { source: "/setup/:path*", destination: "/:path*", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The storefront is meant to be linked, never embedded —
          // an academy page inside someone else's frame is a
          // credential-harvesting pattern, not a feature.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        // The proxy carries bearer tokens. Nothing may cache it, and
        // no crawler should index what it returns.
        source: "/api/backend/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, private" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
