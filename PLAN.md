# Plan d'implémentation — Système de Billetterie SaaS (4WEBD-TICKET)

> Architecture microservices inspirée du projet BigBank de référence (`.bigbank-correct/`).
> Stack : Node.js 20 / Express 5 / ESM / Zod / bcrypt / PostgreSQL / RabbitMQ / Redis / Nginx / Docker Compose

---

## Vue d'ensemble de l'architecture

```
Zone 1 - Edge
  gateway-lb (Nginx :3030)

Zone 2 - Gateway
  api-gateway-1 (:3000)   api-gateway-2 (:3000)

Zone 3 - Microservices HA
  auth-service x2 (:3004)  →  auth-lb (:3010)
  booking-service x2 (:3003)  →  booking-lb (:3020)
  payment-service (:3005)
  notification-service (:3002)

Zone 4 - Infrastructure partagée
  PostgreSQL primary (:5432)  +  replica (:5433)
  RabbitMQ (:5672 / :15672)
  Redis (:6379)

Zone 5 - Frontend
  frontend (:8080) — static HTML/JS/CSS servi par Nginx
```

### Queues RabbitMQ

| Queue | Producteur | Consommateur |
|-------|-----------|-------------|
| `bookings` | api-gateway | booking-service |
| `payments` | booking-service | payment-service |
| `notifications` | payment-service + booking-service | notification-service |

---

## PHASE 1 — Fondation & Infrastructure

### 1.1 Structure du projet

- [ ] Créer les dossiers suivants à la racine :
  ```
  api-gateway/
  auth-service/
  booking-service/
  payment-service/
  notification-service/
  gateway-lb/
  auth-lb/
  booking-lb/
  db/
  db-replica/
  frontend/
  ```
- [ ] Créer un `.gitignore` à la racine incluant `node_modules/`, `.env`, `*.log`
- [ ] Créer un `.env.example` à la racine avec toutes les variables d'environnement

### 1.2 Docker Compose principal

Fichier : `docker-compose.yml`

- [ ] Déclarer le service `db` (postgres:16-alpine)
  - Credentials : `ticket` / `ticket` / DB `ticket`
  - Healthcheck : `pg_isready -U ticket`
  - Volume : `pgdata:/var/lib/postgresql/data`
  - Monter `./db/init-replica.sh:/docker-entrypoint-initdb.d/init-replica.sh`
  - Port exposé : `5432:5432`
- [ ] Déclarer le service `db-replica`
  - Build : `./db-replica`
  - Volume : `pgreplica:/var/lib/postgresql/data`
  - Port exposé : `5433:5432`
  - depends_on : `db`
- [ ] Déclarer le service `rabbitmq`
  - Image : `rabbitmq:3.11-management`
  - Credentials : `guest` / `guest`
  - Healthcheck : `rabbitmq-diagnostics check_port_connectivity`
  - Volume : `rabbitmqdata:/var/lib/rabbitmq`
  - Ports : `5672:5672`, `15672:15672`
- [ ] Déclarer le service `redis`
  - Image : `redis:7-alpine`
  - Port : `6379:6379`
  - Volume : `redisdata:/data`
- [ ] Déclarer `auth-service-1` et `auth-service-2`
  - Build : `./auth-service`
  - Env : `PORT=3004`, `DATABASE_URL`, `DATABASE_REPLICA_URL`, `JWT_SECRET`
  - depends_on : `db` (healthy), `db-replica`
- [ ] Déclarer `auth-lb`
  - Build : `./auth-lb`
  - Port : `3010:3010`
  - depends_on : `auth-service-1`, `auth-service-2`
- [ ] Déclarer `booking-service-1` et `booking-service-2`
  - Build : `./booking-service`
  - Env : `PORT=3003`, `DATABASE_URL`, `DATABASE_REPLICA_URL`, `REDIS_URL`, `RABBITMQ_URL`
  - depends_on : `db` (healthy), `rabbitmq` (healthy), `redis`
- [ ] Déclarer `booking-lb`
  - Build : `./booking-lb`
  - Port : `3020:3020`
  - depends_on : `booking-service-1`, `booking-service-2`
- [ ] Déclarer `payment-service`
  - Build : `./payment-service`
  - Env : `PORT=3005`, `DATABASE_URL`, `DATABASE_REPLICA_URL`, `RABBITMQ_URL`, `BOOKING_URL=http://booking-lb:3020`
  - depends_on : `db` (healthy), `rabbitmq` (healthy), `booking-lb`
  - Port : `3005:3005`
- [ ] Déclarer `notification-service`
  - Build : `./notification-service`
  - Env : `PORT=3002`, `DATABASE_URL`, `DATABASE_REPLICA_URL`, `RABBITMQ_URL`
  - depends_on : `db` (healthy), `rabbitmq` (healthy)
  - Port : `3002:3002`
- [ ] Déclarer `api-gateway-1` et `api-gateway-2`
  - Build : `./api-gateway`
  - Env : `PORT=3000`, `AUTH_URL=http://auth-lb:3010`, `BOOKING_URL=http://booking-lb:3020`, `PAYMENT_URL=http://payment-service:3005`, `NOTIFICATION_URL=http://notification-service:3002`, `RABBITMQ_URL`, `JWT_SECRET`
  - depends_on : `auth-lb`, `booking-lb`, `payment-service`, `notification-service`, `rabbitmq` (healthy)
