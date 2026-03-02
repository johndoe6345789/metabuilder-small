'use client';

import { motion } from 'framer-motion';
import { Code } from '@phosphor-icons/react';
import pkg from '../../package.json';
import { Navigation } from '@/components/layout/navigation/Navigation';
import { NavigationSidebar } from '@/components/layout/navigation/NavigationSidebar';
import { BackendIndicator } from '@/components/layout/BackendIndicator';
import { AlertsBell } from '@/components/layout/AlertsBell';
import { LangSelector } from '@/components/layout/LangSelector';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { ThemeApplier } from '@/components/layout/ThemeApplier';
import { useTranslation } from '@/hooks/useTranslation';
import { ReactNode } from 'react';
import styles from './page-layout.module.scss';

export function PageLayout({ children }: { children: ReactNode }) {
  const t = useTranslation();

  const safePad = '0.5rem';
  const safeAreaPadding = {
    paddingLeft: `max(${safePad}, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(${safePad}, env(safe-area-inset-right, 0px))`,
  };

  return (
    <div className={styles.root} style={{ backgroundColor: 'var(--mat-sys-background)' }} data-testid="page-layout">
      <div className={styles.gridPattern} aria-hidden="true" />

      <ThemeApplier />
      <NavigationSidebar />

      <div className={styles.contentWrapper}>
        <header className={styles.header} data-testid="page-header">
          <div
            className={styles.headerInner}
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
                <ThemeSwitcher />
                <LangSelector />
                <BackendIndicator />
              </motion.div>
            </div>
          </div>
        </header>

        <main
          className={styles.main}
          style={safeAreaPadding}
          data-testid="main-content"
        >
          {children}
        </main>

        <footer className={styles.footer}>
          <div
            className={styles.footerInner}
            style={{
              ...safeAreaPadding,
              paddingBottom: `max(1rem, env(safe-area-inset-bottom, 0px))`,
            }}
          >
            <div className={styles.footerText}>
              <p>{t.page.footer.tagline}</p>
              <p className={styles.footerNote}>{t.page.footer.techNote}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
