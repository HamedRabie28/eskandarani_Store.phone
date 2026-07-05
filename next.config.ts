// No "output: standalone" — Vercel handles deployment automatically
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  turbopack: {
    // Ensure Turbopack picks this folder as the workspace root (absolute path)
    // __dirname will be the directory of this config file at runtime
    root: __dirname,
  },
};

export default nextConfig;
