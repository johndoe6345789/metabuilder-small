import { test, expect } from '@playwright/test'

const BASE = 'http://localhost/pastebin'

test.describe('Menu multi-column and button hover', () => {
  test('logo shows version badge', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    const version = page.getByText(/^v\d+\.\d+\.\d+$/)
    await expect(version).toBeVisible()
    const text = await version.textContent()
    console.log('Version badge:', text)
  })

  test('create menu opens and has multi-column layout', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    const createBtn = page.getByTestId('empty-state-create-menu')
    await expect(createBtn).toBeVisible()
    await createBtn.click()

    const menu = page.getByTestId('empty-state-menu-content')
    await expect(menu).toBeVisible()

    await page.screenshot({ path: '/tmp/menu-open.png', fullPage: false })

    const contentWrapper = menu.locator('> div').first()
    const flexDir = await contentWrapper.evaluate((el) =>
      window.getComputedStyle(el).flexDirection
    )
    const flexWrap = await contentWrapper.evaluate((el) =>
      window.getComputedStyle(el).flexWrap
    )
    const maxHeight = await contentWrapper.evaluate((el) =>
      window.getComputedStyle(el).maxHeight
    )
    const panelWidth = await menu.evaluate((el) => (el as HTMLElement).offsetWidth)
    const itemCount = await menu.locator('button[role="menuitem"]').count()

    console.log('flex-direction:', flexDir)
    console.log('flex-wrap:', flexWrap)
    console.log('max-height:', maxHeight)
    console.log('Panel width:', panelWidth, 'Item count:', itemCount)

    expect(flexDir).toBe('column')
    expect(flexWrap).toBe('wrap')
    // Panel wider than a single column = multi-column is working
    expect(panelWidth).toBeGreaterThan(200)
  })

  test('button hover state layer colour is semi-transparent', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    const btn = page.getByTestId('empty-state-create-menu')
    await expect(btn).toBeVisible()

    // Measure state layer before hover (children[2] is the persistent ripple span)
    const beforeBg = await btn.evaluate((el) => {
      const ripple = el.children[2]
      if (!ripple) return 'no ripple'
      const before = window.getComputedStyle(ripple, '::before')
      return { opacity: before.opacity, bg: before.backgroundColor }
    })
    console.log('State layer before hover:', beforeBg)

    // Measure button overflow
    const overflow = await btn.evaluate((el) => window.getComputedStyle(el).overflow)
    console.log('Button overflow:', overflow)

    // Hover and screenshot
    await btn.hover()
    await page.waitForTimeout(400)

    const afterBg = await btn.evaluate((el) => {
      const ripple = el.children[2]
      if (!ripple) return 'no ripple'
      const before = window.getComputedStyle(ripple, '::before')
      return { opacity: before.opacity, bg: before.backgroundColor }
    })
    console.log('State layer after hover:', afterBg)

    await page.screenshot({ path: '/tmp/button-hover.png' })

    expect(overflow).toBe('hidden')
    // State layer opacity on hover should be <0.5 (semi-transparent, not solid)
    const opacity = parseFloat(typeof afterBg === 'object' ? afterBg.opacity : '1')
    console.log('Hover opacity:', opacity)
    expect(opacity).toBeLessThan(0.5)
  })
})
