import { useState } from "react";
import { Alert, AlertTitle, Button } from "@metabuilder/components/fakemui";
import { AIErrorHelper } from "@/components/error/AIErrorHelper";
import { Warning, ArrowClockwise, CaretDown, CaretUp, Copy, Check } from "@phosphor-icons/react";
import { useTranslation } from "@/hooks/useTranslation";
import styles from "./ErrorFallback.module.scss";

interface ErrorFallbackProps {
  error: unknown;
  resetErrorBoundary?: (...args: unknown[]) => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const t = useTranslation();
  const err = error instanceof Error ? error : new Error(String(error));

  const [isStackOpen, setIsStackOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorDetails = `Error: ${err.message}\n\nStack Trace:\n${err.stack || 'No stack trace available'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(errorDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.root} data-testid="error-fallback">
      <div className={styles.inner}>
        <Alert severity="error" style={{ marginBottom: '1.5rem' }} data-testid="error-alert" role="alert">
          <Warning aria-hidden="true" />
          <AlertTitle>{t.errorFallback.title}</AlertTitle>
          <div className={styles.alertBody}>
            <div className={styles.messageRow}>
              <code
                className={styles.errorCode}
                data-testid="error-message"
              >
                {err.message}
              </code>
              <Button
                size="sm"
                variant="outlined"
                onClick={handleCopy}
                data-testid="copy-error-btn"
                aria-label="Copy error details"
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <Check style={{ width: '0.875rem', height: '0.875rem' }} />
                    {t.errorFallback.copied}
                  </>
                ) : (
                  <>
                    <Copy style={{ width: '0.875rem', height: '0.875rem' }} />
                    {t.errorFallback.copy}
                  </>
                )}
              </Button>
            </div>

            <div data-testid="stack-trace-collapsible">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsStackOpen(!isStackOpen)}
                style={{ width: '100%', justifyContent: 'space-between' }}
                aria-expanded={isStackOpen}
                data-testid="stack-trace-trigger"
              >
                {isStackOpen ? (
                  <>
                    {t.errorFallback.hideStack} <CaretUp style={{ width: '1rem', height: '1rem', marginLeft: '0.5rem' }} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    {t.errorFallback.showStack} <CaretDown style={{ width: '1rem', height: '1rem', marginLeft: '0.5rem' }} aria-hidden="true" />
                  </>
                )}
              </Button>
              {isStackOpen && (
                <div className={styles.stackContent} data-testid="stack-trace-content">
                  <pre className={styles.stackPre} data-testid="error-stack-trace">
                    {err.stack || t.errorFallback.noStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </Alert>

        <AIErrorHelper error={err} />

        <Button
          onClick={() => (resetErrorBoundary ? resetErrorBoundary() : window.location.reload())}
          className={styles.reloadBtn}
          variant="outlined"
          data-testid="reload-btn"
          aria-label="Try reloading the page"
        >
          <ArrowClockwise style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} aria-hidden="true" />
          {t.errorFallback.reload}
        </Button>
      </div>
    </div>
  );
}
