import { z } from 'zod';

export const createAccountSchema = z.object({
    label: z.string().min(1, "Le nom du compte est obligatoire"),
    type: z.enum(["checking", "savings"], { message: "Type invalide (checking ou savings)"})
});

export const updateAccountSchema = z.object({
    label: z.string().min(1).optional()
});