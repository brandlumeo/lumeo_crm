import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Enables minimal standalone server output for Docker (no node_modules needed at runtime)
  output: "standalone",
  // Don't advertise Next.js in response headers
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/deals/board',
        destination: '/pipeline',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
