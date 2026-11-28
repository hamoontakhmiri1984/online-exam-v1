import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:4109/**', async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];

    if (url.pathname === '/auth/refresh') {
      body = { accessToken: 'sidebar-test-token' };
    } else if (url.pathname === '/auth/me') {
      body = {
        id: 'sidebar-admin',
        role: 'SuperAdmin',
        name: 'کاربر ارشد',
        username: 'admin',
        onboardingCompleted: true,
      };
    } else if (url.pathname === '/admin/users/instructors') {
      body = { items: [], total: 0, page: 1, pageSize: 25 };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
});

test('admin sidebar sections expand independently and restore the active group', async ({ page }) => {
  await page.goto('/instructors');

  const navigation = page.getByRole('navigation', { name: 'منوی اصلی' });
  const sidebar = page.locator('.admin-sidebar--executive');
  const education = navigation.getByRole('button', { name: 'مدیریت آموزشی', exact: true });
  const content = navigation.getByRole('button', { name: 'مدیریت محتوا', exact: true });

  const workspace = navigation.getByRole('link', { name: 'میز کار', exact: true });
  await workspace.hover();
  const workspaceVisuals = await workspace.evaluate((element) => {
    const icon = element.querySelector('.admin-nav-link-icon');
    if (!icon) throw new Error('Admin navigation icon container is missing');
    const linkStyle = window.getComputedStyle(element);
    const iconStyle = window.getComputedStyle(icon);
    const markerStyle = window.getComputedStyle(element, '::before');
    return {
      markerContent: markerStyle.content,
      markerDisplay: markerStyle.display,
      iconBackground: iconStyle.backgroundColor,
      iconColor: iconStyle.color,
      hoverBackground: linkStyle.backgroundColor,
    };
  });
  expect(workspaceVisuals.markerContent).toBe('none');
  expect(workspaceVisuals.markerDisplay).toBe('none');
  expect(workspaceVisuals.iconBackground).toBe('rgb(255, 255, 255)');
  expect(workspaceVisuals.iconColor).toBe('rgb(94, 67, 170)');
  expect(workspaceVisuals.hoverBackground).toBe('rgb(238, 234, 248)');

  const activeInstructorLink = navigation.getByRole('link', { name: 'مدرس‌ها', exact: true });
  const activeMarkerContent = await activeInstructorLink.evaluate((element) =>
    window.getComputedStyle(element, '::before').content
  );
  expect(activeMarkerContent).toBe('none');

  await expect(sidebar.locator('.admin-sidebar-identity')).toContainText('کاربر ارشد');
  await expect(sidebar.locator('.admin-nav-section-heading')).toContainText('مدیریت و راهبری');
  await expect(education).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: 'مدرس‌ها', exact: true })).toBeVisible();

  await content.click();
  await expect(content).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: 'دسته‌بندی‌ها', exact: true })).toBeVisible();

  await education.click();
  await expect(education).toHaveAttribute('aria-expanded', 'false');
  await expect(content).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: 'مدرس‌ها', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(navigation.getByRole('button', { name: 'مدیریت آموزشی', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('button', { name: 'مدیریت محتوا', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: 'دسته‌بندی‌ها', exact: true })).toBeVisible();
});
