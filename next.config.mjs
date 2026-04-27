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
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "@logtail/pino",
    "newrelic",
    "@react-pdf/renderer",
    "bullmq",
    "ioredis",
    "bcrypt",
  ],
};

export default nextConfig;
