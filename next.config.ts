import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Guides are authored as MDX under src/content and compiled at build time by
  // next-mdx-remote/rsc, so no MDX webpack/turbopack loader is required here.
  outputFileTracingIncludes: {
    // The MDX sources are read from disk at runtime by the /learn routes and by
    // /llms-full.txt, so they must be traced into the serverless bundle.
    "/learn/**": ["./src/content/**/*"],
    "/llms-full.txt": ["./src/content/**/*"],
    "/sitemap.xml": ["./src/content/**/*"],
  },
};

export default nextConfig;
