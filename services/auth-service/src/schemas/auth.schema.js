import { z } from 'zod';

export const registerSchema = z.object({
  firstname: z.string().min(1, 'Le prénom est obligatoire'),
  lastname:  z.string().min(1, 'Le nom est obligatoire'),
  email:     z.string().email('Email invalide'),
  password:  z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
  phone:     z.string().optional(),
  role:      z.enum(['user', 'operator', 'admin']).default('user'),
});

export const loginSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});

export const updateUserSchema = z.object({
  firstname: z.string().min(1).optional(),
  lastname:  z.string().min(1).optional(),
  email:     z.string().email().optional(),
  phone:     z.string().optional(),
  password:  z.string().min(8).optional(),
});
