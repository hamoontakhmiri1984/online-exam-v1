import { prisma } from '../../lib/prisma';
import { forbidden, badRequest } from '../../lib/errors';
import type { Role } from '../../lib/jwt';
import { canUseObjectKeys } from '../../lib/objectKeys';

export type DbSession = {
  id: string;
  category: string;
  title: string;
  description: string;
  videoType: 'LINK' | 'UPLOAD';
  videoUrl: string | null;
  videoFileName: string | null;
  videoObjectUrl: string | null;
  groups: { id: string }[];
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }[];
};

// شکل خروجی رو معادل LessonSession تو client/src/api/lessonApi.ts می‌سازیم:
// چهار فیلد پراکنده‌ی video* تو دیتابیس رو به یونیون video: {type:'link'|'upload', ...} تبدیل می‌کنیم.
// توجه: ستون‌های videoObjectUrl/fileUrl تو دیتابیس همون اسم قدیمی رو دارن
// (برای این‌که migration لازم نشه)، ولی از این به بعد فقط object key
// (نه یه URL دائمی قابل‌دسترس) توشون ذخیره می‌شه - برای همین تو JSON خروجی
// اسمش رو به objectKey تغییر می‌دیم تا فرانت اشتباه مستقیم به‌عنوان src/href
// استفاده‌ش نکنه؛ به‌جاش باید signed-url بگیره.
export function serializeSession(s: DbSession) {
  const video =
    s.videoType === 'LINK'
      ? { type: 'link' as const, url: s.videoUrl ?? '' }
      : {
          type: 'upload' as const,
          fileName: s.videoFileName ?? '',
          objectKey: s.videoObjectUrl ?? '',
        };

  return {
    id: s.id,
    category: s.category,
    groupIds: s.groups.map((g) => g.id),
    title: s.title,
    description: s.description,
    video,
    attachments: s.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      objectKey: a.fileUrl,
      fileSize: a.fileSize,
    })),
  };
}

export const withGroups = {
  groups: { select: { id: true } },
  attachments: {
    select: { id: true, fileName: true, fileUrl: true, fileSize: true },
    // بدون orderBy ترتیب پیوست‌ها تضمین‌شده نیست و بعد از هر ویرایش ممکنه
    // جابه‌جا بشه
    orderBy: { createdAt: 'asc' },
  },
} as const;

// بدون orderBy، Postgres ترتیب رو تضمین نمی‌کنه (و بعد از UPDATE معمولاً
// عوض می‌شه)؛ چون فرانت جلسات رو با شماره‌ی ترتیب نشون می‌ده («جلسه ۱، ۲، …»)،
// با ویرایش یه جلسه شماره‌ها جابه‌جا می‌شدن
export const sessionOrder = { createdAt: 'asc' } as const;

// عکس serializeSession: یونیون video رو به چهار فیلد پراکنده‌ی دیتابیس برمی‌گردونه
export function videoToDbFields(
  video:
    | { type: 'link'; url: string }
    | { type: 'upload'; fileName: string; objectKey: string }
) {
  return video.type === 'link'
    ? {
        videoType: 'LINK' as const,
        videoUrl: video.url,
        videoFileName: null,
        videoObjectUrl: null,
      }
    : {
        videoType: 'UPLOAD' as const,
        videoUrl: null,
        videoFileName: video.fileName,
        videoObjectUrl: video.objectKey,
      };
}

// جلوی ثبت کلید فایلِ مال یه کاربر دیگه رو می‌گیره: Instructor فقط کلیدهایی رو
// می‌تونه بذاره که خودش آپلود کرده یا از قبل روی همین جلسه بوده (existing).
// SuperAdmin معاف از چک مالکیته (شکل کلید تو schema چک شده).
export function assertFileKeysAllowed(
  user: { sub: string; role: Role },
  data: {
    video: { type: 'link' } | { type: 'upload'; objectKey: string };
    attachments: { objectKey: string }[];
  },
  existing?: DbSession
) {
  if (user.role === 'SuperAdmin') return;

  const videoOk =
    data.video.type !== 'upload' ||
    canUseObjectKeys(
      'lesson-videos',
      user.sub,
      [data.video.objectKey],
      existing?.videoObjectUrl ? [existing.videoObjectUrl] : []
    );
  const attachmentsOk = canUseObjectKeys(
    'lesson-attachments',
    user.sub,
    data.attachments.map((a) => a.objectKey),
    existing?.attachments.map((a) => a.fileUrl) ?? []
  );

  if (!videoOk || !attachmentsOk) {
    throw forbidden('فایل انتخاب‌شده متعلق به تو نیست');
  }
}

// SuperAdmin چک مالکیت گروه نداره، پس وجود گروه‌ها رو جدا چک می‌کنیم -
// وگرنه connect روی groupId ناموجود یه 500 (P2025) می‌داد
export async function assertGroupsExist(groupIds: string[]) {
  const unique = new Set(groupIds);
  if (unique.size === 0) return;
  const found = await prisma.group.count({
    where: { id: { in: [...unique] } },
  });
  if (found !== unique.size) throw badRequest('گروه یافت نشد');
}

// گروه‌هایی که این کاربر (بسته به نقشش) بهشون دسترسی داره - برای چک اینکه
// groupIds ارسالی تو بدنه‌ی درخواست، همه واقعاً متعلق به خودشن
export async function ownedGroupIds(userId: string): Promise<Set<string>> {
  const groups = await prisma.group.findMany({
    where: { instructorId: userId },
    select: { id: true },
  });
  return new Set(groups.map((g) => g.id));
}

// معادل loadAccessibleExam تو lib/examAccess.ts، برای LessonSession: فقط
// برای دو endpoint امضای لینک (تو lessonSessions.routes.ts) لازمه، چون اونجا
// برخلاف GET '/' که فقط فیلتر می‌کنه، باید صریح allowed/not-allowed بدونیم.
// SuperAdmin: همیشه مجاز. Instructor: اگه حداقل یکی از گروه‌های جلسه مال
// خودش باشه. Student: فقط اگه عضو حداقل یکی از گروه‌های جلسه باشه.
export async function loadAccessibleSession(
  sessionId: string,
  userId: string,
  role: Role
): Promise<{ session: DbSession | null; allowed: boolean }> {
  const session = await prisma.lessonSession.findUnique({
    where: { id: sessionId },
    include: withGroups,
  });
  if (!session) return { session: null, allowed: false };

  if (role === 'SuperAdmin') return { session, allowed: true };

  const groupIds = session.groups.map((g) => g.id);

  if (role === 'Instructor') {
    const owned = await prisma.group.count({
      where: { id: { in: groupIds }, instructorId: userId },
    });
    return { session, allowed: owned > 0 };
  }

  const isMember = await prisma.group.count({
    where: { id: { in: groupIds }, students: { some: { id: userId } } },
  });
  return { session, allowed: isMember > 0 };
}