import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { notifyUser } from '../lib/notifications';
import { revokeSession } from '../lib/session';
import { forceLogoutOtherSessions } from '../realtime/socket';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, badRequest } from '../lib/errors';
import {
  listCategoriesForAdmin,
  adminCreateCategory,
  approveCategory,
  deleteOrRejectCategory,
  renameCategory,
} from '../lib/categories';
import {
  proposeCategorySchema,
  renameCategorySchema,
} from '../validation/categorySchemas';
import type { CategoryStatus, Prisma } from '@prisma/client';

const router = Router();
// فقط SuperAdmin به این route ها دسترسی داره
router.use(requireAuth, requireRole('SuperAdmin'));

function serializeInstructor(user: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  username: string | null;
  approvalStatus: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    username: user.username ?? undefined,
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt.toISOString(),
  };
}

// لیست مدرس‌ها بر اساس approvalStatus - پیش‌فرض Pending (صفِ تاییدِ اصلی)،
// با query ?status=Approved یا ?status=Rejected هم می‌شه بقیه رو دید
router.get(
  '/instructors',
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || 'Pending';
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      throw badRequest('status نامعتبره');
    }

    const instructors = await prisma.user.findMany({
      where: {
        role: 'Instructor',
        approvalStatus: status as Prisma.UserWhereInput['approvalStatus'],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(instructors.map(serializeInstructor));
  })
);

router.post(
  '/instructors/:id/approve',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== 'Instructor') {
      throw notFound('مدرس پیدا نشد');
    }

    // idempotent: کلیک/درخواست تکراری نباید اعلانِ تکراری بفرسته
    if (user.approvalStatus === 'Approved') {
      res.json(serializeInstructor(user));
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { approvalStatus: 'Approved' },
    });

    notifyUser(
      updated.id,
      'حساب مدرسی‌ت تایید شد - می‌تونی وارد بشی',
      'award'
    ).catch((err) => console.error('notifyUser failed:', err));

    res.json(serializeInstructor(updated));
  })
);

router.post(
  '/instructors/:id/reject',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== 'Instructor') {
      throw notFound('مدرس پیدا نشد');
    }

    // باگ قبلی: وقتی approvalStatus از قبل Rejected بود، هندلر زودتر از
    // revokeSession برمی‌گشت. یعنی اگه دفعه‌ی قبلی درست بعد از آپدیتِ ردیف
    // (که همیشه موفق می‌شه) revokeSession به‌خاطر قطعیِ Redis خطا داده بود،
    // approvalStatus از قبل Rejected مونده بود ولی نشستِ ردیس هنوز زنده بود
    // - و retry بعدیِ ادمین هم چون همین شرط رو می‌دید، همون‌جا زودتر برمی‌گشت
    // و دیگه هیچ‌وقت دوباره تلاش نمی‌کرد ابطالِ نشست رو انجام بده.
    // الان آپدیتِ ردیف (اگه لازم بود) و ابطالِ نشست از هم جدا شدن: ابطالِ
    // نشست همیشه اجرا می‌شه (حتی روی retry بعد از خطای قبلی) چون idempotent
    // ـه - پاک‌کردنِ کلیدی که از قبل وجود نداره خطا نمی‌ده.
    const alreadyRejected = user.approvalStatus === 'Rejected';
    const updated = alreadyRejected
      ? user
      : await prisma.user.update({
          where: { id: user.id },
          data: { approvalStatus: 'Rejected' },
        });

    // با توکن قبلی (تا وقتی خودش logout نکنه) همچنان می‌تونست گروه/آزمون
    // بسازه، چون requireAuth فقط sessionId رو چک می‌کنه، نه approvalStatus
    // رو از دیتابیس. با revokeSession همین الان از سیستم پرت می‌شه بیرون.
    await revokeSession(updated.id);
    forceLogoutOtherSessions(updated.id, undefined, 'account-rejected');

    if (!alreadyRejected) {
      notifyUser(updated.id, 'درخواست ثبت‌نام مدرسی‌ت رد شد', 'info').catch(
        (err) => console.error('notifyUser failed:', err)
      );
    }

    res.json(serializeInstructor(updated));
  })
);

// لیستِ کاملِ دسته‌بندی‌ها برای پنلِ ادمین. پیش‌فرض همون صفِ Pending (که
// نیازِ اصلیِ رسیدگیه)، با ?status=Approved یا بدونِ status هم می‌شه بقیه/همه
// رو دید - هم‌الگو با /admin/instructors
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    if (status && !['Pending', 'Approved'].includes(status)) {
      throw badRequest('status نامعتبره');
    }
    res.json(
      await listCategoriesForAdmin(status as CategoryStatus | undefined)
    );
  })
);

// اضافه‌کردنِ مستقیمِ یه دسته توسط SuperAdmin - همون لحظه Approved می‌شه
router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const parsed = proposeCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }
    res.status(201).json(await adminCreateCategory(parsed.data.name));
  })
);

router.post(
  '/categories/:id/approve',
  asyncHandler(async (req, res) => {
    res.json(await approveCategory(req.params.id));
  })
);

// تغییرِ نامِ یه دسته - با cascade رویِ گروه/آزمون/جلسه‌هایی که ازش استفاده
// کردن (جزئیات تو lib/categories.ts -> renameCategory)
router.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const parsed = renameCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }
    res.json(await renameCategory(req.params.id, parsed.data.name));
  })
);

// رد کردنِ یه پیشنهادِ Pending یا حذفِ یه دسته‌ی Approved که دیگه جایی
// استفاده نمی‌شه
router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    await deleteOrRejectCategory(req.params.id);
    res.status(204).send();
  })
);

export default router;
