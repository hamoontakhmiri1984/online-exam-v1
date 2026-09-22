import { prisma } from './prisma';
import { notifyUser, notifyRoles } from './notifications';
import { conflict, notFound } from './errors';
import type { Category, CategoryStatus } from '@prisma/client';

// دقیقاً همون پترنِ normalizeUsername (lib/username.ts) - trim + lower-case
// تا «ریاضی »، «ریاضی» و «RIYAZI»/«Riyazi» به‌عنوان یه دسته حساب بشن. از
// toLocaleLowerCase (نه toLowerCase) استفاده می‌کنیم چون ورودی می‌تونه
// فارسی/عربی هم باشه.
export function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function serializeCategory(category: Category) {
  return {
    id: category.id,
    name: category.name,
    status: category.status,
    proposedById: category.proposedById ?? undefined,
    createdAt: category.createdAt.toISOString(),
  };
}

// لیستِ قابل‌دیدنِ یه مدرسِ خاص برای پر کردن دراپ‌داون: همه‌ی دسته‌های
// Approved + پیشنهادهای Pending خودِ همین مدرس (که هنوز برای بقیه دیده
// نمی‌شن ولی خودش باید بلافاصله بتونه ازشون تو فرم استفاده کنه)
export async function listCategoriesForInstructor(instructorId: string) {
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ status: 'Approved' }, { proposedById: instructorId }],
    },
    orderBy: { name: 'asc' },
  });
  return categories.map(serializeCategory);
}

export async function listCategoriesForAdmin(status?: CategoryStatus) {
  const categories = await prisma.category.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
  return categories.map(serializeCategory);
}

// عملیات idempotent: اگه دسته‌ای با همین نامِ نرمالایزشده از قبل باشه (چه
// Approved چه Pending، مال هرکسی)، همونو برمی‌گردونه به‌جای ساختِ تکراری.
// فقط وقتی واقعاً وجود نداره یه ردیفِ Pendingِ جدید می‌سازه و SuperAdmin رو
// نوتیف می‌کنه.
export async function proposeCategory(instructorId: string, rawName: string) {
  const name = rawName.trim();
  const nameNormalized = normalizeCategoryName(name);

  const existing = await prisma.category.findUnique({
    where: { nameNormalized },
  });
  if (existing) {
    return { category: serializeCategory(existing), created: false };
  }

  const created = await prisma.category.create({
    data: {
      name,
      nameNormalized,
      proposedById: instructorId,
      status: 'Pending',
    },
  });

  const proposer = await prisma.user.findUnique({
    where: { id: instructorId },
  });
  notifyRoles(
    ['SuperAdmin'],
    `${proposer?.name || 'یه مدرس'} دسته‌بندیِ جدیدِ «${name}» رو پیشنهاد داد`,
    'info'
  ).catch((err) => console.error('notifyRoles failed:', err));

  return { category: serializeCategory(created), created: true };
}

// فقط برای SuperAdmin: اضافه‌کردنِ مستقیمِ یه دسته که همون لحظه Approved‌ـه
// (نیازی به تاییدِ خودش نداره چون خودش تاییدکننده‌ست)
export async function adminCreateCategory(name: string) {
  const trimmed = name.trim();
  const nameNormalized = normalizeCategoryName(trimmed);

  const existing = await prisma.category.findUnique({
    where: { nameNormalized },
  });
  if (existing) {
    throw conflict('این دسته‌بندی از قبل وجود داره');
  }

  const created = await prisma.category.create({
    data: { name: trimmed, nameNormalized, status: 'Approved' },
  });
  return serializeCategory(created);
}

export async function approveCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound('دسته‌بندی پیدا نشد');

  const updated = await prisma.category.update({
    where: { id },
    data: { status: 'Approved' },
  });

  if (updated.proposedById) {
    notifyUser(
      updated.proposedById,
      `دسته‌بندیِ پیشنهادیت «${updated.name}» تایید شد`,
      'award'
    ).catch((err) => console.error('notifyUser failed:', err));
  }

  return serializeCategory(updated);
}

