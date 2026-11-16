import { test, expect } from '@playwright/test';

const teacher = {
  id: 'teacher-1', role: 'Instructor', name: 'مدرس آزمایشی', username: 'teacher',
  approvalStatus: 'Approved', onboardingCompleted: true,
};

const category = { id: 'math', name: 'ریاضی', status: 'Approved', createdAt: new Date().toISOString() };
const firstBank = { id: 'bank-1', instructorId: teacher.id, name: 'بانک ریاضی', category: category.name, questionCount: 1 };
const question = { id: 'question-1', bankId: firstBank.id, text: '۲ به علاوه ۲ چند است؟', options: ['۳', '۴', '۵', '۶'], correctOptionIndex: 1, difficulty: 'Easy' };

test('instructor can create, rename, and delete a question bank from the unified management UI', async ({ page }) => {
  let banks: typeof firstBank[] = [];
  const methods: string[] = [];
  await page.route('http://127.0.0.1:4109/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let status = 200;
    let body: unknown = [];
    if (url.pathname === '/auth/refresh') body = { accessToken: 'test-token' };
    else if (url.pathname === '/auth/me') body = teacher;
    else if (url.pathname === '/categories') body = [category];
    else if (url.pathname === '/banks' && method === 'GET') body = { items: banks, page: 1, pageSize: 25, total: banks.length };
    else if (url.pathname === '/banks' && method === 'POST') {
      methods.push('POST');
      banks = [{ ...firstBank, ...route.request().postDataJSON() }];
      status = 201;
      body = banks[0];
    } else if (url.pathname === '/banks/bank-1' && method === 'PUT') {
      methods.push('PUT');
      banks = [{ ...banks[0], ...route.request().postDataJSON() }];
      body = banks[0];
    } else if (url.pathname === '/banks/bank-1' && method === 'DELETE') {
      methods.push('DELETE');
      banks = [];
      status = 204;
      body = null;
    }
    await route.fulfill({ status, ...(status === 204 ? {} : { contentType: 'application/json', body: JSON.stringify(body) }) });
  });
  await page.goto('/question-banks');
  await expect(page.getByRole('heading', { name: 'بانک سؤال', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'بانک جدید' }).click();
  const dialog = page.getByRole('dialog', { name: 'ایجاد بانک سؤال' });
  await dialog.getByPlaceholder('مثلاً ریاضی دهم ـ فصل اول').fill('بانک ریاضی');
  await dialog.getByRole('combobox').click();
  await dialog.getByRole('option', { name: 'ریاضی' }).click();
  await dialog.getByRole('button', { name: 'ایجاد بانک' }).click();
  await expect(page.getByRole('heading', { name: 'بانک ریاضی' })).toBeVisible();
  await page.getByRole('button', { name: 'ویرایش بانک ریاضی' }).click();
  const editDialog = page.getByRole('dialog', { name: 'ویرایش بانک سؤال' });
  await editDialog.getByPlaceholder('مثلاً ریاضی دهم ـ فصل اول').fill('بانک ریاضی پیشرفته');
  await editDialog.getByRole('button', { name: 'ذخیره تغییرات' }).click();
  await expect(page.getByRole('heading', { name: 'بانک ریاضی پیشرفته' })).toBeVisible();
  await page.getByRole('button', { name: 'حذف بانک ریاضی پیشرفته' }).click();
  await page.getByRole('dialog', { name: 'حذف بانک سؤال' }).getByRole('button', { name: 'حذف', exact: true }).click();
  await expect(page.getByText('هنوز بانک سؤالی ندارید')).toBeVisible();
  expect(methods).toEqual(['POST', 'PUT', 'DELETE']);
});

