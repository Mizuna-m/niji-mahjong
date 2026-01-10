/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.API_BASE_INTERNAL
          ? `${process.env.API_BASE_INTERNAL}/api/:path*`
          : "http://api:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
