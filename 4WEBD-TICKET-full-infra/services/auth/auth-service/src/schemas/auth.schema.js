import { z } from 'zod';

export const registerSchema = z.object({
    firstname: z.string().min(1, "Le prénom est obligatoire"),
    lastname:  z.string().min(1, "Le nom est obligatoire"),
    email:     z.string().email("Email invalide"),
    phone:     z.string().optional(),
    password:  z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
    role:      z.enum(["user", "operator", "admin"]).default("user")
});

export const loginSchema = z.object({
    email:    z.string().email("Email invalide"),
    password: z.string().min(1, "Mot de passe requis")
});
