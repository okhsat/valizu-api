import { z } from 'zod';

export const createBagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Bag name is required')
    .max(150),
});

export const updateBagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Bag name is required')
    .max(150),
});
