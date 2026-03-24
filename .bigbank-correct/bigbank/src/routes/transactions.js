import { Router } from 'express';
import { createTransactionSchema } from '../schemas/transaction.schema.js';
import  { publishTransaction } from '../services/queue.service.js';
import * as transactionService from '../services/transaction.service.js';

const router = Router();

router.post('/', (req, res) => {
    try{
        const data = createTransactionSchema.parse(req.body);
        publishTransaction(data);
        res.status(202).json({
            message: "Transaction en cours de traitement",
            data
        });
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json ({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;

    const allTransactions = await transactionService.getAllTransactions();
    const paginatedTransactions = allTransactions.slice(start, start + limit);

    res.json({
        data: paginatedTransactions,
        pagination: {
            page,
            limit,
            total: allTransactions.length,
            totalPages: Math.ceil(allTransactions.length / limit)
        }
    });
});

router.get('/account/:accountId', async (req, res) => {
    const transactions = await transactionService.getTransactionsByAccount(parseInt(req.params.accountId));
    res.json(transactions);
});

export default router;