import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: false,
});

redis.on('connect',  () => console.log('[booking-service] Redis connecté'));
redis.on('error',    (err) => console.error('[booking-service] Redis erreur:', err.message));

/**
 * Acquiert un verrou distribué sur une clé.
 * @returns {string|null} lockId si acquis, null sinon
 */
export async function acquireLock(key, ttlMs = 5000) {
  const lockId = randomUUID();
  const result = await redis.set(key, lockId, 'NX', 'PX', ttlMs);
  return result === 'OK' ? lockId : null;
}

/**
 * Libère le verrou — atomique via Lua (seul le détenteur peut libérer)
 */
export async function releaseLock(key, lockId) {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  return redis.eval(script, 1, key, lockId);
}

export default redis;
