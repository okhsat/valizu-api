import { z } from 'zod';

export const addItemSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().positive().default(1),
});
