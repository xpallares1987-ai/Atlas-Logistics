/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/Atlas-Logistics',
  assetPrefix: '/Atlas-Logistics/',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [],
  typescript: {
    ignoreBuildErrors: false, 
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: true,
  env: { NEXT_PUBLIC_GITHUB_PAGES: "true" },
};

export default nextConfig;
