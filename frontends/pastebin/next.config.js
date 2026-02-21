/** @type {import('next').NextConfig} */
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const componentsPath = resolve(__dirname, '../../components');

const nextConfig = {
  basePath: '/pastebin',
  output: 'standalone',
  transpilePackages: [
    '@metabuilder/components',
    '@metabuilder/fakemui',
    '@metabuilder/redux-persist',
    '@metabuilder/hooks',
    '@metabuilder/services',
  ],
  sassOptions: {
    loadPaths: [
      resolve(__dirname, '../../scss/m3-scss'),
      resolve(__dirname, '../../scss'),
    ],
    includePaths: [
      './src/styles',
      resolve(__dirname, '../../scss/m3-scss'),
      resolve(__dirname, '../../scss'),
    ],
    silenceDeprecations: ['legacy-js-api', 'import'],
  },
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  eslint: {
    // Linting is handled separately with direct ESLint invocation (eslint.config.mjs)
    // Disable Next.js ESLint wrapper to avoid compatibility issues with ESLint 9+ flat config
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
    ignoreBuildErrors: true,
  },
  // Turbopack config (used by `next dev --turbopack`)
  // webpack() callback below is still used by `next build`
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
  webpack: (config, { webpack, isServer }) => {
    // Resolve @metabuilder/components to source
    config.resolve.alias['@metabuilder/components'] = join(componentsPath, 'index.tsx');

    // Add fakemui alias to match workflowui pattern
    const fakeMuiPath = resolve(__dirname, '../../components/fakemui');
    config.resolve.alias['@metabuilder/fakemui'] = fakeMuiPath;

    // Handle node: protocol for client-side bundles (pyodide uses node:path etc.)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: false,
        fs: false,
        crypto: false,
      };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
    }

    return config;
  },
};

export default nextConfig;
