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
    config.externals = [...config.externals, 'bcrypt'];
    return config
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/dashboard',
      },
    ]
  },
};

export default nextConfig;
