import { expect, test } from '@playwright/test';

const instructor = {
  id: 'layout-instructor',
  role: 'Instructor',
  name: 'مدرس نمونه',
  username: 'instructor',
  onboardingCompleted: true,
};

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:4109/**', async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];

    switch (url.pathname) {
      case '/auth/refresh':
        body = { accessToken: 'learning-layout-token' };
        break;
      case '/auth/me':
        body = instructor;
        break;
      case '/groups':
      case '/banks':
        body = { items: [], total: 0, page: 1, pageSize: 25 };
        break;
      case '/students':
        body = [];
        break;
      case '/exams':
        body = [];
        break;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
});

test('question banks, groups, and exams share the same page header and content surface', async ({ page }) => {
  const pages = [
    { path: '/question-banks', title: 'بانک سؤال' },
    { path: '/groups', title: 'گروه‌ها' },
    { path: '/exams', title: 'آزمون‌ها' },
  ];

  for (const item of pages) {
    await page.goto(item.path);
    await expect(page.locator('.learning-page-header')).toBeVisible();
    await expect(page.locator('.learning-page-header h1', { hasText: item.title })).toBeVisible();
    await expect(page.locator('.learning-page-panel')).toBeVisible();
  }
});

test('the groups and exams primary actions stay in the shared page header', async ({ page }) => {
  await page.goto('/groups');
  await expect(page.locator('.learning-page-header').getByRole('button', { name: /گروه جدید/ })).toBeVisible();
  await page.goto('/exams');
  await expect(page.locator('.learning-page-header').getByRole('button', { name: /آزمون جدید/ })).toBeVisible();
});
