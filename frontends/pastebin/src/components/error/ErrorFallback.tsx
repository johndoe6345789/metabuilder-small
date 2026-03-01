import { useState } from "react";
import { Alert, AlertTitle, Button } from "@metabuilder/components/fakemui";
import { AIErrorHelper } from "@/components/error/AIErrorHelper";
import { Warning, ArrowClockwise, CaretDown, CaretUp, Copy, Check } from "@phosphor-icons/react";
import { useTranslation } from "@/hooks/useTranslation";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="error-fallback">
      <div className="w-full max-w-3xl">
        <Alert severity="error" className="mb-6" data-testid="error-alert" role="alert">
          <Warning aria-hidden="true" />
          <AlertTitle>{t.errorFallback.title}</AlertTitle>
          <div className="mt-3 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <code
                className="text-sm bg-destructive/20 px-2 py-1 rounded flex-1 break-all"
                data-testid="error-message"
              >
                {err.message}
              </code>
              <Button
                size="sm"
                variant="outlined"
                onClick={handleCopy}
                className="shrink-0"
                data-testid="copy-error-btn"
                aria-label="Copy error details"
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t.errorFallback.copied}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
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
                className="w-full justify-between"
                aria-expanded={isStackOpen}
                data-testid="stack-trace-trigger"
              >
                {isStackOpen ? (
                  <>
                    {t.errorFallback.hideStack} <CaretUp className="h-4 w-4 ml-2" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    {t.errorFallback.showStack} <CaretDown className="h-4 w-4 ml-2" aria-hidden="true" />
                  </>
                )}
              </Button>
              {isStackOpen && (
                <div className="mt-4" data-testid="stack-trace-content">
                  <pre className="text-xs bg-destructive/10 p-3 rounded overflow-auto max-h-60" data-testid="error-stack-trace">
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
          className="w-full mt-6"
          variant="outlined"
          data-testid="reload-btn"
          aria-label="Try reloading the page"
        >
          <ArrowClockwise className="h-4 w-4 mr-2" aria-hidden="true" />
          {t.errorFallback.reload}
        </Button>
      </div>
    </div>
  );
}
