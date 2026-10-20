import { z } from 'zod';
import { objectKeySchema } from '../lib/objectKeys';

// Accept only HTTP(S) links; uploaded videos use private object keys.
export const videoLinkSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .transform((value) =>
    /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`
  )
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        (u.protocol === 'https:' || u.protocol === 'http:') &&
        u.hostname.includes('.') &&
        !u.username &&
        !u.password
      );
    } catch {
      return false;
    }
  }, 'لینک ویدیو نامعتبر است');

export const videoSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('link'), url: videoLinkSchema }),
  z.object({
    type: z.literal('upload'),
    fileName: z.string().min(1),
    objectKey: objectKeySchema('lesson-videos'),
  }),
]);

export const attachmentSchema = z.object({
  id: z.string().optional(),
  fileName: z.string().min(1),
  objectKey: objectKeySchema('lesson-attachments'),
  fileSize: z.number().int().nonnegative(),
});

export const createSessionSchema = z.object({
  category: z.string().min(1),
  groupIds: z.array(z.string()).default([]),
  title: z.string().min(2),
  description: z.string().trim().default(''),
  video: videoSourceSchema,
  attachments: z.array(attachmentSchema).default([]),
});

export const updateSessionSchema = createSessionSchema;
