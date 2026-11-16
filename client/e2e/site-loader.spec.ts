import { expect, test } from '@playwright/test';

test('protected page uses the lilac loader in both themes and respects reduced motion', async ({ page }) => {
  let finishRefresh!: () => void;
  const refresh = new Promise<void>(resolve => { finishRefresh = resolve; });
  await page.route('http://127.0.0.1:4109/auth/refresh', async route => {
    await refresh;
    await route.fulfill({ status: 401, json: {} }).catch(() => {});
  });
  await page.setViewportSize({ width: 390, height: 844 });

  try {
    await page.goto('/dashboard');
    const loader = page.getByRole('status', { name: 'در حال بارگذاری…' });
    const outer = loader.locator('.site-loading-spinner-ring');
    const inner = loader.locator('.site-loading-spinner-ring-inner');
    await expect(loader.getByText('در حال بارگذاری…')).toBeVisible();
    await expect(inner).toBeVisible();
    await expect(outer).toHaveCSS('border-top-color', 'rgb(117, 80, 207)');
    await expect(outer).toHaveCSS('animation-direction', 'normal');
    await expect(inner).toHaveCSS('animation-direction', 'reverse');

    await page.locator('html').evaluate(element => element.classList.add('dark'));
    await expect(outer).toHaveCSS('border-top-color', 'rgb(187, 155, 247)');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(outer).toHaveCSS('animation-name', 'none');
    await expect(inner).toHaveCSS('animation-name', 'none');
    await expect(loader).toBeVisible();
  } finally {
    finishRefresh();
  }
  await expect(page).toHaveURL(/\/login/);
});
