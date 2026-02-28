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
    '@metabuilder/redux-slices',
    '@metabuilder/redux-core',
    '@metabuilder/hooks',
    '@metabuilder/hooks-canvas',
    '@metabuilder/service-adapters',
    '@metabuilder/services',
    '@metabuilder/types',
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

    // Resolve @metabuilder/components/fakemui subpath (used by migrated components)
    config.resolve.alias['@metabuilder/components/fakemui'] = join(fakeMuiPath, 'index.ts');

    if (isServer) {
      // Server-side: pyodide is browser-only. Use null-loader so any accidental
      // server import returns an empty module instead of trying to load WASM in Node.
      config.module.rules.push({
        test: /node_modules[\\/]pyodide[\\/]pyodide\.js/,
        use: 'null-loader',
      });
    } else {
      // Client-side: redirect import('pyodide') to a native browser ESM import of
      // pyodide.mjs served from the local public directory (no CDN, files from npm).
      // Using a promise external means webpack emits a native import() for this module
      // so pyodide's own internal dynamic imports (asm.js, wasm, stdlib) are also
      // native browser fetches — webpack's chunk loader never intercepts them.
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals
            : config.externals ? [config.externals] : []),
        async ({ request }) => {
          if (request === 'pyodide') {
            return 'promise import("/pastebin/pyodide/pyodide.mjs")';
          }
        },
      ];

      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: false,
        fs: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
