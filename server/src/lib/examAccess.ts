import { prisma } from './prisma';
import type { Role } from './jwt';

// export شده چون routes/exams.ts (GET /, GET /:id, POST، PUT) هم دقیقاً همین
// shape رو برای serializeExam لازم داره - یه‌جا تعریف می‌شه تا drift نکنن
export const examInclude = {
  groups: { select: { id: true } },
  _count: { select: { attempts: true } },
} as const;

export type AccessibleExam = {
  id: string;
  title: string;
  category: string;
  scheduledAt: Date;
  durationMinutes: number;
  allowReview: boolean;
  status: 'Draft' | 'Published';
  groups: { id: string }[];
  _count: { attempts: number };
};

// معادل منطق GET /exams/:id تو routes/exams.ts - همون‌جا کپی نشه، هم اینجا
// و هم تو questions.ts/examAttempts.ts که به یه آزمون مشخص نیاز دارن استفاده
// می‌شه. SuperAdmin: همیشه مجاز. Instructor: فقط اگه حداقل یکی از گروه‌های
// آزمون مال خودش باشه (چه Draft چه Published - برای مدیریت/آماده‌سازی).
// Student: فقط اگه آزمون Published باشه - یه آزمون Draft هرگز نباید برای
// دانشجو قابل‌مشاهده/شروع باشه، حتی اگه عضو گروهش هم باشه (دقیقاً همون
// timing-gate قبلی رو scheduledAt، این یکی رو status ـه) - و به‌علاوه یکی از
// این دو:
//   ۱) عضو حداقل یکی از گروه‌های آزمون باشه
//   ۲) خودش قبلاً این آزمون رو شروع کرده باشه (attempt داره)
// شرط ۲ برای اینه که حذفِ عضویت (یا حذفِ گروه) وسطِ آزمون، ذخیره/ثبتِ نهایی
// و resume دانشجو رو با 403 قطع نکنه و جوابش گم نشه. attempt شروع‌شده مستقل
// از تغییرِ بعدیِ عضویت قابل‌دسترسه؛ شروعِ attempt *جدید* همچنان عضویت
// می‌خواد (شاخه‌ی attempt فقط برای کسی برقراره که attempt داره).
export async function loadAccessibleExam(
  examId: string,
  userId: string,
  role: Role
): Promise<{ exam: AccessibleExam | null; allowed: boolean }> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: examInclude,
  });
  if (!exam) return { exam: null, allowed: false };

  if (role === 'SuperAdmin') return { exam, allowed: true };

  const groupIds = exam.groups.map((g) => g.id);

  if (role === 'Instructor') {
    const owned = await prisma.group.count({
      where: { id: { in: groupIds }, instructorId: userId },
    });
    return { exam, allowed: owned > 0 };
  }

  if (exam.status !== 'Published') return { exam, allowed: false };

  const isMember = await prisma.group.count({
    where: { id: { in: groupIds }, students: { some: { id: userId } } },
  });
  if (isMember > 0) return { exam, allowed: true };

  const hasAttempt = await prisma.examAttempt.count({
    where: { examId: exam.id, studentId: userId },
  });
  return { exam, allowed: hasAttempt > 0 };
}