// شمارشِ محل‌هایی که یه دسته الان واقعاً توش استفاده شده - قبل از حذف/رد
// باید صفر باشه، وگرنه رکورد موجود با یه category یتیم (که دیگه تو هیچ
// فهرستی نیست) می‌مونه. هر جدولی که category رو به‌صورت رشته نگه می‌داره
// باید هم اینجا باشه هم تو cascade ـِ renameCategory (مثلاً دسترسیِ دانشجو
// به جزوه‌ها با تطبیقِ دقیقِ رشته‌ی category گروه و جزوه حساب می‌شه)
async function countCategoryUsage(name: string) {
  const [groups, exams, sessions, banks, handouts] = await Promise.all([
    prisma.group.count({ where: { category: name } }),
    prisma.exam.count({ where: { category: name } }),
    prisma.lessonSession.count({ where: { category: name } }),
    prisma.questionBank.count({ where: { category: name } }),
    prisma.handout.count({ where: { category: name } }),
  ]);
  return groups + exams + sessions + banks + handouts;
}

// رد یه پیشنهادِ Pending یا حذفِ یه دسته‌ی Approved. تو هر دو حالت اگه دسته
// جایی استفاده شده باشه، رد/حذف رو نمی‌پذیریم: پیشنهاددهنده همون لحظه‌ی
// پیشنهاد می‌تونه دسته‌ی Pending خودش رو تو فرم‌ها بذاره (listCategoriesForInstructor)،
// پس Pending بودن به معنی «استفاده‌نشده» نیست - وگرنه اون رکوردها با یه
// categoryِ یتیم می‌موندن.
export async function deleteOrRejectCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound('دسته‌بندی پیدا نشد');

  const usage = await countCategoryUsage(category.name);
  if (usage > 0) {
    const count = usage.toLocaleString('fa-IR');
    throw conflict(
      category.status === 'Approved'
        ? `این دسته‌بندی تو ${count} مورد استفاده شده - اول باید تغییرشون بدی یا از تغییرِ نام استفاده کنی`
        : `این پیشنهاد همین حالا تو ${count} مورد استفاده شده - به‌جای رد کردن، تاییدش کن یا نامش رو تغییر بده`
    );
  }

  await prisma.category.delete({ where: { id } });

  if (category.status === 'Pending' && category.proposedById) {
    notifyUser(
      category.proposedById,
      `دسته‌بندیِ پیشنهادیت «${category.name}» رد شد`,
      'info'
    ).catch((err) => console.error('notifyUser failed:', err));
  }
}

// تغییرِ نامِ یه دسته با cascade رویِ هر جایی که دقیقاً همین رشته رو به‌عنوانِ
// category ذخیره کرده (Group/Exam/LessonSession/QuestionBank/Handout) - همه‌شون تو یه تراکنش،
// وگرنه ممکنه دسته عوض بشه ولی بعضی رکوردها با اسمِ قدیمی جا بمونن.
export async function renameCategory(id: string, rawNewName: string) {
  const newName = rawNewName.trim();
  const newNormalized = normalizeCategoryName(newName);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound('دسته‌بندی پیدا نشد');

  if (newNormalized !== category.nameNormalized) {
    const collision = await prisma.category.findUnique({
      where: { nameNormalized: newNormalized },
    });
    if (collision) {
      throw conflict('دسته‌بندیِ دیگه‌ای همین اسم رو داره');
    }
  }

  const oldName = category.name;

  const [updated] = await prisma.$transaction([
    prisma.category.update({
      where: { id },
      data: { name: newName, nameNormalized: newNormalized },
    }),
    prisma.group.updateMany({
      where: { category: oldName },
      data: { category: newName },
    }),
    prisma.exam.updateMany({
      where: { category: oldName },
      data: { category: newName },
    }),
    prisma.lessonSession.updateMany({
      where: { category: oldName },
      data: { category: newName },
    }),
    prisma.questionBank.updateMany({
      where: { category: oldName },
      data: { category: newName },
    }),
    prisma.handout.updateMany({
      where: { category: oldName },
      data: { category: newName },
    }),
  ]);

  return serializeCategory(updated);
}
