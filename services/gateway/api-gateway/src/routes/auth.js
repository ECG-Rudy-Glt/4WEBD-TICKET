import { Router } from 'express';
import * as authService from '../services/auth.service.js';

const router = Router();

router.post('/register', async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const result = await authService.login(req.body);
        res.json(result);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await authService.getAllUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