test('instructor can create a practice from a bank question, edit it, then delete it', async ({ page }) => {
  const group = { id: 'group-1', name: 'گروه تست', category: 'ریاضی', instructorId: teacher.id, studentIds: [], approvalStatus: 'Approved', joinCode: 'TEST' };
  let practices: Array<{
    id: string; title: string; description: string; status: 'Draft' | 'Published' | 'Archived';
    publishedAt: string | null; questionCount: number; instructorName: string;
    groups: Array<{ id: string; name: string }>;
  }> = [];
  const methods: string[] = [];
  await page.route('http://127.0.0.1:4109/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let status = 200;
    let body: unknown = [];
    if (url.pathname === '/auth/refresh') body = { accessToken: 'test-token' };
    else if (url.pathname === '/auth/me') body = teacher;
    else if (url.pathname === '/groups') body = { items: [group], total: 1, page: 1, pageSize: 25 };
    else if (url.pathname === '/banks') body = { items: [firstBank], total: 1, page: 1, pageSize: 25 };
    else if (url.pathname === '/banks/bank-1/questions') body = { items: [question], total: 1, page: 1, pageSize: 25 };
    else if (url.pathname === '/practice' && method === 'GET') body = { items: practices, total: practices.length, page: 1, pageSize: 25 };
    else if (url.pathname === '/practice' && method === 'POST') {
      const input = route.request().postDataJSON();
      expect(input.groupIds).toEqual([group.id]);
      expect(input.questionIds).toEqual([question.id]);
      methods.push('POST');
      practices = [{
        id: 'practice-1', title: input.title, description: input.description,
        status: 'Draft', publishedAt: null, questionCount: 1, instructorName: teacher.name,
        groups: [{ id: group.id, name: group.name }],
      }];
      status = 201; body = { id: 'practice-1' };
    } else if (url.pathname === '/practice/practice-1' && method === 'GET') body = practices[0];
    else if (url.pathname === '/practice/practice-1/questions') body = {
      items: [{ ...question, sourceQuestionId: question.id, position: 0 }], total: 1, page: 1, pageSize: 25,
    };
    else if (url.pathname === '/practice/practice-1' && method === 'PUT') {
      methods.push('PUT');
      const input = route.request().postDataJSON();
      practices = [{ ...practices[0], title: input.title, description: input.description }];
      body = { id: 'practice-1' };
    } else if (url.pathname === '/practice/practice-1' && method === 'DELETE') {
      methods.push('DELETE');
      practices = []; status = 204; body = null;
    }
    await route.fulfill({ status, ...(status === 204 ? {} : { contentType: 'application/json', body: JSON.stringify(body) }) });
  });
  await page.goto('/practice');
  await page.getByRole('link', { name: 'تمرین جدید' }).click();
  await expect(page.getByRole('heading', { name: 'ساخت مجموعه تمرین' })).toBeVisible();
  await page.getByPlaceholder('مثلاً مرور فصل اول ریاضی').fill('تمرین ریاضی');
  await page.getByText(question.text, { exact: true }).click();
  await page.getByText(group.name, { exact: true }).click();
  await page.getByRole('button', { name: 'ذخیره و بازبینی' }).click();
  await expect(page.getByRole('heading', { name: 'تمرین ریاضی' })).toBeVisible();
  await page.getByRole('link', { name: 'ویرایش مشخصات و دسترسی' }).click();
  await page.getByPlaceholder('مثلاً مرور فصل اول ریاضی').fill('تمرین ریاضی ویرایش‌شده');
  await page.getByRole('button', { name: 'ذخیره و بازبینی' }).click();
  await expect(page.getByRole('heading', { name: 'تمرین ریاضی ویرایش‌شده' })).toBeVisible();
  await page.getByRole('link', { name: 'بازگشت به تمرین‌ها' }).click();
  await page.getByRole('button', { name: 'حذف تمرین ریاضی ویرایش‌شده' }).click();
  await page.getByRole('dialog', { name: 'حذف تمرین' }).getByRole('button', { name: 'حذف', exact: true }).click();
  await expect(page.getByText('هنوز تمرینی ثبت نشده است')).toBeVisible();
  expect(methods).toEqual(['POST', 'PUT', 'DELETE']);
});

