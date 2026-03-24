import { z } from 'zod';

export const createTransactionSchema = z.object({
    fromAccountId: z.number().int().positive("ID compte source invalide"),
    toAccountId: z.number().int().positive("ID compte destination invalide"),
    amount: z.number().positive("Le montant doit être positif"),
    description: z.string().optional()
});