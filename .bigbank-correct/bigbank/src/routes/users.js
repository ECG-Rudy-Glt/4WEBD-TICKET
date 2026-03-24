import { Router } from 'express';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';
import * as userService from '../services/user.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try{
        const data = createUserSchema.parse(req.body);
        const user = await userService.createUser(data);
        res.status(201).json(user);
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;

    const allUsers = await userService.getAllUsers();
    const paginatedUsers = allUsers.slice(start, start + limit);

    res.json({
        data: paginatedUsers,
        pagination: {
            page,
            limit,
            total: allUsers.length,
            totalPages: Math.ceil(allUsers.length / limit)
        }
    });
});

router.get('/:id', async (req, res) => {
    try{
        const user = await userService.getUserById(parseInt(req.params.id));
        res.json(user);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try{
        const data = updateUserSchema.parse(req.body);
        const user = await userService.updateUser(parseInt(req.params.id), data);
        res.json(user);
    } catch (err) {
        if (err.errors) {
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try{
        await userService.deleteUser(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;