- [ ] Déclarer `gateway-lb`
  - Build : `./gateway-lb`
  - Port : `3030:3030`
  - depends_on : `api-gateway-1`, `api-gateway-2`
- [ ] Déclarer `frontend`
  - Build : `./frontend`
  - Port : `8080:80`
  - depends_on : `gateway-lb`
- [ ] Déclarer tous les volumes : `pgdata`, `pgreplica`, `rabbitmqdata`, `redisdata`

### 1.3 Base de données — PostgreSQL primary

Fichier : `db/init-replica.sh`

- [ ] Copier et adapter le script de BigBank (`.bigbank-correct/db/init-replica.sh`)
  - Remplacer `bigbank` par `ticket` pour les credentials
  - Le script configure `wal_level = replica`, `max_wal_senders = 3`, `hot_standby = on`
  - Ajoute l'entrée `host replication replicator` dans `pg_hba.conf`
  - Crée le rôle `replicator` avec `REPLICATION LOGIN`

### 1.4 Base de données — PostgreSQL replica

Fichier : `db-replica/Dockerfile` et `db-replica/start-replica.sh`

- [ ] Copier et adapter depuis `.bigbank-correct/db-replica/`
  - `Dockerfile` : `FROM postgres:16-alpine`, copie et execute `start-replica.sh`
  - `start-replica.sh` : attend que le primary soit prêt → `pg_basebackup` si PGDATA vide → `exec gosu postgres postgres`

### 1.5 Load Balancers Nginx

Même pattern pour les 3 LBs.

**gateway-lb** (`gateway-lb/nginx.conf` et `gateway-lb/Dockerfile`)
- [ ] `nginx.conf` :
  ```nginx
  upstream gateway_backend {
      server api-gateway-1:3000;
      server api-gateway-2:3000;
  }
  server {
      listen 3030;
      location / {
          proxy_pass http://gateway_backend;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      }
  }
  ```
- [ ] `Dockerfile` : `FROM nginx:alpine`, supprime default.conf, copie nginx.conf, EXPOSE 3030

**auth-lb** (`auth-lb/nginx.conf` et `auth-lb/Dockerfile`)
- [ ] `nginx.conf` : upstream avec `auth-service-1:3004` et `auth-service-2:3004`, écoute sur 3010
- [ ] `Dockerfile` : même pattern, EXPOSE 3010

**booking-lb** (`booking-lb/nginx.conf` et `booking-lb/Dockerfile`)
- [ ] `nginx.conf` : upstream avec `booking-service-1:3003` et `booking-service-2:3003`, écoute sur 3020
- [ ] `Dockerfile` : même pattern, EXPOSE 3020

---

## PHASE 2 — auth-service

### 2.1 Initialisation du service

- [ ] Créer `auth-service/package.json`
  - `"type": "module"` (ESM)
  - dependencies : `express`, `express-rate-limit`, `bcrypt`, `zod`, `jsonwebtoken`, `pg`, `cors`
  - devDependencies : `vitest` (tests)
  - scripts : `"start": "node index.js"`, `"test": "vitest run"`
- [ ] Créer `auth-service/Dockerfile`
  - `FROM node:20-alpine`, `WORKDIR /app`, `COPY package*.json ./`, `RUN npm ci --omit=dev`, `COPY . .`, `EXPOSE 3004`, `CMD ["node", "index.js"]`
- [ ] Créer `auth-service/.dockerignore` : `node_modules`, `.env`

### 2.2 Connexion base de données

Fichier : `auth-service/src/db.js`

- [ ] Créer deux pools PostgreSQL (copier pattern de `.bigbank-correct/account-service/src/db.js`)
  - `primaryPool` → `process.env.DATABASE_URL`
  - `replicaPool` → `process.env.DATABASE_REPLICA_URL || DATABASE_URL`
- [ ] Créer la fonction `initDb()` qui exécute :
  ```sql
  CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      firstname VARCHAR(100) NOT NULL,
      lastname VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Exporter `primaryPool` (default), `replicaPool`, `initDb`

### 2.3 Schémas de validation Zod

Fichier : `auth-service/src/schemas/user.schema.js`

- [ ] `registerSchema` : `firstname` (min 1), `lastname` (min 1), `email` (email valide), `password` (min 8), `phone` (optionnel), `role` (enum: 'user', 'operator', 'admin', default 'user')
- [ ] `loginSchema` : `email` (email), `password` (string min 1)
- [ ] `updateUserSchema` : tous les champs optionnels (firstname, lastname, email, phone, password min 8)

### 2.4 Service métier

Fichier : `auth-service/src/services/user.service.js`

- [ ] `createUser(data)` : vérifier unicité email (replica), hasher password avec `bcrypt.hash(data.password, 10)`, INSERT dans DB primary, retourner `sanitize(user)`
- [ ] `loginUser(email, password)` : trouver user par email (replica), si non trouvé → `throw { status: 401, message: 'Email ou mot de passe invalide' }`, `bcrypt.compare(password, user.password)`, si faux → même erreur, retourner user complet (pour générer le JWT)
- [ ] `getAllUsers(page, limit, role)` : SELECT depuis replica avec pagination
- [ ] `getUserById(id)` : SELECT depuis replica, si non trouvé → `throw { status: 404, message: 'Utilisateur non trouvé' }`
- [ ] `updateUser(id, data)` : vérifier unicité email si changé, hasher nouveau password si fourni, UPDATE primary, retourner `sanitize(user)`
- [ ] `deleteUser(id)` : DELETE primary, si non trouvé → throw 404
- [ ] `sanitize(user)` : destructuration `{ password, ...safe } = user`, retourner `safe`

### 2.5 Service JWT

Fichier : `auth-service/src/services/jwt.service.js`

- [ ] `generateToken(user)` : `jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' })`
- [ ] `verifyToken(token)` : `jwt.verify(token, process.env.JWT_SECRET)`, propager l'erreur JWT

