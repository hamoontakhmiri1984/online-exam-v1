import { expect, test } from '@playwright/test';

test('public, login and instructor actions share the brand purple', async ({ page }) => {
  let loggedIn = false;
  const user = { id: 'teacher', role: 'Instructor', name: 'مدرس', onboardingCompleted: true };
  await page.route('http://127.0.0.1:4109/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/refresh') {
      return loggedIn ? route.fulfill({ json: { accessToken: 'token' } }) : route.fulfill({ status: 401, json: {} });
    }
    if (path === '/auth/me') return route.fulfill({ json: user });
    if (path === '/auth/entry') return route.fulfill({ json: { identifier: 'teacher@example.test', next: 'password' } });
    if (path === '/auth/login/password') {
      loggedIn = true;
      return route.fulfill({ json: { accessToken: 'token', user } });
    }
    if (path === '/banks') {
      return route.fulfill({ json: { items: [{ id: 'bank', name: 'بانک ریاضی', category: 'ریاضی', questionCount: 8 }], total: 1, page: 1, pageSize: 25 } });
    }
    if (path === '/groups' || path === '/practice') return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 25 } });
    return route.fulfill({ json: [] });
  });

  const primary = 'linear-gradient(105deg, rgb(101, 70, 198), rgb(118, 84, 202))';
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'ثبت‌نام رایگان', exact: true })).toHaveCSS('background-image', primary);
  await expect(page.getByText('به سبک آینده', { exact: true })).toHaveCSS('color', 'rgb(91, 59, 173)');
  await page.goto('/login');
  const continueButton = page.getByRole('button', { name: 'ادامه', exact: true });
  await expect(continueButton).toHaveCSS('background-image', primary);
  await page.locator('#login-identifier').fill('teacher@example.test');
  await continueButton.click();
  await expect(page.getByText('ویرایش', { exact: true })).toHaveCSS('color', 'rgb(91, 59, 173)');
  await page.getByRole('button', { name: 'دریافت کد با ایمیل' }).click();
  const passwordMethod = page.getByRole('button', { name: 'ورود با رمز عبور' });
  await expect(passwordMethod).toHaveCSS('color', 'rgb(91, 59, 173)');
  await passwordMethod.click();
  await page.locator('#login-password').fill('ExamplePassword123');
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);

  const activeNav = page.getByRole('link', { name: 'بانک سؤال', exact: true });
  await activeNav.click();
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'بانک ریاضی' }) });
  const manage = card.getByRole('button', { name: 'مدیریت سؤال‌ها' });
  const edit = card.getByRole('button', { name: 'ویرایش بانک ریاضی' });
  await expect(manage).toHaveCSS('background-image', primary);
  await expect(edit).toHaveCSS('color', 'rgb(91, 59, 173)');
  await expect(activeNav).toHaveCSS('color', 'rgb(91, 59, 173)');
  await page.getByRole('button', { name: 'فعال کردن حالت تاریک' }).click();
  await expect(manage).toHaveCSS('background-image', primary);
  await expect(edit).toHaveCSS('color', 'rgb(213, 193, 255)');
  await expect(activeNav).toHaveCSS('color', 'rgb(213, 193, 255)');
  await expect(card.getByRole('button', { name: 'حذف بانک ریاضی' })).toHaveCSS('color', 'rgb(255, 179, 194)');
});