test('instructor can create, edit and delete an individual question inside a bank', async ({ page }) => {
  let questions: typeof question[] = [];
  const operations: string[] = [];
  await page.route('http://127.0.0.1:4109/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let status = 200;
    let body: unknown = [];
    if (url.pathname === '/auth/refresh') body = { accessToken: 'test-token' };
    else if (url.pathname === '/auth/me') body = teacher;
    else if (url.pathname === '/banks/bank-1' && method === 'GET') body = { ...firstBank, questionCount: questions.length };
    else if (url.pathname === '/banks/bank-1/questions' && method === 'GET') body = { items: questions, total: questions.length, page: 1, pageSize: 25 };
    else if (url.pathname === '/banks/bank-1/questions' && method === 'POST') {
      operations.push('POST');
      questions = [{ ...question, ...route.request().postDataJSON() }];
      body = questions[0]; status = 201;
    } else if (url.pathname === '/banks/bank-1/questions/question-1' && method === 'PUT') {
      operations.push('PUT');
      questions = [{ ...questions[0], ...route.request().postDataJSON() }];
      body = questions[0];
    } else if (url.pathname === '/banks/bank-1/questions/question-1' && method === 'DELETE') {
      operations.push('DELETE');
      questions = []; body = null; status = 204;
    }
    await route.fulfill({ status, ...(status === 204 ? {} : { contentType: 'application/json', body: JSON.stringify(body) }) });
  });
  await page.goto('/question-banks/bank-1');
  await page.getByRole('button', { name: 'سؤال جدید' }).click();
  const dialog = page.getByRole('dialog', { name: 'سؤال جدید بانک' });
  await dialog.getByRole('textbox', { name: 'متن سوال' }).fill(question.text);
  for (const [index, answer] of question.options.entries()) {
    if (index >= 2) await dialog.getByRole('button', { name: 'افزودن گزینه' }).click();
    await dialog.getByRole('textbox', { name: `گزینه ${index + 1}` }).fill(answer);
  }
  await dialog.getByRole('radio', { name: 'گزینه 2 جواب درست است' }).check();
  await dialog.getByRole('button', { name: 'افزودن سؤال' }).click();
  await expect(page.getByText(question.text, { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'ویرایش سوال' }).click();
  await page.getByRole('dialog', { name: 'ویرایش سؤال بانک' }).getByRole('textbox', { name: 'متن سوال' }).fill('سؤال ویرایش‌شده');
  await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
  await expect(page.getByText('سؤال ویرایش‌شده')).toBeVisible();
  await page.getByRole('button', { name: 'حذف سوال' }).click();
  await page.getByRole('dialog', { name: 'حذف سؤال بانک' }).getByRole('button', { name: 'حذف', exact: true }).click();
  await expect(page.getByText('هنوز سوالی وجود ندارد')).toBeVisible();
  expect(operations).toEqual(['POST', 'PUT', 'DELETE']);
});

test('instructor content cards use the approved light and dark headers', async ({ page }) => {
  const practice = {
    id: 'practice-1', title: 'مرور مشتق و کاربردها', description: 'مرور مشتق‌گیری',
    status: 'Published', questionCount: 12, groups: [{ id: 'group-1', name: 'ریاضی' }],
  };
  await page.route('http://127.0.0.1:4109/**', route => {
    const path = new URL(route.request().url()).pathname;
    switch (path) {
      case '/auth/refresh': return route.fulfill({ json: { accessToken: 'test-token' } });
      case '/auth/me': return route.fulfill({ json: teacher });
      case '/banks': return route.fulfill({ json: { items: [firstBank], total: 1, page: 1, pageSize: 25 } });
      case '/practice': return route.fulfill({ json: { items: [practice], total: 1, page: 1, pageSize: 25 } });
      default: return route.fulfill({ json: [] });
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, title, light, dark] of [
    ['/question-banks', firstBank.name, 'rgb(225, 214, 248)', 'rgb(75, 58, 112)'],
    ['/practice', practice.title, 'rgb(238, 217, 246)', 'rgb(85, 55, 98)'],
  ]) {
    if (path === '/question-banks') await page.goto(path);
    else await page.getByRole('link', { name: 'مشاهده تمرین‌ها' }).click();
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) });
    const header = card.locator('.learning-content-card-header');
    await expect(card).toBeVisible();
    await expect(card.locator('.learning-content-card-art')).toBeVisible();
    expect(await card.evaluate(element => {
      const art = element.querySelector('.learning-content-card-art')!.getBoundingClientRect();
      const title = element.querySelector('h2')!.getBoundingClientRect();
      return art.right <= title.left;
    })).toBe(true);
    await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundImage)).toContain(light);
    await page.getByRole('button', { name: 'فعال کردن حالت تاریک' }).click();
    await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundImage)).toContain(dark);
    expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'فعال کردن حالت روشن' }).click();
  }
  await expect(page.getByText('فعال برای تمرین', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'مشاهده و انتشار' })).toBeVisible();
});
