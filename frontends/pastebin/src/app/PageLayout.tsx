'use client';

import { motion } from 'framer-motion';
import { Code } from '@phosphor-icons/react';
import { Navigation } from '@/components/layout/navigation/Navigation';
import { NavigationSidebar } from '@/components/layout/navigation/NavigationSidebar';
import { useNavigation } from '@/components/layout/navigation/useNavigation';
import { BackendIndicator } from '@/components/layout/BackendIndicator';
import { AppStatusAlerts } from '@/components/layout/AppStatusAlerts';
import { ReactNode } from 'react';

export function PageLayout({ children }: { children: ReactNode }) {
  const { menuOpen } = useNavigation();
  const safePad = '0.5rem';
  const safeAreaPadding = {
    paddingLeft: `max(${safePad}, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(${safePad}, env(safe-area-inset-right, 0px))`,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--mat-sys-background)' }} data-testid="page-layout">
      <div className="grid-pattern" aria-hidden="true" />

      <NavigationSidebar />

      <motion.div
        initial={false}
        animate={{ marginLeft: menuOpen ? 320 : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 flex flex-col min-h-screen"
      >
        <header className="border-b border-border sticky top-0 z-20 overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--mat-sys-surface-container) 97%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }} data-testid="page-header">
          <div
            className="container mx-auto px-2 py-3 sm:px-6 sm:py-6 w-full min-w-0"
            style={{
              ...safeAreaPadding,
              paddingTop: `max(${safePad}, env(safe-area-inset-top, 0px))`,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap min-w-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="logo-container"
              >
                <Navigation />
                <div className="logo-icon-box">
                  <Code weight="bold" />
                </div>
                <span className="logo-text" aria-label="CodeSnippet" data-testid="logo-text">
                  CodeSnippet
                </span>
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: 'var(--mat-sys-primary)',
                    color: 'var(--mat-sys-on-primary)',
                    lineHeight: 1,
                    alignSelf: 'flex-start',
                    marginTop: '2px',
                    opacity: 0.85,
                  }}
                  aria-label="Version 0.2.3"
                >
                  v0.2.3
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              >
                <BackendIndicator />
              </motion.div>
            </div>
          </div>
        </header>

        <main
          className="container mx-auto px-3 py-4 sm:px-6 sm:py-8 flex-1"
          style={safeAreaPadding}
          data-testid="main-content"
        >
          <div className="mb-4">
            <AppStatusAlerts />
          </div>
          {children}
        </main>

        <footer className="border-t border-border" style={{ backgroundColor: 'var(--mat-sys-surface-container-low)' }}>
          <div
            className="container mx-auto px-3 py-4 sm:px-6 sm:py-8"
            style={{
              ...safeAreaPadding,
              paddingBottom: `max(1rem, env(safe-area-inset-bottom, 0px))`,
            }}
          >
            <div className="text-center text-xs sm:text-sm text-muted-foreground">
              <p>Save, organize, and share your code snippets with beautiful syntax highlighting and live execution</p>
              <p className="mt-2 text-xs">Supports React preview and Python execution via Pyodide</p>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
