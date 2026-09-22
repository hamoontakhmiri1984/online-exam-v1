/*
  Warnings:

  - A unique constraint covering the columns `[examId,studentId]` on the table `exam_attempts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `exam_attempts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "finishedAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON "exam_attempts"("examId", "studentId");
