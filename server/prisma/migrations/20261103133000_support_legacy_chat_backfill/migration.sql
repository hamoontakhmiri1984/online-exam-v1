-- Preserve earlier one-thread-per-user support conversations as historical tickets.
INSERT INTO "SupportTicket" (
  "id", "trackingCode", "userId", "subject", "category", "priority",
  "status", "createdAt", "updatedAt"
)
SELECT
  t."id",
  'TK-' || UPPER(t."id"),
  t."userId",
  'گفت‌وگوی پشتیبانی پیشین',
  'Other'::"SupportTicketCategory",
  'Normal'::"SupportTicketPriority",
  (CASE t."status"
    WHEN 'closed' THEN 'Closed'
    WHEN 'replied' THEN 'Answered'
    ELSE 'Open'
  END)::"SupportTicketStatus",
  COALESCE((SELECT MIN(m."createdAt") FROM "SupportMessage" m WHERE m."threadId" = t."id"), t."updatedAt"),
  t."updatedAt"
FROM "SupportThread" t
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "SupportTicketMessage" (
  "id", "ticketId", "clientId", "fromStaff", "body", "createdAt"
)
SELECT m."id", m."threadId", m."clientId", m."fromStaff", m."body", m."createdAt"
FROM "SupportMessage" m
ON CONFLICT ("id") DO NOTHING;
