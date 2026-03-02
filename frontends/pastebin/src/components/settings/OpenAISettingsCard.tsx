'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, Input, Button, FormLabel } from '@metabuilder/components/fakemui';
import { Eye, EyeClosed, Key } from '@phosphor-icons/react';
import { useTranslation } from '@/hooks/useTranslation';
import styles from './settings-card.module.scss';

export function OpenAISettingsCard() {
  const t = useTranslation();
  const s = t.settingsCards.openAI;
  const [apiKey, setApiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('openai_api_key') || '' : ''));
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      localStorage.removeItem('openai_api_key');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem('openai_api_key');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card data-testid="openai-settings-card" role="region" aria-label="OpenAI API configuration">
      <CardHeader>
        <div className={styles.headerIconRow}>
          <Key className={styles.iconPrimary} size={20} weight="duotone" aria-hidden="true" />
          <h3 className={styles.cardTitle}>{s.title}</h3>
        </div>
        <p className={styles.cardDescription}>
          {s.description}
        </p>
      </CardHeader>
      <CardContent>
        <div className={styles.contentStackSm}>
          <div className={styles.keyFieldWrapper}>
            <FormLabel htmlFor="openai-key">{s.keyLabel}</FormLabel>
            <div className={styles.keyInputRow}>
              <div className={styles.keyInputRelative}>
                <Input
                  id="openai-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={s.keyPlaceholder}
                  data-testid="openai-api-key-input"
                  aria-label="OpenAI API key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={styles.keyToggleBtn}
                  data-testid="toggle-api-key-visibility"
                  aria-label={showKey ? s.hideKey : s.showKey}
                  aria-pressed={showKey}
                >
                  {showKey ? <EyeClosed size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <p className={styles.keyHint}>
              {s.keyHint}{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.keyHintLink}
              >
                OpenAI Platform
              </a>
            </p>
          </div>

          <div className={styles.actionBtnRow}>
            <Button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              data-testid="save-api-key-btn"
              aria-label="Save OpenAI API key"
            >
              {saved ? s.saved : s.saveButton}
            </Button>
            {apiKey && (
              <Button
                onClick={handleClear}
                variant="outlined"
                data-testid="clear-api-key-btn"
                aria-label="Clear OpenAI API key"
              >
                {s.clearButton}
              </Button>
            )}
          </div>

          {apiKey && (
            <div className={styles.keyConfiguredStatus} data-testid="api-key-configured-status" role="status">
              {s.configuredStatus}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
