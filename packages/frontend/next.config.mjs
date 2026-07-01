/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/Atlas-Logistics',
  assetPrefix: '/Atlas-Logistics/',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@xpallares1987-ai/control-tower-ui'],
  typescript: {
    ignoreBuildErrors: false, 
  },
  productionBrowserSourceMaps: true,
  env: { NEXT_PUBLIC_GITHUB_PAGES: "true" },
};

export default nextConfig;
