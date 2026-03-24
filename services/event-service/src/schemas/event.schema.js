import { z } from 'zod';

export const createEventSchema = z.object({
  title:        z.string().min(1, 'Le titre est obligatoire'),
  description:  z.string().optional(),
  date:         z.string().datetime({ message: 'Date invalide (format ISO 8601)' }),
  venue:        z.string().min(1, 'Le lieu est obligatoire'),
  maxCapacity:  z.number().int().positive('La capacité doit être un entier positif'),
  priceInCents: z.number().int().positive('Le prix doit être un entier positif (en centimes)'),
});

export const updateEventSchema = z.object({
  title:        z.string().min(1).optional(),
  description:  z.string().optional(),
  date:         z.string().datetime().optional(),
  venue:        z.string().min(1).optional(),
  priceInCents: z.number().int().positive().optional(),
  status:       z.enum(['active', 'cancelled', 'sold_out']).optional(),
});

export const queryEventSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['active', 'cancelled', 'sold_out']).optional(),
  venue:  z.string().optional(),
  from:   z.string().datetime().optional(),
  to:     z.string().datetime().optional(),
});
