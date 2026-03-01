'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { PageLayout } from './PageLayout';
import { useTranslation } from '@/hooks/useTranslation';

// Dynamically import SnippetManagerRedux to avoid SSR issues with Pyodide
const SnippetManagerRedux = dynamic(
  () => import('@/components/SnippetManagerRedux').then(mod => ({ default: mod.SnippetManagerRedux })),
  { ssr: false }
);

export default function HomePage() {
  const t = useTranslation()
  return (
    <PageLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8">
          <h1 style={{ fontFamily: 'var(--mat-sys-headline-large-font)', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--mat-sys-on-surface)' }}>{t.page.heading}</h1>
          <p style={{ color: 'var(--mat-sys-on-surface-variant)', fontSize: '1rem' }}>{t.page.subtitle}</p>
        </div>
        <SnippetManagerRedux />
      </motion.div>
    </PageLayout>
  );
}
