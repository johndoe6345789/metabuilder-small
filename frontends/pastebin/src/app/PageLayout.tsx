'use client';

import { motion } from 'framer-motion';
import { Code, Globe } from '@phosphor-icons/react';
import pkg from '../../package.json';
import { Navigation } from '@/components/layout/navigation/Navigation';
import { NavigationSidebar } from '@/components/layout/navigation/NavigationSidebar';
import { useNavigation } from '@/components/layout/navigation/useNavigation';
import { BackendIndicator } from '@/components/layout/BackendIndicator';
import { AlertsBell } from '@/components/layout/AlertsBell';
import { useAppDispatch, useAppSelector, setLocale } from '@/store/exports';
import { ReactNode } from 'react';
import styles from './page-layout.module.scss';

export function PageLayout({ children }: { children: ReactNode }) {
  const { menuOpen } = useNavigation();
  const dispatch = useAppDispatch();
  const locale = useAppSelector(state => state.ui.locale);

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
        <header className={styles.header} data-testid="page-header">
          <div
            className="container mx-auto px-2 sm:px-6 w-full min-w-0"
            style={{
              ...safeAreaPadding,
              paddingTop: `max(0.75rem, env(safe-area-inset-top, 0px))`,
              paddingBottom: '0.75rem',
            }}
          >
            <div className={styles.headerRow}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className={styles.logoGroup}
              >
                <Navigation />
                <div className="logo-icon-box">
                  <Code weight="bold" />
                </div>
                <span className="logo-text" aria-label="CodeSnippet" data-testid="logo-text">
                  CodeSnippet
                </span>
                <span className={styles.versionBadge} aria-label={`Version ${pkg.version}`}>
                  v{pkg.version}
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className={styles.headerActions}
              >
                <AlertsBell />
                <button
                  className={styles.langBtn}
                  onClick={() => dispatch(setLocale(locale === 'en' ? 'es' : 'en'))}
                  aria-label="Toggle language"
                  data-testid="lang-toggle"
                >
                  <Globe size={16} aria-hidden="true" />
                  <span>{locale.toUpperCase()}</span>
                </button>
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
