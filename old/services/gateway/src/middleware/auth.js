import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

export function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    req.headers['x-user-id']   = String(payload.id);
    req.headers['x-user-role'] = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}
