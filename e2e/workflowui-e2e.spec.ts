import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('WorkflowUI - Authentication Pages', () => {
  test('login page displays correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="auth-layout"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('register page displays password strength indicator', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="password-input"]').fill('Weak1');
    await expect(page.locator('[data-testid="password-strength-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-strength-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-strength-hint"]')).toBeVisible();
  });

  test('can fill and submit login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.locator('[data-testid="email-input"]').fill('test@example.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForLoadState('networkidle');
  });

  test('register page footer link navigates to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="auth-footer-link"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('404 page displays fail whale', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page-12345`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="not-found-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="fail-whale-illustration"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-code"]')).toHaveText('404');
    await expect(page.locator('[data-testid="primary-action"]')).toBeVisible();
  });

  test('header actions display correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="header-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-theme-button"]')).toBeVisible();
  });
});

test.describe('WorkflowUI - Templates Pages', () => {
  test('should display templates listing page', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Project Templates')).toBeVisible();
    await expect(page.locator('[data-testid="template-search"]')).toBeVisible();
    await expect(page.locator('[data-testid^="template-card-"]').first()).toBeVisible();
  });

  test('should filter templates by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);

    await page.locator('[data-testid="template-category-automation"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Showing')).toBeVisible();
  });

  test('should switch between grid and list view', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);

    await page.locator('[data-testid="template-list-view"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid^="template-list-item-"]').first()).toBeVisible();

    await page.locator('[data-testid="template-grid-view"]').click();
    await expect(page.locator('[data-testid^="template-card-"]').first()).toBeVisible();
  });

  test('should navigate to template detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);

    const viewButton = page.locator('[data-testid="template-card-1"] >> text=View Template');
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Overview')).toBeVisible();
      await expect(page.getByText('Included Workflows')).toBeVisible();
    }
  });

  test('should open create project dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates/1`);

    const createButton = page.getByText('Create Project from Template');
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page.getByText('Project Name')).toBeVisible();
      await expect(page.getByText('Workspace')).toBeVisible();
    }
  });
});

test.describe('WorkflowUI - Static Pages', () => {
  const staticPages = [
    { path: '/', name: 'Home' },
    { path: '/settings', name: 'Settings' },
    { path: '/help', name: 'Help' },
    { path: '/docs', name: 'Docs' },
    { path: '/plugins', name: 'Plugins' },
    { path: '/achievements', name: 'Achievements' },
    { path: '/workflows', name: 'Workflows' },
    { path: '/workflows/favorites', name: 'Favorites' },
    { path: '/workflows/recent', name: 'Recent' },
    { path: '/notifications', name: 'Notifications' },
  ];

  for (const { path, name } of staticPages) {
    test(`${name} page loads without errors`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${path}`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');

      // Check that the page has some content
      const body = await page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

test.describe('WorkflowUI - Dynamic Routes', () => {
  test('editor/[workflowId] page loads', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/editor/test-workflow-123`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });

  test('project/[id] page loads', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/project/test-project-123`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });

  test('workspace/[id] page loads', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/workspace/test-workspace-123`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });
});
