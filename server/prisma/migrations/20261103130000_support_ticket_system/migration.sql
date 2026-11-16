-- Multi-ticket support system. Legacy SupportThread/SupportMessage are retained.
CREATE TYPE "SupportTicketPriority" AS ENUM ('Low', 'Normal', 'High', 'Urgent');
CREATE TYPE "SupportTicketCategory" AS ENUM ('Technical', 'Exams', 'Payments', 'Account', 'Other');
CREATE TYPE "SupportTicketStatus" AS ENUM ('Open', 'Answered', 'Closed');

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "trackingCode" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" "SupportTicketCategory" NOT NULL,
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'Normal',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'Open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "fromStaff" BOOLEAN NOT NULL DEFAULT false,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportTicket_trackingCode_key" ON "SupportTicket"("trackingCode");
CREATE INDEX "SupportTicket_userId_updatedAt_idx" ON "SupportTicket"("userId","updatedAt");
CREATE INDEX "SupportTicket_status_priority_updatedAt_idx" ON "SupportTicket"("status","priority","updatedAt");
CREATE UNIQUE INDEX "SupportTicketMessage_ticketId_clientId_key" ON "SupportTicketMessage"("ticketId","clientId");
CREATE INDEX "SupportTicketMessage_ticketId_createdAt_idx" ON "SupportTicketMessage"("ticketId","createdAt");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
