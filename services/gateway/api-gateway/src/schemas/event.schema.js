import { z } from 'zod';

export const createEventSchema = z.object({
    title:       z.string().min(1, "Le titre est obligatoire"),
    description: z.string().optional(),
    date:        z.string().min(1, "La date est obligatoire"),
    venue:       z.string().min(1, "Le lieu est obligatoire"),
    maxCapacity: z.number().int().positive("La capacité doit être positive"),
    priceInCents: z.number().int().nonnegative("Le prix ne peut pas être négatif")
});

export const updateEventSchema = z.object({
    title:        z.string().min(1).optional(),
    description:  z.string().optional(),
    date:         z.string().optional(),
    venue:        z.string().optional(),
    priceInCents: z.number().int().nonnegative().optional(),
    status:       z.enum(["active", "cancelled"]).optional()
});