### 2.6 Routes

Fichier : `auth-service/src/routes/auth.js`

- [ ] `POST /auth/register` : parse `registerSchema`, appeler `createUser`, générer token, retourner `{ user, token }` avec status 201
- [ ] `POST /auth/login` : parse `loginSchema`, appeler `loginUser`, générer token, retourner `{ user: sanitize(user), token }`

Fichier : `auth-service/src/routes/users.js`

- [ ] `GET /users` : pagination avec `?page` et `?limit`, filtrage par `?role`, retourner `{ data, pagination }`
- [ ] `GET /users/me` : lire `X-User-Id` header (injecté par la gateway), appeler `getUserById`
- [ ] `GET /users/:id` : appeler `getUserById`
- [ ] `PUT /users/:id` : parse `updateUserSchema`, appeler `updateUser`
- [ ] `DELETE /users/:id` : appeler `deleteUser`, retourner 204

### 2.7 App Express

Fichier : `auth-service/src/app.js`

- [ ] Créer app Express
- [ ] Middleware : `express.json()`
- [ ] Rate limiter : `express-rate-limit`, `windowMs: 60000`, `max: 100`
- [ ] Monter routes : `/auth` → `auth.js`, `/users` → `users.js`
- [ ] Handler d'erreurs global (try/catch dans routes, format `{ error: string }` ou `{ errors: [...] }`)
- [ ] Exporter `app`

Fichier : `auth-service/index.js`

- [ ] Importer `app` et `initDb`
- [ ] `await initDb()` avant `app.listen(PORT)`
- [ ] Log de démarrage

### 2.8 Tests unitaires

Fichier : `auth-service/src/services/user.service.test.js`

- [ ] Test `createUser` : création OK, email dupliqué → erreur 409
- [ ] Test `loginUser` : credentials corrects → user retourné, mauvais password → erreur 401, email inconnu → erreur 401
- [ ] Test `sanitize` : le champ `password` n'est pas présent dans le résultat

---

## PHASE 3 — booking-service

### 3.1 Initialisation du service

- [ ] Créer `booking-service/package.json`
  - dependencies : `express`, `express-rate-limit`, `zod`, `pg`, `ioredis`, `amqplib`
  - `"type": "module"`
- [ ] Créer `booking-service/Dockerfile` (même pattern que auth-service, EXPOSE 3003)
- [ ] Créer `booking-service/.dockerignore`

### 3.2 Connexion base de données

Fichier : `booking-service/src/db.js`

- [ ] Même pattern que auth-service/src/db.js
- [ ] `initDb()` crée les tables :

  ```sql
  CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      date TIMESTAMPTZ NOT NULL,
      venue VARCHAR(255) NOT NULL,
      "maxCapacity" INTEGER NOT NULL CHECK ("maxCapacity" > 0),
      "availableTickets" INTEGER NOT NULL,
      "priceInCents" INTEGER NOT NULL CHECK ("priceInCents" > 0),
      "creatorId" INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      "eventId" INTEGER NOT NULL REFERENCES events(id),
      "userId" INTEGER NOT NULL,
      "ticketCode" VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      "paymentId" INTEGER,
      "priceInCents" INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
  );
  ```

### 3.3 Redis — Distributed Locks

Fichier : `booking-service/src/redis.js`

- [ ] Créer client Redis avec `ioredis` : `new Redis(process.env.REDIS_URL || 'redis://redis:6379')`
- [ ] Exporter `async function acquireLock(key, ttlMs = 5000)` :
  - `const lockId = crypto.randomUUID()`
  - `const result = await redis.set(key, lockId, 'NX', 'PX', ttlMs)`
  - Retourner `result === 'OK' ? lockId : null`
- [ ] Exporter `async function releaseLock(key, lockId)` :
  - Script Lua atomique : `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`
  - `redis.eval(script, 1, key, lockId)`

### 3.4 Schémas Zod

Fichier : `booking-service/src/schemas/event.schema.js`

- [ ] `createEventSchema` : `title` (min 1), `description` (optionnel), `date` (string datetime), `venue` (min 1), `maxCapacity` (int positif), `priceInCents` (int positif)
- [ ] `updateEventSchema` : tous champs optionnels

Fichier : `booking-service/src/schemas/ticket.schema.js`

- [ ] `createTicketInternalSchema` : `eventId` (int), `userId` (int), `userEmail` (email), `quantity` (int min 1), `cardToken` (string)
- [ ] `updateTicketStatusSchema` : `status` (enum: 'confirmed', 'cancelled', 'refunded'), `paymentId` (int, optionnel)

