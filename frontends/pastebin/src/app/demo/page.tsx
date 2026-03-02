'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@metabuilder/components/fakemui';
import { Sparkle } from '@phosphor-icons/react';
import { DEMO_CODE } from '@/components/demo/demo-constants';
import { DemoFeatureCards } from '@/components/demo/DemoFeatureCards';
import { PageLayout } from '../PageLayout';

export const dynamicParams = true

// Dynamically import SplitScreenEditor to avoid SSR issues with Pyodide
const SplitScreenEditor = dynamic(
  () => import('@/components/features/snippet-editor/SplitScreenEditor').then(mod => ({ default: mod.SplitScreenEditor })),
  { ssr: false }
);

export default function DemoPage() {
  const [code, setCode] = useState(DEMO_CODE);

  return (
    <PageLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
      >
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ height: '40px', width: '40px', borderRadius: '12px', background: 'linear-gradient(to bottom right, var(--mat-sys-accent, var(--mat-sys-tertiary)), var(--mat-sys-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkle style={{ width: '20px', height: '20px', color: 'var(--mat-sys-on-primary)' }} weight="fill" />
            </div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Split-Screen Demo</h2>
          </div>
          <p style={{ color: 'var(--mat-sys-on-surface-variant)' }}>
            Experience live React component editing with real-time preview. Edit the code on the left and watch it update instantly on the right.
          </p>
        </div>

        <Card>
          <CardHeader>
            <h3 style={{ fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkle style={{ width: '20px', height: '20px', color: 'var(--mat-sys-accent, var(--mat-sys-tertiary))' }} weight="fill" />
              Interactive Code Editor
            </h3>
            <p style={{color:'var(--mat-sys-on-surface-variant)',fontSize:'0.875rem'}}>
              This editor supports JSX, TSX, JavaScript, and TypeScript with live preview. 
              Try switching between Code, Split, and Preview modes using the buttons above the editor.
            </p>
          </CardHeader>
          <CardContent>
            <SplitScreenEditor
              value={code}
              onChange={setCode}
              language="JSX"
              height="600px"
            />
          </CardContent>
        </Card>

        <DemoFeatureCards />
      </motion.div>
    </PageLayout>
  );
}
