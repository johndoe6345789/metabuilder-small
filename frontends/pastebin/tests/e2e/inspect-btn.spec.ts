import { test, expect } from '@playwright/test'

test('button hover opacity is correct (not 1)', async ({ page }) => {
  await page.goto('http://localhost/pastebin')
  await page.waitForLoadState('networkidle')

  const btn = page.getByTestId('empty-state-create-menu')
  const box = await btn.boundingBox()

  // Screenshot before hover
  await page.screenshot({
    path: '/tmp/btn-before.png',
    clip: { x: box!.x - 10, y: box!.y - 10, width: box!.width + 20, height: box!.height + 20 }
  })

  await btn.hover()
  await page.waitForTimeout(400)

  const opacity = await btn.evaluate((el) => {
    const ripple = el.children[2]
    return ripple ? getComputedStyle(ripple, '::before').opacity : 'no ripple'
  })
  console.log('Hover ::before opacity:', opacity)

  await page.screenshot({
    path: '/tmp/btn-after.png',
    clip: { x: box!.x - 10, y: box!.y - 10, width: box!.width + 20, height: box!.height + 20 }
  })

  expect(parseFloat(String(opacity))).toBeLessThan(0.5)
})
