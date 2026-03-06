import { test, expect, Page, Locator, APIRequestContext } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ---------------------------------------------------------------------------
// Interpreter — same engine as root e2e/tests.spec.ts
// ---------------------------------------------------------------------------

interface TestStep {
  action: string
  description?: string
  skipIf?: { selector: string; state: 'hidden' | 'visible' | 'enabled' | 'disabled' }
  [key: string]: unknown
}

interface ParameterizeConfig {
  data: Record<string, string>[]
}

interface TestCase {
  name: string
  skip?: boolean
  only?: boolean
  timeout?: number
  tags?: string[]
  parameterize?: ParameterizeConfig
  beforeEach?: TestStep[]
  afterEach?: TestStep[]
  steps: TestStep[]
}

interface TestDefinition {
  tests: TestCase[]
}

// ---------------------------------------------------------------------------
// Variable interpolation — replaces ${varName} tokens with data row values
// ---------------------------------------------------------------------------

function interpolateVars(value: string, data: Record<string, string>): string {
  return value.replace(/\$\{(\w+)\}/g, (_, key) => {
    return key in data ? data[key] : `\${${key}}`
  })
}

function interpolateStep(step: TestStep, data: Record<string, string>): TestStep {
  const result: TestStep = { action: step.action }
  for (const [key, val] of Object.entries(step)) {
    if (typeof val === 'string') {
      result[key] = interpolateVars(val, data)
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      // Recursively interpolate nested objects (e.g. assertion)
      const nested: Record<string, unknown> = {}
      for (const [nk, nv] of Object.entries(val as Record<string, unknown>)) {
        nested[nk] = typeof nv === 'string' ? interpolateVars(nv, data) : nv
      }
      result[key] = nested
    } else {
      result[key] = val
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------

class PlaywrightTestInterpreter {
  private page!: Page
  private request!: APIRequestContext

  setPage(page: Page): void {
    this.page = page
    this.request = page.request
  }

  async executeSteps(steps: TestStep[], data: Record<string, string> = {}): Promise<void> {
    for (const rawStep of steps) {
      const step = Object.keys(data).length > 0 ? interpolateStep(rawStep, data) : rawStep
      try {
        if (await this.shouldSkip(step)) {
          console.log(`Skipped step "${step.action}" due to skipIf condition`)
          continue
        }
        await this.executeStep(step)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`Failed step "${step.action}": ${msg}`)
        throw error
      }
    }
  }

  // ---------------------------------------------------------------------------
  // skipIf — check whether a step should be skipped
  // ---------------------------------------------------------------------------

  private async shouldSkip(step: TestStep): Promise<boolean> {
    if (!step.skipIf) return false
    const condition = step.skipIf as { selector: string; state: string }
    const locator = this.page.locator(condition.selector)
    try {
      switch (condition.state) {
        case 'hidden':
          await locator.waitFor({ state: 'hidden', timeout: 2000 })
          return true
        case 'visible':
          await locator.waitFor({ state: 'visible', timeout: 2000 })
          return true
        case 'enabled':
          return await locator.isEnabled()
        case 'disabled':
          return await locator.isDisabled()
        default:
          return false
      }
    } catch {
      // Condition not met — do not skip
      return false
    }
  }

  async executeStep(step: TestStep): Promise<void> {
    switch (step.action) {
      case 'navigate':
        await this.page.goto(step.url as string, { waitUntil: (step.waitUntil as any) || 'domcontentloaded' })
        break
      case 'waitForLoadState':
        await this.page.waitForLoadState((step.state as any) || 'domcontentloaded')
        break
      case 'click':
        await this.getLocator(step).click()
        break
      case 'dblclick':
        await this.getLocator(step).dblclick()
        break
      case 'fill':
        await this.getLocator(step).fill(step.value as string)
        break
      case 'type':
        await this.getLocator(step).type(step.text as string, { delay: (step.delay as number) || 50 })
        break
      case 'select':
        await this.page.locator(step.selector as string).selectOption(step.value as string)
        break
      case 'check':
        await this.getLocator(step).check()
        break
      case 'uncheck':
        await this.getLocator(step).uncheck()
        break
      case 'hover':
        await this.getLocator(step).hover()
        break
      case 'focus':
        await this.getLocator(step).focus()
        break
      case 'blur':
        await this.getLocator(step).blur()
        break
      case 'press':
        await this.getLocator(step).press(step.key as string)
        break
      case 'keyboard':
        for (const key of [step.keys].flat()) {
          await this.page.keyboard.press(key as string)
        }
        break
      case 'scroll':
        if (step.selector) {
          await this.page.locator(step.selector as string).scrollIntoViewIfNeeded()
        } else {
          await this.page.evaluate(({ x, y }) => window.scrollTo(x, y), { x: (step.x as number) ?? 0, y: (step.y as number) ?? 0 })
        }
        break
      case 'wait':
        await this.page.waitForTimeout(step.timeout as number)
        break
      case 'waitForSelector':
        await this.page.waitForSelector(step.selector as string, {
          timeout: (step.timeout as number) || 5000,
          ...(step.state ? { state: step.state as 'attached' | 'detached' | 'visible' | 'hidden' } : {}),
        })
        break
      case 'waitForHidden':
        await this.page.waitForSelector(step.selector as string, { state: 'hidden', timeout: (step.timeout as number) || 5000 })
        break
      case 'pageType':
        await this.page.keyboard.type(step.text as string)
        break
      case 'waitForURL':
        await this.page.waitForURL(step.urlPattern as string, { timeout: (step.timeout as number) || 5000 })
        break
      case 'waitForNavigation':
        await this.page.waitForNavigation()
        break
      case 'screenshot':
        await this.page.screenshot({ path: step.filename as string, fullPage: !!(step.fullPage) })
        break
      case 'evaluate':
        await this.page.evaluate(step.script as string)
        break
      case 'expect':
        await this.handleExpect(step)
        break
      case 'reload':
        await this.page.reload()
        break
      case 'goBack':
        await this.page.goBack()
        break
      case 'goForward':
        await this.page.goForward()
        break
      case 'apiRequest':
        await this.handleApiRequest(step)
        break
      default:
        console.warn(`Unknown action: ${step.action}`)
    }
  }

  // ---------------------------------------------------------------------------
  // apiRequest action
  // ---------------------------------------------------------------------------

  private async handleApiRequest(step: TestStep): Promise<void> {
    const method = ((step.method as string) || 'GET').toUpperCase()
    const url = step.url as string
    const assertion = step.assertion as { status?: number; bodyContains?: string } | undefined

    let response: Awaited<ReturnType<APIRequestContext['fetch']>>

    switch (method) {
      case 'GET':
        response = await this.request.get(url)
        break
      case 'POST':
        response = await this.request.post(url, { data: step.body })
        break
      case 'PUT':
        response = await this.request.put(url, { data: step.body })
        break
      case 'PATCH':
        response = await this.request.patch(url, { data: step.body })
        break
      case 'DELETE':
        response = await this.request.delete(url)
        break
      default:
        response = await this.request.fetch(url, { method })
    }

    if (assertion?.status !== undefined) {
      expect(response.status()).toBe(assertion.status)
    }
    if (assertion?.bodyContains !== undefined) {
      const body = await response.text()
      expect(body).toContain(assertion.bodyContains)
    }
  }

  private getLocator(step: TestStep): Locator {
    const nth = typeof step.nth === 'number' ? (step.nth as number) : undefined
    const applyNth = (loc: Locator) => nth !== undefined ? loc.nth(nth) : loc

    if (step.testId) return applyNth(this.page.getByTestId(step.testId as string))
    if (step.role) {
      const loc = step.text
        ? this.page.getByRole(step.role as any, { name: step.text as string })
        : this.page.getByRole(step.role as any)
      return applyNth(loc)
    }
    if (step.label)       return applyNth(this.page.getByLabel(step.label as string))
    if (step.placeholder) return applyNth(this.page.getByPlaceholder(step.placeholder as string))
    if (step.alt)         return applyNth(this.page.getByAltText(step.alt as string))
    if (step.title)       return applyNth(this.page.getByTitle(step.title as string))
    if (step.text)        return applyNth(this.page.getByText(step.text as string))
    if (step.selector)    return applyNth(this.page.locator(step.selector as string))
    throw new Error(`No locator strategy provided in step: ${JSON.stringify(step)}`)
  }

  private async handleExpect(step: TestStep): Promise<void> {
    const assertion = step.assertion as any
    if (!assertion?.matcher) throw new Error('No matcher in assertion')

    if (assertion.matcher === 'toHaveURL') {
      const not = assertion.not ? expect(this.page).not : expect(this.page)
      await (not as any).toHaveURL(assertion.url ?? assertion.expected)
      return
    }
    if (assertion.matcher === 'toHaveTitle') {
      const not = assertion.not ? expect(this.page).not : expect(this.page)
      await (not as any).toHaveTitle(assertion.title ?? assertion.expected)
      return
    }

    const locator = this.getLocator(step)
    const base = assertion.not ? expect(locator).not : expect(locator)

    switch (assertion.matcher) {
      case 'toBeVisible':    await (base as any).toBeVisible();   break
      case 'toBeHidden':     await (base as any).toBeHidden();    break
      case 'toBeEnabled':    await (base as any).toBeEnabled();   break
      case 'toBeDisabled':   await (base as any).toBeDisabled();  break
      case 'toBeChecked':    await (base as any).toBeChecked();   break
      case 'toBeEditable':   await (base as any).toBeEditable();  break
      case 'toBeEmpty':      await (base as any).toBeEmpty();     break
      case 'toContainText':  await (base as any).toContainText(assertion.expected ?? assertion.text);  break
      case 'toHaveText':     await (base as any).toHaveText(assertion.expected ?? assertion.text);     break
      case 'toHaveValue':    await (base as any).toHaveValue(assertion.value ?? assertion.expected);   break
      case 'toHaveCount':    await (base as any).toHaveCount(assertion.count);                         break
      case 'toHaveAttribute':await (base as any).toHaveAttribute(assertion.name, assertion.value);     break
      case 'toHaveClass':    await (base as any).toHaveClass(assertion.className);                     break
      case 'toHaveCSS':      await (base as any).toHaveCSS(assertion.property, assertion.value);       break
      case 'toHaveScreenshot':await (base as any).toHaveScreenshot(assertion.name);                   break
      case 'toBeInViewport': {
        const box = await locator.boundingBox()
        expect(box).not.toBeNull()
        break
      }
      case 'custom': {
        const result = await this.page.evaluate(assertion.script as string)
        expect(result).toBeTruthy()
        break
      }
      default:
        throw new Error(`Unknown matcher: ${assertion.matcher}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Test registration — reads tests.json from same directory
// ---------------------------------------------------------------------------

const testJsonPath = join(__dirname, 'tests.json')

if (!existsSync(testJsonPath)) {
  throw new Error(`tests.json not found at ${testJsonPath}`)
}

const testDef = JSON.parse(readFileSync(testJsonPath, 'utf-8')) as TestDefinition

test.describe(`pastebin`, () => {
  if (!Array.isArray(testDef.tests)) {
    throw new Error('tests.json must have a "tests" array')
  }

  for (const testCase of testDef.tests) {
    // ------------------------------------------------------------------
    // Describe group: testCase has beforeEach / afterEach hooks
    // ------------------------------------------------------------------
    if (testCase.beforeEach || testCase.afterEach) {
      test.describe(testCase.name, () => {
        const interpreter = new PlaywrightTestInterpreter()

        test.beforeEach(async ({ page }) => {
          interpreter.setPage(page)
          if (testCase.beforeEach) {
            await interpreter.executeSteps(testCase.beforeEach)
          }
        })

        test.afterEach(async ({ page }) => {
          interpreter.setPage(page)
          if (testCase.afterEach) {
            await interpreter.executeSteps(testCase.afterEach)
          }
        })

        if (testCase.parameterize?.data) {
          // Parameterized + hooks
          for (const dataRow of testCase.parameterize.data) {
            const label = dataRow.label ?? JSON.stringify(dataRow)
            const rowName = `${testCase.name} [${label}]`
            const testFn = testCase.skip ? test.skip : testCase.only ? test.only : test

            testFn(rowName, async ({ page }) => {
              if (testCase.timeout) test.setTimeout(testCase.timeout)
              interpreter.setPage(page)
              await interpreter.executeSteps(testCase.steps, dataRow)
            })
          }
        } else {
          const testFn = testCase.skip ? test.skip : testCase.only ? test.only : test
          testFn(testCase.name, async ({ page }) => {
            if (testCase.timeout) test.setTimeout(testCase.timeout)
            interpreter.setPage(page)
            await interpreter.executeSteps(testCase.steps)
          })
        }
      })
      continue
    }

    // ------------------------------------------------------------------
    // Parameterized test (no hooks)
    // ------------------------------------------------------------------
    if (testCase.parameterize?.data) {
      for (const dataRow of testCase.parameterize.data) {
        const label = dataRow.label ?? JSON.stringify(dataRow)
        const rowName = `${testCase.name} [${label}]`
        const testFn = testCase.skip ? test.skip : testCase.only ? test.only : test

        testFn(rowName, async ({ page }) => {
          if (testCase.timeout) test.setTimeout(testCase.timeout)
          const interpreter = new PlaywrightTestInterpreter()
          interpreter.setPage(page)
          await interpreter.executeSteps(testCase.steps, dataRow)
        })
      }
      continue
    }

    // ------------------------------------------------------------------
    // Plain test (original behaviour)
    // ------------------------------------------------------------------
    const testFn = testCase.skip ? test.skip : testCase.only ? test.only : test

    testFn(testCase.name, async ({ page }) => {
      if (testCase.timeout) test.setTimeout(testCase.timeout)
      const interpreter = new PlaywrightTestInterpreter()
      interpreter.setPage(page)
      await interpreter.executeSteps(testCase.steps)
    })
  }
})
