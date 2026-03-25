import { Router } from 'express';
import * as authService from '../services/auth.service.js';

const router = Router();

router.post('/register', async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (err) {
        if (err.errors) return res.status(err.status || 400).json({ errors: err.errors });
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const result = await authService.login(req.body);
        res.json(result);
    } catch (err) {
        if (err.errors) return res.status(err.status || 400).json({ errors: err.errors });
        res.status(err.status || 401).json({ error: err.message });
    }
});

export default router;
