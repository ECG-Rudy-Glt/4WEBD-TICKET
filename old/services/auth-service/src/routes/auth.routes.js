import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import * as userService from '../services/user.service.js';
import { generateToken } from '../services/jwt.service.js';

const router = Router();

const registerSchema = z.object({
  firstname: z.string().min(1),
  lastname:  z.string().min(1),
  email:     z.string().email(),
  password:  z.string().min(6),
  role:      z.enum(['user', 'operator', 'admin']).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await userService.createUser(data);
    res.status(201).json({ user, token: generateToken(user) });
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await userService.findUserByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }
    const { password, ...safeUser } = user;
    res.json({ user: safeUser, token: generateToken(safeUser) });
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
