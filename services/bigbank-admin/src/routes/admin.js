import { Router } from 'express';
import * as apiService from '../services/api.service.js';

const router = Router();

router.get('/users', async (req, res) => {
     try {
         const users = await apiService.getAllUsers();
         res.json(users);
     } catch (err) {
         res.status(err.status || 500).json({ error: err.message });
     }
});

router.get('/users/:id', async (req, res) => {
    try{
        const user = await apiService.getUserById(req.params.id);
        const accounts = await apiService.getAccountsByUser(req.params.id);
        res.json({ ...user, accounts});
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/transactions', async (req, res) => {
    try{
        const transactions = await apiService.getAllTransactions();
        res.json(transactions);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/overview', async (req, res) => {
    try{
        const overview = await apiService.getFullOverview();
        res.json(overview);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;