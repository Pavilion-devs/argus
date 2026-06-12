/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SSE must not be buffered/compressed by the dev server, or the browser's
  // reader.read() never yields incremental chunks (the live stream would
  // arrive all at once at the end).
  compress: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // The Argus bridge (`argus serve`) runs on :8010 by default. Proxy /api/* to it so the
  // browser uses same-origin relative URLs (and SSE) without CORS or hardcoded
  // ports. Override the target with ARGUS_API if the bridge runs elsewhere.
  async rewrites() {
    const target = process.env.ARGUS_API ?? "http://127.0.0.1:8010";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
