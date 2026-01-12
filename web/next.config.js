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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.nijisanji.jp", pathname: "/api/image-proxy" },
      { protocol: "https", hostname: "images.microcms-assets.io", pathname: "/assets/**" },
    ],
  },
};

export default nextConfig;
