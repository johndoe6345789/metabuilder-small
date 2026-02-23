import { test, expect } from '@playwright/test'

/**
 * Verify every page route renders text content (no blank pages, no infinite loops).
 * Each page must render non-empty text inside #root within 15 seconds.
 */

const routes = [
  '',
  '/atomic-library',
  '/code',
  '/component-trees',
  '/component-trees-json',
  '/components',
  '/conflicts',
  '/dashboard',
  '/data-binding',
  '/docker-debugger',
  '/docs',
  '/errors',
  '/favicon',
  '/features',
  '/flask',
  '/ideas',
  '/json-conversion-showcase',
  '/json-ui',
  '/json-ui-schema',
  '/lambdas',
  '/lambdas-json',
  '/models',
  '/models-json',
  '/persistence',
  '/persistence-demo',
  '/playwright',
  '/pwa',
  '/sass',
  '/schema-editor',
  '/settings',
  '/storybook',
  '/styling',
  '/templates',
  '/unit-tests',
  '/workflows',
  '/workflows-json',
]

test.describe('All pages render text', () => {
  for (const route of routes) {
    const label = route === '' ? 'home' : route.slice(1)

    test(`${label} renders content`, async ({ page }) => {
      test.setTimeout(20000)

      await page.goto(`/codegen${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 })

      // Wait for #root to have visible children
      await page.waitForSelector('#root > *', { timeout: 10000 })

      // Verify the page has non-empty text (not blank, not stuck in a loop)
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root')
          return root && root.textContent && root.textContent.trim().length > 0
        },
        { timeout: 10000 },
      )

      // Verify it's NOT the 404 page
      const text = await page.locator('#root').textContent()
      expect(text).not.toContain('Page not found')
    })
  }
})
