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
