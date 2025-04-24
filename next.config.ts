/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/nfc',
        destination: '/api/nfc',
      },
    ];
  },
};

export default nextConfig;
