import { z } from 'zod';

export const copyTripResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  destination: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  bags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      items: z.array(
        z.object({
          itemId: z.string(),
          quantity: z.number().int(),
        }),
      ),
    }),
  ),
});

export type CopyTripResult = z.infer<typeof copyTripResultSchema>;
