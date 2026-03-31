/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for StellarWalletsKit browser-only modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
