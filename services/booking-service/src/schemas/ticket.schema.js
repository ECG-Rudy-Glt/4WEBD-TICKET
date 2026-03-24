import { z } from 'zod';

export const updateTicketStatusSchema = z.object({
  status:    z.enum(['confirmed', 'cancelled', 'refunded']),
  paymentId: z.number().int().positive().optional(),
});
