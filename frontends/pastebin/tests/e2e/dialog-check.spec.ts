import { test } from '@playwright/test'

test('create snippet dialog visual check', async ({ page }) => {
  await page.goto('http://localhost/pastebin')
  await page.waitForLoadState('networkidle')

  // Open the dialog via empty state button
  const createBtn = page.getByTestId('empty-state-create-menu')
  await createBtn.click()
  await page.waitForTimeout(200)

  // Click blank snippet
  const blankItem = page.getByTestId('create-blank-snippet-item')
  await blankItem.click()
  await page.waitForTimeout(500)

  await page.screenshot({ path: '/tmp/dialog-open.png', fullPage: false })

  const dialog = page.getByTestId('snippet-dialog')
  const box = await dialog.boundingBox()
  if (box) {
    await page.screenshot({
      path: '/tmp/dialog-zoom.png',
      clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 60), width: box.width + 40, height: box.height + 80 }
    })
  }
})
