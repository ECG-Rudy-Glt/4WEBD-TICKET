import { Router } from 'express';
import { createProfileSchema, updateProfileSchema } from '../schemas/user.schema.js';
import * as userService from '../services/user.service.js';

const router = Router();

// POST /users — créer un profil (appelé par la gateway après register)
router.post('/', async (req, res) => {
  try {
    const data = createProfileSchema.parse(req.body);
    const profile = await userService.createProfile(data);
    res.status(201).json(profile);
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /users — liste paginée
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await userService.getAllProfiles({ page, limit });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /users/me — profil de l'utilisateur courant via header X-User-Id
router.get('/me', async (req, res) => {
  try {
    const authId = parseInt(req.headers['x-user-id']);
    if (!authId) return res.status(401).json({ error: 'Non authentifié' });
    const profile = await userService.getProfileByAuthId(authId);
    res.json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const profile = await userService.getProfileById(parseInt(req.params.id));
    res.json(profile);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /users/me — mise à jour du profil courant
router.put('/me', async (req, res) => {
  try {
    const authId = parseInt(req.headers['x-user-id']);
    if (!authId) return res.status(401).json({ error: 'Non authentifié' });
    const data = updateProfileSchema.parse(req.body);
    const profile = await userService.updateProfile(authId, data);
    res.json(profile);
  } catch (err) {
    if (err.errors) return res.status(400).json({ errors: err.errors });
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /users/:authId — suppression (admin)
router.delete('/:authId', async (req, res) => {
  try {
    await userService.deleteProfile(parseInt(req.params.authId));
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
