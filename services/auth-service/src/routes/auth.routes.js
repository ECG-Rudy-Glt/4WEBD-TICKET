import { Router } from 'express';
import bcrypt from 'bcrypt';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import * as userService from '../services/user.service.js';
import { generateToken } from '../services/jwt.service.js';

const router = Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await userService.createUser(data);
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await userService.findUserByEmail(data.email);

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }

    const token = generateToken(user);
    const { password, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
