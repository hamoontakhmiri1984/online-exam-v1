/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `exam_attempts` table. All the data in the column will be lost.
  - Made the column `finishedAt` on table `exam_attempts` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "exam_attempts_examId_studentId_key";

-- AlterTable
ALTER TABLE "exam_attempts" DROP COLUMN "expiresAt",
ALTER COLUMN "finishedAt" SET NOT NULL;
