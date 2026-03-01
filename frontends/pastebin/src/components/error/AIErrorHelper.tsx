import { useState } from 'react'
import { Button, Dialog, DialogHeader, DialogTitle, DialogContent, Alert } from '@metabuilder/components/fakemui'
import { Sparkle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeErrorWithAI } from './analyzeError'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingAnalysis } from './LoadingAnalysis'
import { useTranslation } from '@/hooks/useTranslation'

interface AIErrorHelperProps {
  error: Error | string
  context?: string
  className?: string
}

export function AIErrorHelper({ error, context, className }: AIErrorHelperProps) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string>('')

  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'string' ? '' : error.stack

  const analyzeError = async () => {
    setOpen(true)
    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysis('')

    try {
      const result = await analyzeErrorWithAI(errorMessage, errorStack, context)
      setAnalysis(result)
    } catch (err) {
      console.error('AI analysis failed', err)
      setAnalysisError(t.aiErrorHelper.analysisError)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={className}
        data-testid="ai-error-helper"
        role="region"
        aria-label="AI error analysis tool"
      >
        <Button
          onClick={analyzeError}
          variant="outlined"
          size="sm"
          className="gap-2 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent hover:border-accent transition-all"
          data-testid="ai-helper-btn"
          aria-label="Ask AI for help with this error"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            aria-hidden="true"
          >
            <Sparkle className="h-4 w-4" weight="fill" />
          </motion.div>
          {t.aiErrorHelper.button}
        </Button>
      </motion.div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogHeader className="pr-8">
          <DialogTitle>
            <span className="flex items-center gap-2" data-testid="ai-analysis-title">
              <Sparkle className="h-5 w-5 text-accent" weight="fill" aria-hidden="true" />
              {t.aiErrorHelper.dialogTitle}
            </span>
          </DialogTitle>
        </DialogHeader>

        <DialogContent data-testid="ai-analysis-dialog" className="max-h-[80vh] overflow-hidden flex flex-col">
          <p style={{ color: 'var(--mat-sys-on-surface-variant)', marginBottom: '16px' }}>
            {t.aiErrorHelper.dialogSubtitle}
          </p>

          <div className="flex-1 overflow-y-auto space-y-4" role="region" aria-label="Error analysis results">
            <Alert
              severity="error"
              variant="outlined"
              className="bg-destructive/10 border-destructive/30"
              data-testid="error-message-alert"
            >
              <span className="text-sm font-mono">{errorMessage}</span>
            </Alert>

            {isAnalyzing && <LoadingAnalysis />}

            {analysisError && (
              <Alert
                severity="error"
                data-testid="analysis-error-alert"
                role="alert"
              >
                {analysisError}
              </Alert>
            )}

            <AnimatePresence>
              {analysis && <MarkdownRenderer content={analysis} />}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
