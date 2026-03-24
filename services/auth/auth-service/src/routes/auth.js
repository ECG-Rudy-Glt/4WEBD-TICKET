import { Router } from 'express';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';

const router = Router();

router.post('/register', async (req, res) => {
    try {
        const data   = registerSchema.parse(req.body);
        const result = await authService.register(data);
        res.status(201).json(result);
    } catch (err) {
        if (err.issues) {
            return res.status(400).json({ errors: err.issues });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const data   = loginSchema.parse(req.body);
        const result = await authService.login(data);
        res.json(result);
    } catch (err) {
        if (err.issues) {
            return res.status(400).json({ errors: err.issues });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
