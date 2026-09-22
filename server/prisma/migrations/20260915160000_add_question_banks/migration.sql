-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('Easy', 'Medium', 'Hard');

-- CreateTable
CREATE TABLE "question_banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT,
    "order" INTEGER NOT NULL,
    "textSnapshot" TEXT NOT NULL,
    "optionsSnapshot" TEXT[],
    "correctIndexSnapshot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- AlterTable: بانک (nullable فعلاً - چون سوال‌های قدیمی هنوز بانک ندارن،
-- گام بعدی بعد از backfill این ستون رو NOT NULL می‌کنه) و درجه‌سختی
-- (NOT NULL با DEFAULT، چون سوال‌های قدیمی معادل مشخصی ندارن و 'Medium'
-- یه پیش‌فرض بی‌خطره)
ALTER TABLE "questions"
    ADD COLUMN "bankId" TEXT,
    ADD COLUMN "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'Medium';

-- CreateIndex
CREATE INDEX "question_banks_instructorId_idx" ON "question_banks"("instructorId");

-- CreateIndex
CREATE INDEX "question_banks_category_idx" ON "question_banks"("category");

-- CreateIndex
CREATE INDEX "questions_bankId_idx" ON "questions"("bankId");

-- CreateIndex
CREATE INDEX "questions_bankId_difficulty_idx" ON "questions"("bankId", "difficulty");

-- CreateIndex
CREATE INDEX "exam_questions_examId_idx" ON "exam_questions"("examId");

-- CreateIndex
CREATE INDEX "exam_questions_questionId_idx" ON "exam_questions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_examId_order_key" ON "exam_questions"("examId", "order");

-- AddForeignKey
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (bankId هنوز nullable ـه، ولی FK رو همین الان اضافه می‌کنیم
-- چون مقادیر NULL از چک FK رد می‌شن - بعد از backfill معنا پیدا می‌کنه)
ALTER TABLE "questions" ADD CONSTRAINT "questions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "question_banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Data migration: هر Question موجود (که تا اینجا هنوز examId قدیمیشو داره)
-- به یه QuestionBank پیش‌فرض وصل می‌شه و یه ExamQuestion (با snapshot) براش
-- ساخته می‌شه تا آزمونی که سوال توش بود دست‌نخورده بمونه. بعد از این، ستون
-- قدیمی examId حذف می‌شه.
-- ============================================================================

-- گام ۱: مالکِ (instructorId) هر آزمون رو از روی اولین گروهش پیدا کن. یه
-- آزمون می‌تونه به چند گروه وصل باشه؛ برای قطعیت (deterministic)، گروه با
-- کوچیک‌ترین id انتخاب می‌شه.
CREATE TEMP TABLE "_exam_owner" AS
SELECT DISTINCT ON (ge."A") ge."A" AS "examId", g."instructorId"
FROM "_GroupExams" ge
JOIN "groups" g ON g."id" = ge."B"
ORDER BY ge."A", g."id";

-- گام ۲: برای هر جفتِ (instructorId, category) که واقعاً سوال داره، یه
-- «بانک پیش‌فرض» بساز. id به‌صورت قطعی از md5 ساخته می‌شه تا گام‌های بعدی
-- بدون نیاز به JOIN اضافه بتونن دقیقاً همون id رو دوباره حساب کنن.
INSERT INTO "question_banks" ("id", "name", "category", "instructorId", "createdAt", "updatedAt")
SELECT DISTINCT
    'qbank_' || substr(md5(eo."instructorId" || '::' || e."category"), 1, 20),
    'بانک پیش‌فرض',
    e."category",
    eo."instructorId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "questions" q
JOIN "exams" e ON e."id" = q."examId"
JOIN "_exam_owner" eo ON eo."examId" = e."id";

-- گام ۳: bankId هر Question رو به همون بانکِ محاسبه‌شده وصل کن
UPDATE "questions" q
SET "bankId" = 'qbank_' || substr(md5(eo."instructorId" || '::' || e."category"), 1, 20)
FROM "exams" e, "_exam_owner" eo
WHERE e."id" = q."examId"
  AND eo."examId" = e."id";

-- گام ۴: برای هر Question یه ExamQuestion با snapshot بساز - همون آزمونی
-- که سوال توش تعریف شده بود رو نگه می‌داره. order بر پایه‌ی ترتیب ساخت
-- سوال داخل همون آزمونه (createdAt، بعد id برای شکستن تساوی)
INSERT INTO "exam_questions"
    ("id", "examId", "questionId", "order", "textSnapshot", "optionsSnapshot", "correctIndexSnapshot", "createdAt")
SELECT
    'eq_' || q."id",
    q."examId",
    q."id",
    ROW_NUMBER() OVER (PARTITION BY q."examId" ORDER BY q."createdAt", q."id") - 1,
    q."text",
    q."options",
    q."correctOptionIndex",
    q."createdAt"
FROM "questions" q;

DROP TABLE "_exam_owner";

-- گام ۵: همه‌ی Questionها الان bankId دارن (چه از backfill بالا، چه چون از
-- اول رکورد نداشتیم) - ستون رو اجباری کن
ALTER TABLE "questions" ALTER COLUMN "bankId" SET NOT NULL;

-- گام ۶: examId قدیمی دیگه لازم نیست - سوال حالا از طریق exam_questions به
-- آزمون وصله، نه مستقیم
ALTER TABLE "questions" DROP CONSTRAINT "questions_examId_fkey";
DROP INDEX "questions_examId_idx";
ALTER TABLE "questions" DROP COLUMN "examId";