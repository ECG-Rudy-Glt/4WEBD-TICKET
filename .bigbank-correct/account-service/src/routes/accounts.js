import { Router } from 'express';
import { createAccountSchema, updateAccountSchema } from '../schemas/account.schema.js';
import * as accountService from '../services/account.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const data = createAccountSchema.parse(req.body);
        const account = await accountService.createAccount(data);
        res.status(201).json(account);
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/user/:userId', async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;

    const allAccounts = await accountService.getAccountsByUser(parseInt(req.params.userId));
    const paginatedAccounts = allAccounts.slice(start, start + limit);

    res.json({
        data: paginatedAccounts,
        pagination: {
            page,
            limit,
            total: allAccounts.length,
            totalPages: Math.ceil(allAccounts.length / limit)
        }
    });
});

router.get('/:id', async (req, res) => {
    try {
        const account = await accountService.getAccountById(parseInt(req.params.id));
        res.json(account);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try{
        const data = updateAccountSchema.parse(req.body);
        const account = await accountService.updateAccount(parseInt(req.params.id), data);
        res.json(account);
    } catch (err) {
        if(err.errors){
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try{
        await accountService.deleteAccount(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.patch('/:id/balance', async (req, res) => {
    try{
        const { amount } = req.body;
        const account = await accountService.updateBalance(parseInt(req.params.id), amount);
        res.json(account);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;