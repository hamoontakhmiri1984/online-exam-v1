import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  studentIds: z.array(z.string().min(1)).max(500).default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  studentIds: z.array(z.string().min(1)).max(500).default([]),
});

export const joinGroupSchema = z.object({
  joinCode: z.string().min(4).max(32),
});
