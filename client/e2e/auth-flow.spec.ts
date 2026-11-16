import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const kind of ['phone', 'email'] as const) test(`signup ${kind}: validation, OTP paste and session entry`, async ({ page }) => {
  const identifier = kind === 'phone' ? '09123456789' : 'student@example.test';
  let verified = false;
  let registrations = 0;
  let attempts = 0;
  const user = { id: 'student', role: 'Student', username: 'student', name: null, onboardingCompleted: true };
  await page.route('http://127.0.0.1:4109/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let body: unknown = [];
    if (path === '/auth/refresh') { status = verified ? 200 : 401; body = verified ? { accessToken: 'test-token' } : { error: 'نشست موجود نیست' }; }
    if (path === '/auth/me') body = user;
    if (path === '/auth/entry') body = { identifier, next: 'signup' };
    if (path === '/auth/register') {
      registrations++;
      const data = route.request().postDataJSON();
      expect(data.identifier).toBe(identifier);
      expect(data.role).toBe('Student');
      expect(data.name).toBeUndefined();
      if (kind === 'phone') expect(data.password).toBeUndefined();
      else expect(data.password).toBe('StrongPass123!');
      body = { identifier };
    }
    if (path === '/auth/otp/verify') {
      attempts++;
      const data = route.request().postDataJSON();
      expect(data.purpose).toBe('REGISTER');
      if (data.code !== '123456') { status = 400; body = { error: 'کد تأیید نادرست است' }; }
      else { verified = true; body = { user, accessToken: 'test-token' }; }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(page.locator('#login-identifier')).toBeFocused();
  await page.getByRole('textbox', { name: 'شماره تماس یا پست الکترونیکی' }).fill(identifier);
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await page.getByRole('button', { name: /من دانشجو هستم/ }).click();
  await expect(page.getByRole('button', { name: /من دانشجو هستم/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  if (kind === 'email') {
    await page.locator('#signup-password').fill('StrongPass123!');
    await page.getByRole('button', { name: 'دریافت کد تأیید ایمیل' }).click();
  }
  const first = page.getByRole('textbox', { name: 'رقم 1 کد تأیید', exact: true });
  await expect(first).toBeVisible();
  // Dispatch the browser paste event to exercise the component's actual paste handler.
  async function paste(code: string) {
    await first.evaluate((input, text) => { const data = new DataTransfer(); data.setData('text', text); input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true })); }, code);
  }
  await paste('000000');
  await expect(page.getByText('کد تأیید نادرست است', { exact: true })).toBeVisible();
  expect(verified).toBe(false);
  await paste('۱۲۳۴۵۶');
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(registrations).toBe(1);
  expect(attempts).toBe(2);
});

for (const dark of [false, true]) test(`login accessibility: ${dark ? 'dark' : 'light'}`, async ({ page }) => {
  await page.addInitScript(dark => localStorage.setItem('theme', dark ? 'dark' : 'light'), dark);
  await page.route('http://127.0.0.1:4109/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' }));
  await page.goto('/login');
  await expect(page.locator('#login-identifier')).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});

const adminUser = {
  id: 'admin',
  role: 'SuperAdmin',
  name: 'کاربر ارشد',
  onboardingCompleted: true,
};

test('password login opens the admin workspace during a pending refresh', async ({ page }) => {
  let releaseRefresh!: () => void;
  const pendingRefresh = new Promise<void>(resolve => { releaseRefresh = resolve; });
  await page.route('http://127.0.0.1:4109/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/refresh') {
      await pendingRefresh;
      // The client aborts this request when the password is submitted.
      await route.fulfill({ status: 401, json: { error: 'نشست موجود نیست' } }).catch(() => {});
    } else if (path === '/auth/entry') {
      await route.fulfill({ json: { identifier: 'admin@example.test', next: 'password' } });
    } else if (path === '/auth/login/password') {
      await route.fulfill({ json: { accessToken: 'new-login-token', user: adminUser } });
    } else if (path === '/auth/me') {
      await route.fulfill({ json: adminUser });
    } else {
      await route.fulfill({ status: 503, json: { error: 'سرویس موقتاً در دسترس نیست' } });
    }
  });

  try {
    const refreshStarted = page.waitForRequest(request => request.url().endsWith('/auth/refresh'));
    await page.goto('/login');
    await refreshStarted;
    await page.locator('#login-identifier').fill('admin@example.test');
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();
    await page.locator('#login-password').fill('ExamplePassword123');
    await page.getByRole('button', { name: 'ورود', exact: true }).click();
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByRole('heading', { name: adminUser.name })).toBeVisible();
  } finally {
    releaseRefresh();
  }
});

test('automatic session recovery opens the workspace after a temporary outage', async ({ page }) => {
  let attempts = 0;
  await page.route('http://127.0.0.1:4109/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/refresh' && ++attempts > 4) {
      await route.fulfill({ json: { accessToken: 'restored-token' } });
    } else if (path === '/auth/me') {
      await route.fulfill({ json: adminUser });
    } else {
      await route.fulfill({ status: 503, json: { error: 'سرویس موقتاً در دسترس نیست' } });
    }
  });

  await page.goto('/workspace');
  await expect(page.getByRole('heading', { name: 'در حال اتصال مجدد…' })).toBeVisible();
  await expect(page.getByRole('heading', { name: adminUser.name })).toBeVisible({ timeout: 12_000 });
});
