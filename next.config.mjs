/** @type {import('next').NextConfig} */
function assetHost() {
  const raw = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  try {
    return raw ? new URL(raw).host : "";
  } catch {
    return "";
  }
}

const assetHostName = assetHost();
const frameSrc = [
  "'self'",
  "https://drive.google.com",
  "https://docs.google.com",
  "https://view.officeapps.live.com",
  "https://*.officeapps.live.com",
  "https://*.r2.dev",
  "https://*.cloudflarestorage.com",
  "https://*.googleusercontent.com",
  assetHostName ? `https://${assetHostName}` : "",
]
  .filter(Boolean)
  .join(" ");

const objectSrc = [
  "'self'",
  "https://*.r2.dev",
  "https://*.cloudflarestorage.com",
  assetHostName ? `https://${assetHostName}` : "",
  "blob:",
  "data:",
]
  .filter(Boolean)
  .join(" ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com https://*.r2.dev",
      `frame-src ${frameSrc}`,
      `object-src ${objectSrc}`,
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_ASSET_HOST: assetHostName,
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
