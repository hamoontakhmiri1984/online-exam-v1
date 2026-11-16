ALTER TABLE "SupportTicket" ADD COLUMN "assignedInstructorId" TEXT;
CREATE INDEX "SupportTicket_assignedInstructorId_updatedAt_idx" ON "SupportTicket"("assignedInstructorId", "updatedAt");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedInstructorId_fkey" FOREIGN KEY ("assignedInstructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
