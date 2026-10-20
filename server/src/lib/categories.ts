import { logEvent } from './logger';
import { prisma } from './prisma';
import { notifyUser, notifyRoles } from './notifications';
import { conflict, notFound } from './errors';
import { Prisma } from '@prisma/client';
import type { Category, CategoryStatus } from '@prisma/client';

export function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

// The unique index resolves concurrent creation of the same normalized name.
function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
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

// Include approved categories and the instructor's own pending proposals.
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

export async function proposeCategory(instructorId: string, rawName: string) {
  const name = rawName.trim();
  const nameNormalized = normalizeCategoryName(name);

  const existing = await prisma.category.findUnique({
    where: { nameNormalized },
  });
  if (existing) {
    return { category: serializeCategory(existing), created: false };
  }

  let created: Category;
  try {
    created = await prisma.category.create({
      data: {
        name,
        nameNormalized,
        proposedById: instructorId,
        status: 'Pending',
      },
    });
  } catch (err) {
    // Return the concurrent winner without emitting a duplicate notification.
    if (isUniqueViolation(err)) {
      const winner = await prisma.category.findUnique({
        where: { nameNormalized },
      });
      if (winner) {
        return { category: serializeCategory(winner), created: false };
      }
    }
    throw err;
  }

  const proposer = await prisma.user.findUnique({
    where: { id: instructorId },
  });
  notifyRoles(
    ['SuperAdmin'],
    `${proposer?.name || 'یه مدرس'} دسته‌بندیِ جدیدِ «${name}» رو پیشنهاد داد`,
    'info'
  ).catch((err) => logEvent('error', 'notifyRoles failed:', err));

  return { category: serializeCategory(created), created: true };
}

export async function adminCreateCategory(name: string) {
  const trimmed = name.trim();
  const nameNormalized = normalizeCategoryName(trimmed);

  const existing = await prisma.category.findUnique({
    where: { nameNormalized },
  });
  if (existing) {
    throw conflict('این دسته‌بندی از قبل وجود داره');
  }

  try {
    const created = await prisma.category.create({
      data: { name: trimmed, nameNormalized, status: 'Approved' },
    });
    return serializeCategory(created);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw conflict('این دسته‌بندی از قبل وجود داره');
    }
    throw err;
  }
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
    ).catch((err) => logEvent('error', 'notifyUser failed:', err));
  }

  return serializeCategory(updated);
}

// Keep usage checks and rename propagation aligned across every category-bearing table.
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

// Pending categories may already be referenced and cannot be deleted while in use.
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
    ).catch((err) => logEvent('error', 'notifyUser failed:', err));
  }
}

// Rename every stored category reference in the same transaction.
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

  let updated: Category;
  try {
    [updated] = await prisma.$transaction([
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
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw conflict('دسته‌بندیِ دیگه‌ای همین اسم رو داره');
    }
    throw err;
  }

  return serializeCategory(updated);
}
