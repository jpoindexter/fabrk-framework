import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const corePackage = require('../../packages/core/package.json')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@fabrk/components', '@fabrk/core', '@fabrk/design-system'],
  env: {
    NEXT_PUBLIC_FRAMEWORK_VERSION: corePackage.version,
  },
}

export default nextConfig
