/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/quotations/[id]/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4.4mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
    ]
  }
};

export default nextConfig;
