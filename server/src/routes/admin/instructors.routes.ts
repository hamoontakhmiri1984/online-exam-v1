import { Router } from 'express';

import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../lib/notifications';
import { revokeSession } from '../../lib/session';
import { forceLogoutOtherSessions } from '../../realtime/socket';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, badRequest } from '../../lib/errors';
import type { Prisma } from '@prisma/client';

import { serializeInstructor } from './instructors.service';

const router = Router();

// لیست مدرس‌ها بر اساس approvalStatus - پیش‌فرض Pending (صفِ تاییدِ اصلی)،
// با query ?status=Approved یا ?status=Rejected هم می‌شه بقیه رو دید
router.get(
  '/',
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
  '/:id/approve',
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
  '/:id/reject',
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

export default router;