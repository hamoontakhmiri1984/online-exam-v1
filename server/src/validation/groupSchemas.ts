import { z } from 'zod';

export const groupCardColorSchema = z.enum(['Default', 'Stone', 'BlueGray', 'Sage', 'Sand', 'Lavender', 'Teal']);

export const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().min(1),
  studentIds: z.array(z.string().min(1)).max(500).default([]),
  instructorId: z.string().min(1).optional(),
  cardColor: groupCardColorSchema.optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  studentIds: z.array(z.string().min(1)).max(500).default([]),
  cardColor: groupCardColorSchema.optional(),
});

export const joinGroupSchema = z.object({
  joinCode: z.string().min(4).max(32),
});
