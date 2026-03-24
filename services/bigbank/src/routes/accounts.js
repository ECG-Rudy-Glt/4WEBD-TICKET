import { Router } from 'express';
import { createAccountSchema, updateAccountSchema } from '../schemas/account.schema.js';
import * as accountService from '../services/account.service.js';

const router = Router({ mergeParams: true });

router.post('/', async (req, res) => {
    try {
        const data =  createAccountSchema.parse(req.body);
        const account = await accountService.createAccount(parseInt(req.params.userId), data);
        res.status(201).json(account);
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try{
        const accounts = await accountService.getAccountsByUser(parseInt(req.params.userId));
        res.json(accounts);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message});
    }
});

router.get('/:id', async (req, res) => {
    try{
        const account = await accountService.getAccountById(parseInt(req.params.id));
        res.json(account);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const data = updateAccountSchema.parse(req.body);
        const account = await accountService.updateAccount(
            parseInt(req.params.userId),
            parseInt(req.params.id),
            data
        );
        res.json(account);
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try{
        await accountService.deleteAccount(
            parseInt(req.params.userId),
            parseInt(req.params.id)
        );
        res.status(204).send();
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;