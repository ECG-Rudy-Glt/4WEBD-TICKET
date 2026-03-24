import { Router } from 'express';
import { createTransactionSchema } from '../schemas/transaction.schema.js';
import * as transactionService from '../services/transaction.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try{
        const data = createTransactionSchema.parse(req.body);
        const transaction = await transactionService.createTransaction(data);
        res.status(201).json(transaction);
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;

    const allTransactions = transactionService.getAllTransactions();
    const paginated = allTransactions.slice(start, start + limit);

    res.json({
        data: paginated,
        pagination: {
            page, limit,
            total: allTransactions.length,
            totalPages: Math.ceil(allTransactions.length / limit)
        }
    });
});

router.get('/account/:accountId', (req, res) => {
    const transactions = transactionService.getTransactionsByAccount(
        parseInt(req.params.accountId)
    );
    res.json(transactions);
});

export default router;

