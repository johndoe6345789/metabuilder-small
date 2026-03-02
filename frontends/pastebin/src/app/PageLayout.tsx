'use client';

import { motion } from 'framer-motion';
import { MaterialIcon } from '@metabuilder/components/fakemui';
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

  return (
    <div className={styles.root} data-testid="page-layout">
      <div className={styles.gridPattern} aria-hidden="true" />

      <ThemeApplier />
      <NavigationSidebar />

      <div className={styles.contentWrapper}>
        <header className={styles.header} data-testid="page-header">
          <div className={styles.headerInner}>
            <div className={styles.headerRow}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className={styles.logoGroup}
              >
                <Navigation />
                <div className="logo-icon-box">
                  <MaterialIcon name="code" />
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

        <main className={styles.main} data-testid="main-content">
          {children}
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
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
