declare module '*.css' {}
declare module '*.scss' {}
declare module '*.svg' {}

// Webpack require.context (replaces Vite's import.meta.glob)
declare namespace __WebpackModuleApi {
  interface RequireContext {
    keys(): string[];
    <T = unknown>(id: string): T;
  }
}

export {}
