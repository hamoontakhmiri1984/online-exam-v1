BEGIN;

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('Draft', 'Published', 'Archived');

-- CreateTable
CREATE TABLE "practice_sets" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "PracticeStatus" NOT NULL DEFAULT 'Draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_set_groups" (
    "practiceId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "practice_set_groups_pkey" PRIMARY KEY ("practiceId","groupId")
);

-- CreateTable
CREATE TABLE "practice_questions" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "sourceQuestionId" TEXT,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correctOptionIndex" INTEGER NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,

    CONSTRAINT "practice_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_attempts" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "selectedOptionIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_sets_instructorId_createdAt_idx" ON "practice_sets"("instructorId", "createdAt");

-- CreateIndex
CREATE INDEX "practice_set_groups_groupId_idx" ON "practice_set_groups"("groupId");

-- CreateIndex
CREATE INDEX "practice_questions_sourceQuestionId_idx" ON "practice_questions"("sourceQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_questions_practiceId_position_key" ON "practice_questions"("practiceId", "position");

-- CreateIndex
CREATE INDEX "practice_attempts_studentId_questionId_createdAt_idx" ON "practice_attempts"("studentId", "questionId", "createdAt");

-- CreateIndex
CREATE INDEX "practice_attempts_questionId_idx" ON "practice_attempts"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_attempts_studentId_requestId_key" ON "practice_attempts"("studentId", "requestId");

-- AddForeignKey
ALTER TABLE "practice_sets" ADD CONSTRAINT "practice_sets_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_set_groups" ADD CONSTRAINT "practice_set_groups_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practice_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_set_groups" ADD CONSTRAINT "practice_set_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practice_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "practice_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


COMMIT;
