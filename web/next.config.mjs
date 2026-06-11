/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SSE must not be buffered/compressed by the dev server, or the browser's
  // reader.read() never yields incremental chunks.
  compress: false,
  // The Argus bridge runs on :8000. Proxy /api/* to it so the browser can use
  // same-origin relative URLs (and SSE) without CORS or hardcoded ports.
  async rewrites() {
    const target = process.env.ARGUS_API ?? "http://127.0.0.1:8000";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
