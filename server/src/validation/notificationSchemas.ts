import { z } from 'zod';

export const markAllReadSchema = z.object({
  ids: z.array(z.string()).min(1),
});