### 3.5 Service événements

Fichier : `booking-service/src/services/event.service.js`

- [ ] `createEvent(data, creatorId)` : INSERT primary, `availableTickets = maxCapacity` à la création, retourner event
- [ ] `getAllEvents(page, limit, status)` : SELECT replica, filtre optionnel sur `status`, pagination
- [ ] `getEventById(id)` : SELECT replica, throw 404 si non trouvé
- [ ] `updateEvent(id, data)` : UPDATE primary, throw 404 si non trouvé
- [ ] `cancelEvent(id)` : UPDATE `status = 'cancelled'` primary
- [ ] `decrementAvailableTickets(eventId, quantity, client)` : UPDATE primary (sur un client de transaction fourni)
- [ ] `incrementAvailableTickets(eventId, quantity)` : UPDATE primary (pour rollback paiement échoué)

### 3.6 Service tickets

Fichier : `booking-service/src/services/ticket.service.js`

- [ ] `createTicket(eventId, userId, priceInCents, quantity)` :
  - `ticketCode = crypto.randomUUID()`
  - INSERT primary, retourner ticket avec ticketCode
- [ ] `getAllTickets(page, limit)` : SELECT replica, pagination
- [ ] `getTicketsByUser(userId, page, limit)` : SELECT replica WHERE userId
- [ ] `getTicketsByEvent(eventId)` : SELECT replica WHERE eventId
- [ ] `getTicketById(id)` : SELECT replica, throw 404 si non trouvé
- [ ] `updateTicketStatus(id, status, paymentId)` : UPDATE primary

### 3.7 Consumer RabbitMQ — queue "bookings"

Fichier : `booking-service/src/services/queue.consumer.js`

- [ ] `startConsumer()` :
  - Connecter à RabbitMQ avec retry (pattern identique à `.bigbank-correct/transaction-service/src/services/queue.consumer.js`)
  - `channel.assertQueue('bookings', { durable: true })`
  - `channel.prefetch(1)` — traite 1 message à la fois
  - `channel.consume('bookings', async (msg) => {...})`
- [ ] Handler de message (`processBooking(data)`) :
  - `const { eventId, userId, userEmail, quantity, cardToken } = data`
  - Tenter d'acquérir le lock Redis : `acquireLock(\`event:lock:${eventId}\`)`
  - Si lock `null` → `channel.nack(msg, false, true)` (requeue) et return
  - Lire l'event depuis DB **primary** (pour consistance) : `SELECT "availableTickets", "priceInCents", status FROM events WHERE id = $1`
  - Si event non trouvé ou status !== 'active' → release lock → publish notification "booking_failed" → `channel.ack(msg)` → return
  - Si `availableTickets < quantity` → release lock → publish notification "booking_failed" raison "Plus de places disponibles" → `channel.ack(msg)` → return
  - `await decrementAvailableTickets(eventId, quantity)`
  - `const ticket = await createTicket(eventId, userId, event.priceInCents, quantity)`
  - Si `availableTickets - quantity === 0` → `updateEvent(eventId, { status: 'sold_out' })`
  - Publish vers queue "payments" : `{ ticketId, ticketCode, userId, userEmail, eventId, amountInCents: event.priceInCents * quantity, cardToken }`
  - `await releaseLock(\`event:lock:${eventId}\`, lockId)`
  - `channel.ack(msg)`
  - En cas d'erreur technique → `channel.nack(msg, false, true)` (requeue)

### 3.8 Routes

Fichier : `booking-service/src/routes/events.js`

- [ ] `POST /events` : lire `X-User-Id` header pour `creatorId`, parse `createEventSchema`, appeler `createEvent`
- [ ] `GET /events` : pagination + filtre `?status`
- [ ] `GET /events/:id` : appeler `getEventById`
- [ ] `GET /events/:id/tickets` : appeler `getTicketsByEvent(id)`
- [ ] `PUT /events/:id` : parse `updateEventSchema`, appeler `updateEvent`
- [ ] `DELETE /events/:id` : appeler `cancelEvent`

Fichier : `booking-service/src/routes/tickets.js`

- [ ] `GET /tickets` : list pagination
- [ ] `GET /tickets/user/:userId` : tickets d'un user
- [ ] `GET /tickets/:id` : détail ticket
- [ ] `PATCH /tickets/:id/status` : parse `updateTicketStatusSchema`, appeler `updateTicketStatus`

### 3.9 App Express + index.js

Fichier : `booking-service/src/app.js`
- [ ] Rate limiter, routes `/events` et `/tickets`, handler erreurs

Fichier : `booking-service/index.js`
- [ ] `await initDb()`, `app.listen(PORT)`, `startConsumer()`

### 3.10 Tests unitaires

Fichier : `booking-service/src/services/event.service.test.js`
- [ ] Test `createEvent` : event créé avec `availableTickets = maxCapacity`
- [ ] Test `decrementAvailableTickets` : valeur correctement decrementée

Fichier : `booking-service/src/redis.test.js`
- [ ] Test `acquireLock` : premier appel → lockId, deuxième appel sur même clé → null
- [ ] Test `releaseLock` : libère si lockId correct, no-op si lockId incorrect

---

## PHASE 4 — payment-service

### 4.1 Initialisation

