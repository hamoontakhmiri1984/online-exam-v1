import { z } from 'zod';

const answersShape = z.record(z.string(), z.number().int().min(0));

export const finishAttemptSchema = z.object({ answers: answersShape });

// Accept only increasing autosave revisions to prevent stale writes from replacing newer answers.
export const autosaveAnswersSchema = z.object({
  answers: answersShape,
  revision: z.number().int().min(1).max(2_147_483_647),
});

export const attemptEventSchema = z.object({
  type: z.enum(['TAB_HIDDEN']),
});
