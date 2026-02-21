/** @type {import('next').NextConfig} */
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const nextConfig = {
  basePath: '/codegen',
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    // Pre-existing type errors from Vite migration — Vite used tsc --noCheck
    ignoreBuildErrors: true,
  },
  // Transpile local monorepo packages (builds from source)
  transpilePackages: [
    // Root shared packages
    '@metabuilder/fakemui',
    '@metabuilder/components',
    '@metabuilder/hooks',
    '@metabuilder/types',
    '@metabuilder/interfaces',
    // Redux packages
    '@metabuilder/api-clients',
    '@metabuilder/core-hooks',
    '@metabuilder/hooks-auth',
    '@metabuilder/hooks-canvas',
    '@metabuilder/hooks-core',
    '@metabuilder/hooks-data',
    '@metabuilder/redux-core',
    '@metabuilder/redux-persist',
    '@metabuilder/redux-slices',
    '@metabuilder/service-adapters',
    '@metabuilder/services',
    '@metabuilder/timing-utils',
    '@metabuilder/scss',
  ],

  // Turbopack config — paths relative to turbopack root (monorepo root)
  turbopack: {
    root: resolve(__dirname, '../..'),
    resolveAlias: {
      '@': './frontends/codegen/src',
      // FakeMUI — root + subpath exports
      '@metabuilder/fakemui': './components/fakemui',
      '@metabuilder/fakemui/scss': './components/fakemui/scss/index.scss',
      '@metabuilder/fakemui/icons': './components/fakemui/icons/index.ts',
      '@metabuilder/fakemui/hooks': './components/fakemui/hooks.ts',
      '@metabuilder/fakemui/atoms': './components/fakemui/atoms/index.js',
      '@metabuilder/fakemui/layout': './components/fakemui/layout/index.ts',
      '@metabuilder/fakemui/data-display': './components/fakemui/data-display/index.ts',
      '@metabuilder/fakemui/inputs': './components/fakemui/inputs/index.ts',
      '@metabuilder/fakemui/surfaces': './components/fakemui/surfaces/index.ts',
      '@metabuilder/fakemui/feedback': './components/fakemui/feedback/index.ts',
      '@metabuilder/fakemui/navigation': './components/fakemui/navigation/index.ts',
      '@metabuilder/fakemui/utils': './components/fakemui/utils/index.js',
      // Components — resolve to source (bypasses broken dist SCSS imports)
      '@metabuilder/components': './components/index.tsx',
      '@metabuilder/components/cards': './components/cards/index.ts',
      '@metabuilder/components/layout': './components/layout/index.ts',
      '@metabuilder/components/navigation': './components/navigation/index.ts',
      // Root shared packages
      '@metabuilder/hooks': './hooks/src',
      '@metabuilder/types': './types/index.ts',
      '@metabuilder/interfaces': './interfaces/index.ts',
      // SCSS — shared styles from monorepo root
      '@metabuilder/scss/atoms/layout.module.scss': './scss/atoms/layout.module.scss',
      '@metabuilder/scss/theme.scss': './scss/theme.scss',
      '@metabuilder/scss/globals.scss': './scss/globals.scss',
      '@metabuilder/scss/global': './scss/global/_index.scss',
      // Redux — all packages resolve to source
      '@metabuilder/api-clients': './redux/api-clients/src',
      '@metabuilder/core-hooks': './redux/core-hooks/src',
      '@metabuilder/hooks-auth': './redux/hooks-auth/src',
      '@metabuilder/hooks-canvas': './redux/hooks-canvas/src',
      '@metabuilder/hooks-core': './redux/hooks/src',
      '@metabuilder/hooks-data': './redux/hooks-data/src',
      '@metabuilder/redux-core': './redux/core/src',
      '@metabuilder/redux-persist': './redux/persist/src',
      '@metabuilder/redux-slices': './redux/slices/src',
      '@metabuilder/redux-slices/uiSlice': './redux/slices/src/slices/uiSlice.ts',
      '@metabuilder/service-adapters': './redux/adapters/src',
      '@metabuilder/services': './redux/services/src',
      '@metabuilder/timing-utils': './redux/timing-utils/src',
    },
  },

  sassOptions: {
    loadPaths: [
      resolve(__dirname, '../../scss/m3-scss'),
      resolve(__dirname, '../../scss'),
    ],
    includePaths: [
      resolve(__dirname, '../../scss/m3-scss'),
      resolve(__dirname, '../../scss'),
    ],
    silenceDeprecations: ['legacy-js-api', 'import'],
  },

  // Proxy Flask backend API
  async rewrites() {
    const flaskUrl = process.env.FLASK_BACKEND_URL || 'http://localhost:5001';
    return [
      {
        source: '/api/storage/:path*',
        destination: `${flaskUrl}/api/storage/:path*`,
      },
      {
        source: '/health',
        destination: `${flaskUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
