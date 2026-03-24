import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from './middleware/auth.js';
import { proxyTo } from './middleware/proxy.js';
import bookingsRouter from './routes/bookings.js';

const app = express();
app.use(express.json());

// Rate limiting global
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans une minute' },
}));

const AUTH_URL         = process.env.AUTH_URL         || 'http://auth-service:3001';
const USER_URL         = process.env.USER_URL         || 'http://user-service:3001';
const EVENT_URL        = process.env.EVENT_URL        || 'http://event-service:3003';
const BOOKING_URL      = process.env.BOOKING_URL      || 'http://booking-service:3004';
const PAYMENT_URL      = process.env.PAYMENT_URL      || 'http://payment-service:3005';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://notification-service:3002';

// ── Auth (public)
app.use('/auth', proxyTo(AUTH_URL));

// ── Users
app.get('/users',     authenticate, requireRole('admin'),    proxyTo(USER_URL));
app.get('/users/me',  authenticate,                          proxyTo(USER_URL));
app.put('/users/me',  authenticate,                          proxyTo(USER_URL));
app.delete('/users/:id', authenticate, requireRole('admin'), proxyTo(USER_URL));

// ── Events
app.get('/events',     proxyTo(EVENT_URL));          // public
app.get('/events/:id', proxyTo(EVENT_URL));          // public
app.post('/events',    authenticate, requireRole('operator', 'admin'), proxyTo(EVENT_URL));
app.put('/events/:id', authenticate, requireRole('operator', 'admin'), proxyTo(EVENT_URL));
app.delete('/events/:id', authenticate, requireRole('operator', 'admin'), proxyTo(EVENT_URL));

// ── Bookings (async)
app.use('/bookings', bookingsRouter);

// ── Tickets
app.get('/tickets',           authenticate, requireRole('admin'),    proxyTo(BOOKING_URL));
app.get('/tickets/user/:id',  authenticate,                          proxyTo(BOOKING_URL));
app.get('/tickets/event/:id', authenticate, requireRole('operator', 'admin'), proxyTo(BOOKING_URL));
app.get('/tickets/:id',       authenticate,                          proxyTo(BOOKING_URL));

// ── Payments
app.get('/payments',           authenticate, requireRole('admin'),   proxyTo(PAYMENT_URL));
app.get('/payments/user/:id',  authenticate,                         proxyTo(PAYMENT_URL));
app.get('/payments/ticket/:id',authenticate,                         proxyTo(PAYMENT_URL));
app.get('/payments/:id',       authenticate,                         proxyTo(PAYMENT_URL));

// ── Notifications
app.get('/notifications',             authenticate, requireRole('admin'), proxyTo(NOTIFICATION_URL));
app.get('/notifications/user/:userId',authenticate,                       proxyTo(NOTIFICATION_URL));

// ── Health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

export default app;
