import { z } from 'zod';
import { objectKeySchema } from '../lib/objectKeys';

// Without groupId, handouts are visible through matching category membership.
export const createHandoutSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.string().min(1),
  groupId: z.string().min(1).nullable().optional(),
  fileName: z.string().min(1),
  objectKey: objectKeySchema('lesson-attachments'),
  fileSize: z.number().int().nonnegative(),
});

// Replacing a file requires its key, name and size together.
export const updateHandoutSchema = z
  .object({
    title: z.string().min(2),
    description: z.string().optional(),
    category: z.string().min(1),
    groupId: z.string().min(1).nullable().optional(),
    fileName: z.string().min(1).optional(),
    objectKey: objectKeySchema('lesson-attachments').optional(),
    fileSize: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) => {
      const fileFields = [data.fileName, data.objectKey, data.fileSize];
      const providedCount = fileFields.filter((f) => f !== undefined).length;
      return providedCount === 0 || providedCount === 3;
    },
    {
      message:
        'برای جایگزینی فایل باید هر سه‌ی fileName/objectKey/fileSize با هم ارسال بشن',
      path: ['objectKey'],
    }
  );
