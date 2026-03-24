import { z } from 'zod';

export const createUserSchema = z.object({
    firstname: z.string().min(1, "Le prénom est obligatoire"),
    lastname:  z.string().min(1, "Le nom est obligatoire"),
    email:     z.string().email("Email invalide"),
    phone:     z.string().optional(),
    password:  z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
    role:      z.enum(["user", "operator", "admin"], { message: "Role invalide" }).default("user")
});

export const updateUserSchema = z.object({
    firstname: z.string().min(1).optional(),
    lastname:  z.string().min(1).optional(),
    email:     z.string().email().optional(),
    phone:     z.string().optional(),
    password:  z.string().min(8).optional()
});
