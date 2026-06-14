import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SSE must not be buffered/compressed by the dev server, or the browser's
  // reader.read() never yields incremental chunks (the live stream would
  // arrive all at once at the end).
  compress: false,
  // Allow .md/.mdx files to be treated as routes/pages (docs live in app/docs/**).
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
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

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  },
});

export default withMDX(nextConfig);
