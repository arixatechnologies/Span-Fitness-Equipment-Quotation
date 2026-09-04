/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/quotations/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"]
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
