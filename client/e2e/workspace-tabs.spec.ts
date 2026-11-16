import { expect, test } from '@playwright/test';

for (const role of ['Instructor', 'SuperAdmin'] as const) {
  test(`${role} can close and reopen the desk tab after login`, async ({ page }) => {
    const identifier = 'member@example.test';
    const user = {
      id: 'member', role, name: 'کاربر آزمایشی', username: 'member',
      onboardingCompleted: true, approvalStatus: 'Approved',
    };
    let loggedIn = false;
    await page.route('http://127.0.0.1:4109/**', route => {
      const path = new URL(route.request().url()).pathname;
      switch (path) {
        case '/auth/refresh':
          return loggedIn
            ? route.fulfill({ json: { accessToken: 'fixture-token' } })
            : route.fulfill({ status: 401, json: {} });
        case '/auth/entry':
          return route.fulfill({ json: { identifier, next: 'password' } });
        case '/auth/login/password':
          loggedIn = true;
          return route.fulfill({ json: { accessToken: 'fixture-token', user } });
        case '/auth/me':
          return route.fulfill({ json: user });
        case '/admin/dashboard':
          return route.fulfill({ status: 503, json: {} });
        case '/groups':
          return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 25 } });
        default:
          return route.fulfill({ json: [] });
      }
    });

    await page.goto('/login');
    await page.locator('#login-identifier').fill(identifier);
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();
    await page.locator('#login-password').fill('ExamplePassword123');
    await page.getByRole('button', { name: 'ورود', exact: true }).click();

    await expect(page).toHaveURL(/\/workspace$/);
    const tabs = page.getByRole('navigation', { name: 'تب‌های باز پنل' });
    const deskTab = tabs.getByRole('button', { name: /بستن تب میز\s*کار/ });
    const sidebar = page.getByRole('navigation', { name: 'منوی اصلی' });
    const deskLink = sidebar.getByRole('link', { name: 'میز کار', exact: true });
    const dashboard = page.getByRole('heading', { name: user.name });
    await expect(deskTab).toBeVisible();
    await expect(dashboard).toBeVisible();

    if (role === 'SuperAdmin') {
      await page.setViewportSize({ width: 1920, height: 600 });
      const scrollRegion = page.getByTestId('panel-scroll-region');
      await expect(scrollRegion).toHaveCSS('direction', 'ltr');
      await expect(dashboard).toHaveCSS('direction', 'rtl');
      const sidebarFrame = sidebar.locator('xpath=ancestor::aside');
      await expect(sidebar).toHaveCSS('direction', 'ltr');
      await expect(deskLink).toHaveCSS('direction', 'rtl');
      await expect.poll(async () => {
        const [panel, menu, sidebarScroll] = await Promise.all([
          scrollRegion.boundingBox(), sidebarFrame.boundingBox(), sidebar.boundingBox(),
        ]);
        if (!panel || !menu || !sidebarScroll) return false;
        return Math.abs(panel.x + panel.width - menu.x) < 1 &&
          Math.abs(sidebarScroll.x + sidebarScroll.width - (menu.x + menu.width)) < 1;
      }).toBe(true);
      await expect(sidebar).not.toHaveCSS('scrollbar-width', 'none');
      const panelTop = await scrollRegion.evaluate(el => el.scrollTop);
      await sidebar.hover();
      await page.mouse.wheel(0, 350);
      await expect.poll(() => sidebar.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      await expect.poll(() => scrollRegion.evaluate(el => el.scrollTop)).toBe(panelTop);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    }

    if (role === 'Instructor') {
      await sidebar.getByRole('link', { name: 'پشتیبانی', exact: true }).click();
      const supportTab = tabs.getByRole('button', { name: 'بستن تب پشتیبانی', exact: true });
      await expect(supportTab).toBeVisible();
      await deskTab.click();
      await expect(page).toHaveURL(/\/support$/);
      await expect(deskTab).toHaveCount(0);
      await supportTab.click();
    } else {
      await deskTab.click();
    }

    await expect(page).toHaveURL(/\/workspace\/empty$/);
    await expect(tabs).toHaveCount(0);
    await expect(dashboard).toHaveCount(0);
    await expect(deskLink).not.toHaveAttribute('aria-current', 'page');

    await page.reload();
    await expect(deskLink).toBeVisible({ timeout: 10000 });
    await expect(tabs).toHaveCount(0);
    await expect(dashboard).toHaveCount(0);

    await deskLink.click();
    await expect(deskTab).toBeVisible();
    await expect(dashboard).toBeVisible();
    await deskTab.click();
    await expect(tabs).toHaveCount(0);
    await expect(dashboard).toHaveCount(0);
  });
}
