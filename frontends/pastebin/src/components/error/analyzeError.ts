import { getPlatform } from '@/config/aiPlatforms';

export async function analyzeErrorWithAI(
  errorMessage: string,
  errorStack?: string,
  context?: string
): Promise<string> {
  const platformId = (typeof window !== 'undefined' && localStorage.getItem('ai_platform')) || 'openai';
  const platform = getPlatform(platformId);

  // Backward compat: fall back to legacy openai_api_key for OpenAI platform
  const apiKey = (typeof window !== 'undefined' &&
    (localStorage.getItem(`ai_key_${platformId}`) || (platformId === 'openai' ? localStorage.getItem('openai_api_key') : null))
  ) || '';

  if (platform.keyRequired && !apiKey) {
    return buildFallback(errorMessage, context, 'Configure your AI platform API key in Settings to enable AI-powered error analysis.');
  }

  try {
    const prompt = buildPrompt(errorMessage, context, errorStack);
    let responseText: string;

    if (platform.apiFormat === 'anthropic') {
      responseText = await callAnthropic(platform.endpoint, platform.defaultModel, apiKey, prompt);
    } else {
      responseText = await callOpenAICompat(platform.endpoint, platform.defaultModel, apiKey, prompt);
    }

    return responseText;
  } catch (err) {
    console.error('Error calling AI API:', err);
    return buildFallback(errorMessage, context, `Failed to get AI analysis. ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

function buildPrompt(errorMessage: string, context?: string, errorStack?: string): string {
  const contextInfo = context ? `\n\nContext: ${context}` : '';
  const stackInfo = errorStack ? `\n\nStack trace: ${errorStack}` : '';
  return `You are a helpful debugging assistant for a code snippet manager app. Analyze this error and provide:

1. A clear explanation of what went wrong (in plain language)
2. Why this error likely occurred
3. 2-3 specific actionable steps to fix it

Error message: ${errorMessage}${contextInfo}${stackInfo}

Keep your response concise, friendly, and focused on practical solutions. Format your response with clear sections using markdown.`;
}

async function callOpenAICompat(endpoint: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful debugging assistant for a code snippet manager app.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error('Failed to analyze error with AI. Please check your API key.');
  const data = await response.json();
  return data.choices[0]?.message?.content || 'Unable to analyze error.';
}

async function callAnthropic(endpoint: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: 'You are a helpful debugging assistant for a code snippet manager app.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error('Failed to analyze error with AI. Please check your API key.');
  const data = await response.json();
  return data.content[0]?.text || 'Unable to analyze error.';
}

function buildFallback(errorMessage: string, context?: string, note?: string): string {
  const lines = ['## Error Analysis\n', '**Error Message:**', `\`${errorMessage}\`\n`];
  if (context) { lines.push('**Context:**'); lines.push(`${context}\n`); }
  if (note) lines.push(`**Note:** ${note}\n`);
  lines.push('**Basic Troubleshooting:**');
  lines.push('1. Check the browser console for more details');
  lines.push('2. Try refreshing the page');
  lines.push('3. Clear your browser cache and local storage');
  return lines.join('\n');
}
