import { z } from 'zod';

export const createBookingSchema = z.object({
    eventId:   z.number().int().positive("ID événement invalide"),
    quantity:  z.number().int().positive("La quantité doit être supérieure à 0").default(1),
    cardToken: z.string().min(1, "Le token de carte est obligatoire")
});
