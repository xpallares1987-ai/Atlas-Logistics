/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/Shipment-Dashboard",
  assetPrefix: "/Shipment-Dashboard/",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [],
  typescript: {
    ignoreBuildErrors: false,
  },
  productionBrowserSourceMaps: false,
  env: { NEXT_PUBLIC_GITHUB_PAGES: "true" },
};

export default nextConfig;
