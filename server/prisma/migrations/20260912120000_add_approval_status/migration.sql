-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'Approved';
