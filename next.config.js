/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'pp3d.pt' }],
        destination: 'https://www.pp3d.pt/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
