import { Router } from 'express';
import * as userService from '../services/user.service.js';

const router = Router();

// POST /users — création (appelé par la gateway après register)
router.post('/', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /users — liste (admin)
router.get('/', async (_req, res) => {
  try {
    res.json(await userService.getAllUsers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/me — profil courant via header X-User-Id
router.get('/me', async (req, res) => {
  try {
    const authId = parseInt(req.headers['x-user-id']);
    if (!authId) return res.status(401).json({ error: 'Non authentifié' });
    res.json(await userService.getUserByAuthId(authId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    res.json(await userService.getUserById(parseInt(req.params.id)));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /users/me
router.put('/me', async (req, res) => {
  try {
    const authId = parseInt(req.headers['x-user-id']);
    if (!authId) return res.status(401).json({ error: 'Non authentifié' });
    res.json(await userService.updateUser(authId, req.body));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /users/:authId
router.delete('/:authId', async (req, res) => {
  try {
    await userService.deleteUser(parseInt(req.params.authId));
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