- [ ] `payment-service/package.json` : dependencies `express`, `express-rate-limit`, `zod`, `pg`, `amqplib`
- [ ] `payment-service/Dockerfile` (EXPOSE 3005)
- [ ] `payment-service/.dockerignore`

### 4.2 Base de données

Fichier : `payment-service/src/db.js`

- [ ] Même pattern primary/replica
- [ ] `initDb()` crée :
  ```sql
  CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      "ticketId" INTEGER NOT NULL,
      "userId" INTEGER NOT NULL,
      "eventId" INTEGER NOT NULL,
      "amountInCents" INTEGER NOT NULL,
      "cardLast4" VARCHAR(4),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      "transactionRef" VARCHAR(100) UNIQUE,
      "processedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
  );
  ```

### 4.3 Service paiement

Fichier : `payment-service/src/services/payment.service.js`

- [ ] `processPayment(data)` :
  - `const transactionRef = \`PAY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}\``
  - Extraire `cardLast4` du cardToken (ex: si token = "tok_visa_4242" → "4242", sinon "0000")
  - Simuler paiement : toujours succès (ou `Math.random() > (process.env.FAILURE_RATE || 0)`)
  - INSERT INTO payments → retourner le payment créé
- [ ] `getAllPayments(page, limit)` : SELECT replica, pagination
- [ ] `getPaymentById(id)` : SELECT replica, throw 404
- [ ] `getPaymentsByUser(userId, page, limit)` : SELECT replica WHERE userId
- [ ] `getPaymentByTicket(ticketId)` : SELECT replica WHERE ticketId

### 4.4 Consumer RabbitMQ — queue "payments" + Producer queue "notifications"

Fichier : `payment-service/src/services/queue.consumer.js`

- [ ] `startConsumer()` : même pattern que booking-service consumer
  - `channel.assertQueue('payments', { durable: true })`
  - `channel.prefetch(1)`
