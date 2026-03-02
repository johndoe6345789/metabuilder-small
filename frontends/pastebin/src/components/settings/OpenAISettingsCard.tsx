'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, Input, Button, FormLabel } from '@metabuilder/components/fakemui';
import { Eye, EyeClosed, Key } from '@phosphor-icons/react';
import { useTranslation } from '@/hooks/useTranslation';
import { AI_PLATFORMS, DEFAULT_PLATFORM_ID, getPlatform } from '@/config/aiPlatforms';
import styles from './settings-card.module.scss';

export function OpenAISettingsCard() {
  const t = useTranslation();
  const s = t.settingsCards.openAI;

  const [platformId, setPlatformId] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ai_platform') || DEFAULT_PLATFORM_ID : DEFAULT_PLATFORM_ID
  );
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`ai_key_${platformId}`) || '' : ''
  );
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const platform = getPlatform(platformId);

  const handlePlatformChange = (newId: string) => {
    setPlatformId(newId);
    // Load stored key for the newly selected platform
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem(`ai_key_${newId}`) || '' : '';
    setApiKey(storedKey);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('ai_platform', platformId);
    if (apiKey.trim()) {
      localStorage.setItem(`ai_key_${platformId}`, apiKey.trim());
    } else {
      localStorage.removeItem(`ai_key_${platformId}`);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem(`ai_key_${platformId}`);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isConfigured = !platform.keyRequired || !!apiKey;

  return (
    <Card data-testid="openai-settings-card" role="region" aria-label="AI platform configuration">
      <CardHeader>
        <div className={styles.headerIconRow}>
          <Key className={styles.iconPrimary} size={20} weight="duotone" aria-hidden="true" />
          <h3 className={styles.cardTitle}>{s.title}</h3>
        </div>
        <p className={styles.cardDescription}>{s.description}</p>
      </CardHeader>
      <CardContent>
        <div className={styles.contentStackSm}>

          {/* Platform selector */}
          <div className={styles.keyFieldWrapper}>
            <FormLabel htmlFor="ai-platform">{s.platformLabel}</FormLabel>
            <select
              id="ai-platform"
              value={platformId}
              onChange={e => handlePlatformChange(e.target.value)}
              className={styles.platformSelect}
              data-testid="ai-platform-select"
              aria-label="Select AI platform"
            >
              {AI_PLATFORMS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* API key (hidden for platforms that don't need one) */}
          {platform.keyRequired && (
            <div className={styles.keyFieldWrapper}>
              <FormLabel htmlFor="ai-key">{s.keyLabel}</FormLabel>
              <div className={styles.keyInputRow}>
                <div className={styles.keyInputRelative}>
                  <Input
                    id="ai-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={platform.keyPlaceholder}
                    data-testid="openai-api-key-input"
                    aria-label={`${platform.name} API key`}
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
                <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer" className={styles.keyHintLink}>
                  {platform.docsLabel}
                </a>
              </p>
            </div>
          )}

          <div className={styles.actionBtnRow}>
            <Button
              onClick={handleSave}
              data-testid="save-api-key-btn"
              aria-label="Save AI settings"
            >
              {saved ? s.saved : s.saveButton}
            </Button>
            {apiKey && (
              <Button
                onClick={handleClear}
                variant="outlined"
                data-testid="clear-api-key-btn"
                aria-label="Clear API key"
              >
                {s.clearButton}
              </Button>
            )}
          </div>

          {isConfigured && (
            <div className={styles.keyConfiguredStatus} data-testid="api-key-configured-status" role="status">
              {s.configuredStatus.replace('{platform}', platform.name).replace('{model}', platform.defaultModel)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
