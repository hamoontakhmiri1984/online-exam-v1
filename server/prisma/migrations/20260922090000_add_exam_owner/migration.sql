-- مالکیت مستقل برای هر آزمون - قبلاً مالکیت فقط از groups.instructorId
-- استنباط می‌شد (examAccess.ts)، پس حذفِ آخرین/تنها گروهِ وصل‌شده به یه
-- آزمون، اون آزمون رو کاملاً از دسترسِ مدرس خارج می‌کرد بدون این‌که خودِ
-- آزمون یا داده‌هاش پاک شده باشن.

-- AlterTable
ALTER TABLE "exams" ADD COLUMN "instructorId" TEXT;

-- Backfill: مدرسِ اولین گروهِ وصل‌شده به هر آزمون (از رابطه‌ی implicit
-- many-to-many‌ی Exam<->Group که پریزما به‌صورت _GroupExams(A=examId,
-- B=groupId) ساخته - نگاه کن به 20260911205728_init)
UPDATE "exams" e
SET "instructorId" = sub.instructor_id
FROM (
  SELECT DISTINCT ON (ge."A") ge."A" AS exam_id, g."instructorId" AS instructor_id
  FROM "_GroupExams" ge
  JOIN "groups" g ON g."id" = ge."B"
  ORDER BY ge."A", g."instructorId"
) sub
WHERE e."id" = sub.exam_id;

-- لبه‌ای: آزمونی که هیچ گروهی هم نداشته (نباید عملاً پیش بیاد، چون
-- createExamSchema حداقل یک گروه رو الزامی می‌کنه، ولی برای رکوردهای
-- قدیمی/دستی احتیاط می‌کنیم) - به اولین کاربرِ Instructor یا SuperAdmin
-- سیستم واگذار می‌شه تا NOT NULL زیر رد نشه؛ بعداً از پنل قابل تغییره
UPDATE "exams"
SET "instructorId" = (
  SELECT "id" FROM "users" WHERE "role" IN ('Instructor', 'SuperAdmin')
  ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "instructorId" IS NULL;

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "instructorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "exams_instructorId_idx" ON "exams"("instructorId");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;