- [ ] Handler `processPayment(data, channel, msg)` :
  - `const { ticketId, ticketCode, userId, userEmail, eventId, amountInCents, cardToken } = data`
  - Appeler `payment.service.processPayment(...)` → enregistrer en DB
  - Si succès :
    - Appeler `PATCH ${BOOKING_URL}/tickets/${ticketId}/status` avec `{ status: 'confirmed', paymentId: payment.id }`
    - Publish vers "notifications" : `{ type: 'payment_success', userId, userEmail, ticketId, ticketCode, eventId, amountInCents }`
  - Si échec paiement :
    - UPDATE payment status = 'failed'
    - Appeler `PATCH ${BOOKING_URL}/tickets/${ticketId}/status` avec `{ status: 'cancelled' }`
    - Appeler `POST ${BOOKING_URL}/events/${eventId}/restore-capacity` avec `{ quantity: ticket.quantity }` (ou via PATCH sur l'event)
    - Publish vers "notifications" : `{ type: 'payment_failed', userId, userEmail, ticketId, eventId, reason: 'Paiement refusé' }`
  - `channel.ack(msg)` dans tous les cas métier
  - En cas d'erreur technique → `channel.nack(msg, false, true)`

Fichier : `payment-service/src/services/queue.producer.js`

- [ ] `connectNotificationQueue()` : connexion RabbitMQ, `assertQueue('notifications', { durable: true })`, retry automatique (setTimeout 5s)
- [ ] `publishNotification(data)` : `channel.sendToQueue('notifications', Buffer.from(JSON.stringify(data)), { persistent: true })`

### 4.5 Routes

Fichier : `payment-service/src/routes/payments.js`

- [ ] `GET /payments` : pagination
- [ ] `GET /payments/user/:userId` : paiements d'un user
- [ ] `GET /payments/ticket/:ticketId` : paiement d'un ticket
- [ ] `GET /payments/:id` : détail

### 4.6 App Express + index.js

- [ ] `payment-service/src/app.js` : rate limiter, routes
- [ ] `payment-service/index.js` : `await initDb()`, `app.listen(PORT)`, `startConsumer()`, `connectNotificationQueue()`

### 4.7 Backup de la DB payments

Fichier : `payment-service/backup.sh` (optionnel, monté dans docker-compose)

- [ ] Script shell : boucle `while true; do pg_dump ... > /backups/payment_$(date +%Y%m%d_%H%M%S).sql; sleep 3600; done`
- [ ] Ajouter service `payment-db-backup` dans docker-compose avec volume `./backups:/backups`

### 4.8 Tests unitaires

- [ ] Test `processPayment` : retourne un payment avec transactionRef et cardLast4
- [ ] Test `getPaymentsByUser` : retourne uniquement les paiements du user concerné

---

## PHASE 5 — notification-service

### 5.1 Initialisation

- [ ] `notification-service/package.json` : dependencies `express`, `express-rate-limit`, `amqplib`, `pg`
- [ ] `notification-service/Dockerfile` (EXPOSE 3002)
- [ ] `notification-service/.dockerignore`

### 5.2 Base de données

Fichier : `notification-service/src/db.js`

- [ ] Même pattern primary/replica
- [ ] `initDb()` crée :
  ```sql
  CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'email',
      recipient VARCHAR(255),
      subject VARCHAR(255),
      body TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'sent',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
  );
  ```

### 5.3 Service notification

Fichier : `notification-service/src/services/notification.service.js`

- [ ] `sendNotification(data)` :
  - Composer le contenu selon `data.type` :
    - `payment_success` : subject "Votre billet est confirmé !", body "Billet #${ticketCode}, ${quantity} place(s), total : ${amount/100}€"
    - `payment_failed` : subject "Échec du paiement", body "Votre paiement pour l'événement #${eventId} a échoué. Raison : ${reason}"
    - `booking_failed` : subject "Réservation impossible", body "Impossible de réserver : ${reason}"
  - Afficher dans les logs (format encadré, style BigBank) :
    ```
    ================================
    NOTIFICATION SERVICE
    Date     : {timestamp}
    Type     : {type}
    Pour     : {userEmail}
    Sujet    : {subject}
    Corps    : {body}
    ================================
    ```
  - INSERT INTO notifications (userId, type, channel, recipient, subject, body)
  - Retourner la notification créée
- [ ] `getNotificationsByUser(userId, page, limit)` : SELECT replica

### 5.4 Consumer RabbitMQ — queue "notifications"

Fichier : `notification-service/src/services/queue.consumer.js`

- [ ] Même pattern que BigBank (`.bigbank-correct/notification-service/src/services/queue.consumer.js`)
- [ ] `channel.assertQueue('notifications', { durable: true })`
- [ ] `channel.prefetch(1)`
- [ ] Appeler `sendNotification(data)` pour chaque message
- [ ] `channel.ack(msg)` après traitement
- [ ] En cas d'erreur : log + `channel.ack(msg)` quand même (notification = best effort)

### 5.5 Routes

Fichier : `notification-service/src/routes/notifications.js`

- [ ] `GET /notifications` : list pagination (admin)
- [ ] `GET /notifications/user/:userId` : notifications d'un user

### 5.6 App Express + index.js

- [ ] `notification-service/src/app.js` : rate limiter, routes
- [ ] `notification-service/index.js` : `await initDb()`, `app.listen(PORT)`, `startNotificationConsumer()`

---

## PHASE 6 — api-gateway

### 6.1 Initialisation

- [ ] `api-gateway/package.json` : dependencies `express`, `cors`, `express-rate-limit`, `amqplib`, `zod`, `jsonwebtoken`, `swagger-jsdoc`, `swagger-ui-express`
- [ ] `api-gateway/Dockerfile` (EXPOSE 3000)
- [ ] `api-gateway/.dockerignore`

### 6.2 Middleware JWT

Fichier : `api-gateway/src/middleware/auth.middleware.js`

- [ ] `authenticate(req, res, next)` :
  - Extraire token du header `Authorization: Bearer <token>`
  - Si absent → `res.status(401).json({ error: 'Token manquant' })`
  - `jwt.verify(token, process.env.JWT_SECRET)` → attacher à `req.user`
  - Si erreur JWT → `res.status(401).json({ error: 'Token invalide ou expiré' })`
- [ ] `authorize(...roles)` :
  - Retourner un middleware qui vérifie `roles.includes(req.user.role)`
  - Si non autorisé → `res.status(403).json({ error: 'Accès interdit' })`

### 6.3 Service proxy HTTP

Fichier : `api-gateway/src/services/proxy.service.js`

- [ ] `proxyRequest(targetUrl, method, body, headers)` :
  - `fetch(targetUrl, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })`
  - Si `!response.ok` → throw avec status et message de la réponse downstream
  - Retourner `response.json()`

### 6.4 Service RabbitMQ (Producer bookings)

Fichier : `api-gateway/src/services/queue.service.js`

- [ ] Copier le pattern de `.bigbank-correct/bigbank/src/services/queue.service.js`
- [ ] `connectQueue()` : connexion RabbitMQ, assertQueue `bookings` durable, retry 5s
- [ ] `publishBooking(data)` : `channel.sendToQueue('bookings', Buffer.from(JSON.stringify(data)), { persistent: true })`

### 6.5 Schémas Zod de la gateway

Fichier : `api-gateway/src/schemas/booking.schema.js`

- [ ] `createBookingSchema` : `eventId` (int positif), `quantity` (int, min 1, max 10), `cardToken` (string min 1)

### 6.6 Routes

Fichier : `api-gateway/src/routes/auth.js`

- [ ] `POST /auth/register` → proxy vers `AUTH_URL/auth/register`
- [ ] `POST /auth/login` → proxy vers `AUTH_URL/auth/login`

Fichier : `api-gateway/src/routes/users.js`

- [ ] `GET /users/me` → `authenticate` → proxy `AUTH_URL/users/me` avec header `X-User-Id: req.user.id`
- [ ] `GET /users` → `authenticate`, `authorize('admin')` → proxy `AUTH_URL/users`
- [ ] `GET /users/:id` → `authenticate` → proxy `AUTH_URL/users/:id`
- [ ] `PUT /users/:id` → `authenticate` → proxy `AUTH_URL/users/:id` avec body
- [ ] `DELETE /users/:id` → `authenticate`, `authorize('admin')` → proxy `AUTH_URL/users/:id`

Fichier : `api-gateway/src/routes/events.js`

- [ ] `GET /events` → proxy `BOOKING_URL/events` (pas d'auth)
- [ ] `GET /events/:id` → proxy `BOOKING_URL/events/:id` (pas d'auth)
- [ ] `POST /events` → `authenticate`, `authorize('admin', 'operator')` → proxy avec header `X-User-Id`
- [ ] `PUT /events/:id` → `authenticate`, `authorize('admin', 'operator')` → proxy
- [ ] `DELETE /events/:id` → `authenticate`, `authorize('admin', 'operator')` → proxy

Fichier : `api-gateway/src/routes/bookings.js`

- [ ] `POST /bookings` → `authenticate`, `authorize('user', 'operator', 'admin')` :
  - Parse `createBookingSchema`
  - `publishBooking({ ...data, userId: req.user.id, userEmail: req.user.email })`
  - `res.status(202).json({ message: 'Réservation en cours de traitement', data: { eventId: data.eventId, quantity: data.quantity } })`
- [ ] `GET /bookings/me` → `authenticate` → proxy `BOOKING_URL/tickets/user/${req.user.id}`
- [ ] `GET /bookings/:id` → `authenticate` → proxy `BOOKING_URL/tickets/:id`

Fichier : `api-gateway/src/routes/payments.js`

- [ ] `GET /payments` → `authenticate`, `authorize('admin')` → proxy `PAYMENT_URL/payments`
- [ ] `GET /payments/me` → `authenticate` → proxy `PAYMENT_URL/payments/user/${req.user.id}`
- [ ] `GET /payments/:id` → `authenticate` → proxy `PAYMENT_URL/payments/:id`

Fichier : `api-gateway/src/routes/admin.js`

- [ ] `GET /admin/overview` → `authenticate`, `authorize('admin')` :
  - Appeler en parallèle (`Promise.all`) :
    - `proxy(AUTH_URL/users)`
    - `proxy(BOOKING_URL/events)`
    - `proxy(BOOKING_URL/tickets)`
    - `proxy(PAYMENT_URL/payments)`
  - Retourner `{ users, events, tickets, payments }`

### 6.7 Swagger / OpenAPI

Fichier : `api-gateway/src/swagger.js`

- [ ] Configurer `swagger-jsdoc` avec OpenAPI 3.0.0
  - `info.title`: "4WEBD Ticket API"
  - `info.version`: "1.0.0"
  - `servers`: `[{ url: 'http://localhost:3030' }]`
  - `components.securitySchemes.bearerAuth`
  - `apis`: `['./src/routes/*.js']`
- [ ] Annoter chaque route avec JSDoc OpenAPI (au minimum les routes principales)

### 6.8 App Express + index.js

Fichier : `api-gateway/src/app.js`

- [ ] `cors({ origin: '*' })`
- [ ] `express.json()`
- [ ] Rate limiter : `windowMs: 60000`, `max: 50`
- [ ] Monter les routes
- [ ] Monter Swagger UI : `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec))`
- [ ] `connectQueue()` au démarrage

Fichier : `api-gateway/index.js`

- [ ] `app.listen(PORT)` — pas de `initDb()` (gateway sans DB)

### 6.9 Tests unitaires

Fichier : `api-gateway/src/middleware/auth.middleware.test.js`

- [ ] Test `authenticate` : token valide → `req.user` attaché, token absent → 401, token invalide → 401, token expiré → 401
- [ ] Test `authorize` : role autorisé → next(), role non autorisé → 403

---

## PHASE 7 — Frontend

### 7.1 Structure

- [ ] `frontend/Dockerfile` : `FROM nginx:alpine`, copier `nginx.conf`, copier fichiers statiques, EXPOSE 80
- [ ] `frontend/nginx.conf` : copier depuis `.bigbank-correct/frontend/nginx.conf`

### 7.2 Pages HTML

Fichier : `frontend/index.html`

- [ ] Page d'accueil avec navigation : Connexion / Inscription / Événements / Mes billets
- [ ] Section Inscription : formulaire (firstname, lastname, email, password, phone)
- [ ] Section Connexion : formulaire (email, password)
- [ ] Section Événements : liste des événements avec bouton "Acheter" sur chaque
- [ ] Modal achat : champ quantité + champ numéro de carte (simulé), bouton Confirmer
- [ ] Section Mes billets : liste des billets de l'utilisateur connecté
- [ ] Affichage du statut : message de confirmation ou d'erreur après achat (polling ou simple message "en cours")

Fichier : `frontend/js/app.js`

- [ ] Constante `API_URL = 'http://localhost:3030'`
- [ ] Gestion du token JWT : stocker dans `localStorage`, l'inclure dans toutes les requêtes authentifiées
- [ ] Fonction `register(data)` : `POST /auth/register`
- [ ] Fonction `login(data)` : `POST /auth/login` → stocker token
- [ ] Fonction `logout()` : supprimer token, rediriger
- [ ] Fonction `getEvents()` : `GET /events` → afficher liste
- [ ] Fonction `buyTickets(eventId, quantity, cardToken)` : `POST /bookings` → afficher message 202
- [ ] Fonction `getMyTickets()` : `GET /bookings/me` → afficher liste avec ticketCode
- [ ] Gestion des erreurs : afficher messages d'erreur de l'API

Fichier : `frontend/css/style.css`

- [ ] Style minimal : layout flex, cards pour événements/billets, formulaires centrés

---

## PHASE 8 — Fichiers transversaux

### 8.1 requests.http (tests manuels)

Fichier : `requests.http` à la racine

- [ ] Section "Auth" :
  - `POST /auth/register` (user normal)
  - `POST /auth/register` (operator)
  - `POST /auth/login` → capturer le token
- [ ] Section "Events" :
  - `POST /events` (avec token operator)
  - `GET /events`
  - `GET /events/:id`
  - `PUT /events/:id`
- [ ] Section "Bookings" :
  - `POST /bookings` (avec token user) → retourne 202
  - `GET /bookings/me`
  - `GET /bookings/:id`
- [ ] Section "Payments" :
  - `GET /payments` (avec token admin)
  - `GET /payments/me`
- [ ] Section "Admin" :
  - `GET /admin/overview`
- [ ] Section "Test survente" :
  - Créer event avec maxCapacity = 2
  - Acheter 2 billets → success
  - Acheter 1 billet de plus → booking_failed notification dans les logs

### 8.2 README.md final

- [ ] Section "Architecture" : description des 5 zones avec le schéma ASCII
- [ ] Section "Technologies" : tableau stack technique
- [ ] Section "Démarrage rapide" : `docker compose up --build`, liste des URLs exposées
- [ ] Section "Load Balancer" : expliquer la configuration Nginx round-robin, pourquoi LB, comment le tester (plusieurs requêtes → logs sur instances différentes)
- [ ] Section "Anti-survente" : expliquer Redis distributed lock (pourquoi, comment)
- [ ] Section "Flux d'achat" : diagramme séquentiel du processus async
- [ ] Section "Rôles et permissions" : tableau admin/operator/user avec leurs droits
- [ ] Section "Tests" : `npm test` dans chaque service, comment lancer les tests HTTP

---

## PHASE 9 — Vérification finale

### 9.1 Tests de bout en bout

- [ ] `docker compose up --build` → tous les conteneurs démarrent sans erreur
- [ ] Vérifier les logs de chaque service : "Service démarré sur port X"
- [ ] `GET http://localhost:3030/api-docs` → Swagger UI accessible
- [ ] Scénario 1 — Inscription et connexion :
  - `POST /auth/register` → 201 avec user et token
  - `POST /auth/login` → 200 avec token
  - `GET /auth/login` avec mauvais password → 401
- [ ] Scénario 2 — Création d'événement :
  - Créer un account operator (role: 'operator')
  - `POST /events` sans token → 401
  - `POST /events` avec token user → 403
  - `POST /events` avec token operator → 201
- [ ] Scénario 3 — Achat de billets (flux complet) :
  - `POST /bookings` → 202
  - Attendre 2-3 secondes, vérifier les logs : booking consumer, payment consumer, notification consumer
  - `GET /bookings/me` → ticket avec status 'confirmed' et ticketCode
- [ ] Scénario 4 — Prévention de survente :
  - Créer event avec `maxCapacity = 1`
  - `POST /bookings quantity: 1` → 202 → confirmé
  - `POST /bookings quantity: 1` → 202 → notification "booking_failed" dans les logs
  - `GET /events/:id` → `availableTickets: 0`, `status: 'sold_out'`
- [ ] Scénario 5 — Admin :
  - `GET /admin/overview` → données de tous les services
- [ ] Vérifier `GET http://localhost:15672` → RabbitMQ Management UI, queues visibles
- [ ] Vérifier que `docker compose down` puis `docker compose up` recharge bien les données PostgreSQL (volumes persistants)

---

## Récapitulatif des ports

| Port | Service |
|------|---------|
| **3030** | gateway-lb ← **point d'entrée principal** |
| 3000 | api-gateway (interne) |
| 3010 | auth-lb |
| 3004 | auth-service (interne) |
| 3020 | booking-lb |
| 3003 | booking-service (interne) |
| 3005 | payment-service |
| 3002 | notification-service |
| **8080** | frontend |
| 5432 | PostgreSQL primary |
| 5433 | PostgreSQL replica |
| 5672 | RabbitMQ AMQP |
| **15672** | RabbitMQ Management UI |
| 6379 | Redis |

---

## Fichiers de référence BigBank à copier/adapter

| Fichier source | Destination | Modifications |
|----------------|-------------|---------------|
| `.bigbank-correct/account-service/src/db.js` | Chaque service `/src/db.js` | Changer les tables, user 'bigbank' → 'ticket' |
| `.bigbank-correct/transaction-service/src/services/queue.consumer.js` | `booking-service`, `payment-service`, `notification-service` consumers | Adapter la logique métier |
| `.bigbank-correct/bigbank/src/services/queue.service.js` | `api-gateway/src/services/queue.service.js` | Changer le nom de queue |
| `.bigbank-correct/docker-compose.yml` | `docker-compose.yml` | Adapter tous les services |
| `.bigbank-correct/db/init-replica.sh` | `db/init-replica.sh` | Remplacer 'bigbank' → 'ticket' |
| `.bigbank-correct/db-replica/` | `db-replica/` | Remplacer 'bigbank' → 'ticket' |
| `.bigbank-correct/bigbank-lb/nginx.conf` | `gateway-lb/nginx.conf` | Adapter noms upstream et port |
| `.bigbank-correct/frontend/nginx.conf` | `frontend/nginx.conf` | Aucune modification |
