/** @type {import('next').NextConfig} */
const nextConfig = {
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
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;
