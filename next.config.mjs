/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
  turbopack: {},
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "@react-pdf/renderer",
    "bullmq",
    "ioredis",
    "bcrypt",
  ],
};

export default nextConfig;
