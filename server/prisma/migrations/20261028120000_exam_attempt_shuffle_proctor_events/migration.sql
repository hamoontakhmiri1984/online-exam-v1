-- Persist a deterministic shuffle seed per newly started attempt. Existing rows
-- retain NULL, which preserves their historical question and option order.
ALTER TABLE "exam_attempts"
ADD COLUMN "shuffle_seed" TEXT;

-- Append-only integrity signals submitted by the active attempt's own student.
CREATE TABLE "exam_attempt_events" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_attempt_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exam_attempt_events_attempt_id_occurred_at_idx"
ON "exam_attempt_events"("attempt_id", "occurred_at");

ALTER TABLE "exam_attempt_events"
ADD CONSTRAINT "exam_attempt_events_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
