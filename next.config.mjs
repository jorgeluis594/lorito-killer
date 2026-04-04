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
  webpack: (config) => {
    config.externals = [...config.externals, "bcrypt"];
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      "pino",
      "pino-pretty",
      "@react-pdf/renderer",
      "bullmq",
      "ioredis",
    ],
  },
};

export default nextConfig;
