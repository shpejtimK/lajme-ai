/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable image optimization for external images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'telegrafi.com',
      },
    ],
  },
}

module.exports = nextConfig



