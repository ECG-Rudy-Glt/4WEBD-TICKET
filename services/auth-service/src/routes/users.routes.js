import { Router } from 'express';
import { updateUserSchema } from '../schemas/auth.schema.js';
import * as userService from '../services/user.service.js';

const router = Router();

// GET /users — liste paginée (admin)
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role  = req.query.role || undefined;
    const result = await userService.getAllUsers({ page, limit, role });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /users/me — profil de l'utilisateur courant (via header X-User-Id injecté par la gateway)
router.get('/me', async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const user = await userService.getUserById(userId);
    res.json(user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(parseInt(req.params.id));
    res.json(user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /users/:id
router.put('/:id', async (req, res) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await userService.updateUser(parseInt(req.params.id), data);
    res.json(user);
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /users/:id
router.delete('/:id', async (req, res) => {
  try {
    await userService.deleteUser(parseInt(req.params.id));
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
