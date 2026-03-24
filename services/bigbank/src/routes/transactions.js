import { Router } from 'express';
import { createTransactionSchema } from '../schemas/transaction.schema.js';
import * as transactionService from '../services/transaction.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try{
        const userId = req.headers['x-user-id'];
        const userRole = req.headers['x-user-role'];
        const transaction = await transactionService.createTransaction(req.body, userId, userRole);
        res.status(201).json(transaction);
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json ({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await transactionService.getAllTransactions(page, limit);
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/account/:accountId', async (req, res) => {
    try {
        const result = await transactionService.getTransactionsByAccount(req.params.accountId);
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;