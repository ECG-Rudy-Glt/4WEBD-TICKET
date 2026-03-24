import { z } from 'zod';

export const createProfileSchema = z.object({
  authId:    z.number().int().positive('authId invalide'),
  firstname: z.string().min(1, 'Le prénom est obligatoire'),
  lastname:  z.string().min(1, 'Le nom est obligatoire'),
  email:     z.string().email('Email invalide'),
  phone:     z.string().optional(),
  avatar:    z.string().url().optional(),
  bio:       z.string().max(500).optional(),
});

export const updateProfileSchema = z.object({
  firstname: z.string().min(1).optional(),
  lastname:  z.string().min(1).optional(),
  phone:     z.string().optional(),
  avatar:    z.string().url().optional(),
  bio:       z.string().max(500).optional(),
});
