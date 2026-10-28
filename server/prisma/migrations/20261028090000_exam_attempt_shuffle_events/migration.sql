ALTER TABLE "exam_attempts" ADD COLUMN "shuffleSeed" TEXT;

CREATE TABLE "exam_attempt_events" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exam_attempt_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exam_attempt_events_attemptId_createdAt_idx"
  ON "exam_attempt_events"("attemptId", "createdAt");

ALTER TABLE "exam_attempt_events"
  ADD CONSTRAINT "exam_attempt_events_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
