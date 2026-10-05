BEGIN;
ALTER TABLE "groups" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'Approved';
CREATE TABLE "approval_policy" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "requireInstructorApproval" BOOLEAN NOT NULL DEFAULT true,
  "requireGroupApproval" BOOLEAN NOT NULL DEFAULT false,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_policy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_policy_singleton" CHECK ("id" = 'global')
);
INSERT INTO "approval_policy" ("id") VALUES ('global');
CREATE INDEX "groups_approvalStatus_createdAt_idx" ON "groups"("approvalStatus", "createdAt");
COMMIT;
