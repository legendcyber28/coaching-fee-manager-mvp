import type { NextConfig } from 'next';
// The app uses ordinary img elements. Disable the unused image optimizer so
// untrusted images cannot reach the transitive sharp/libvips decoder.
const nextConfig: NextConfig = { reactStrictMode: true, images: { unoptimized: true } };
export default nextConfig;
