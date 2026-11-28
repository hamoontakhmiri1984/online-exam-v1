import { expect, test } from '@playwright/test';

test('SuperAdmin creates a group by selecting an approved instructor', async ({ page }) => {
  const admin = {
    id: 'admin-group-owner',
    role: 'SuperAdmin',
    name: 'مدیر سامانه',
    username: 'admin',
    onboardingCompleted: true,
  };
  const instructor = {
    id: 'approved-teacher-1',
    name: 'مریم احمدی',
    username: 'mary',
    email: 'mary@example.test',
    phone: null,
    organizationName: null,
    approvalStatus: 'Approved',
  };
  let createdPayload: Record<string, unknown> | null = null;
  let groups: Array<Record<string, unknown>> = [];

  await page.route('http://127.0.0.1:4109/**', async (route) => {
    const url = new URL(route.request().url());
    const requestPath = url.pathname;
    let body: unknown = [];

    if (requestPath === '/auth/refresh') {
      body = { accessToken: 'admin-group-token' };
    } else if (requestPath === '/auth/me') {
      body = admin;
    } else if (requestPath === '/admin/users/instructors') {
      body = { items: [instructor], total: 1, page: 1, pageSize: 100 };
    } else if (requestPath === '/categories') {
      body = [{
        id: 'math-category',
        name: 'ریاضی',
        status: 'Approved',
        createdAt: new Date().toISOString(),
      }];
    } else if (requestPath === '/groups' && route.request().method() === 'POST') {
      createdPayload = route.request().postDataJSON();
      const created = {
        id: 'admin-created-group',
        name: createdPayload.name,
        category: createdPayload.category,
        instructorId: createdPayload.instructorId,
        studentIds: [],
        joinCode: 'ADM-GROUP-01',
        approvalStatus: 'Approved',
      };
      groups = [created];
      body = created;
    } else if (requestPath === '/groups') {
      body = { items: groups, total: groups.length, page: 1, pageSize: 25 };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/groups');

  const createButton = page.getByRole('button', { name: 'گروه جدید', exact: true });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const teacherSelect = dialog.getByRole('combobox', { name: 'مدرس مسئول گروه' });
  await expect(teacherSelect).toBeVisible();
  await teacherSelect.click();

  const teacherList = dialog.getByRole('listbox', { name: 'مدرس مسئول گروه' });
  await expect(teacherList).toBeVisible();
  const menuHeight = await teacherList.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).maxHeight)
  );
  expect(menuHeight).toBeGreaterThan(300);
  await teacherList.getByRole('option', { name: /مریم احمدی.*mary/ }).click();

  await dialog.getByPlaceholder('مثلاً: کلاس ریاضی - ترم پاییز').fill('گروه ریاضی ادمین');
  const categorySelect = dialog.getByRole('combobox').nth(1);
  await categorySelect.click();
  await dialog.getByRole('listbox').getByRole('option', { name: 'ریاضی' }).click();

  await dialog.getByRole('button', { name: 'ساخت گروه' }).click();

  await expect(page.getByRole('heading', { name: 'گروه ریاضی ادمین' })).toBeVisible();
  expect(createdPayload).toMatchObject({
    name: 'گروه ریاضی ادمین',
    category: 'ریاضی',
    instructorId: 'approved-teacher-1',
    studentIds: [],
  });
});
