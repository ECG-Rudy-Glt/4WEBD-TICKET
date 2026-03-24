# MEGA FICHE - Architecture Microservices BigBank

## 1. VUE D'ENSEMBLE

Projet bancaire fictif "BigBank" en **architecture microservices** avec :

- **6 services applicatifs** (Node.js/Express)
- **3 load balancers** (Nginx)
- **1 frontend** statique (HTML/CSS/JS servi par Nginx)
- **1 base de données** PostgreSQL avec replica
- **1 message broker** RabbitMQ
- Le tout orchestré par **Docker Compose**

### Schéma d'architecture

```
                        Frontend (port 8080)
                             |
                        bigbank-lb (Nginx :3030)
                        /              \
                  bigbank-1          bigbank-2    (API Gateway, :3000)
                   /      \              |
            user-lb      account-lb     RabbitMQ (:5672/:15672)
           (Nginx:3010)  (Nginx:3020)    /         \
           /       \      /       \   queue         queue
     user-svc-1  user-svc-2  acc-svc-1  acc-svc-2  "transactions"  "notifications"
     (:3004)     (:3004)     (:3003)    (:3003)        |                |
                              |           |      transaction-svc   notification-svc
                              db (PG :5432)        (:3005)           (:3002)
                              |
                           db-replica (:5433)

    bigbank-admin (:3001) -- appelle user-lb, account-lb, transaction-service directement
```

### Volumes Docker

- `pgdata` → données PostgreSQL primary
- `pgreplica` → données PostgreSQL replica
- `rabbitmqdata` → données RabbitMQ (persistance des messages)

---

## 2. STACK TECHNIQUE

| Composant | Techno | Version |
|-----------|--------|---------|
| Runtime | Node.js | 20-alpine |
| Framework | Express | 5.2.1 |
| Validation | Zod | 4.3.6 |
| Hash passwords | bcrypt | 6.0.0 |
| Rate limiting | express-rate-limit | 8.2.1 |
| Message broker | RabbitMQ (amqplib) | 0.10.9 |
| Base de données | PostgreSQL (pg) | 8.18.0 |
| Load balancer | Nginx | alpine |
| CORS | cors | 2.8.6 |
| Modules | ESM (`"type": "module"`) | - |

---

## 3. SERVICES DÉTAILLÉS

### 3.1 `bigbank` (API Gateway) — Port 3000

**Rôle :** Point d'entrée principal. Ne stocke rien localement pour users/accounts, fait du proxy HTTP vers les microservices. Pour les transactions, il **publie dans RabbitMQ** (queue `transactions`) au lieu d'appeler directement le transaction-service.

**Structure :**

```
bigbank/
├── index.js              # Point d'entrée, app.listen(PORT)
├── package.json
├── Dockerfile
├── .dockerignore
└── src/
    ├── app.js            # Express + CORS + rate-limit + routes + connectQueue()
    ├── routes/
    │   ├── users.js      # CRUD users (proxy vers user-service via HTTP)
    │   ├── accounts.js   # CRUD accounts (proxy vers account-service via HTTP)
    │   └── transactions.js  # POST = publish RabbitMQ, GET = proxy HTTP
    ├── services/
    │   ├── user.service.js       # fetch() vers USER_URL (user-lb)
    │   ├── account.service.js    # fetch() vers ACCOUNT_URL (account-lb)
    │   ├── transaction.service.js # logique + appels account + notification
    │   ├── notification.service.js # fetch() vers NOTIFICATION_URL
    │   └── queue.service.js      # connexion RabbitMQ + publishTransaction()
    └── schemas/
        ├── user.schema.js
        ├── account.schema.js
        └── transaction.schema.js
```

**Dépendances :** express, cors, express-rate-limit, amqplib, bcrypt, zod

**Routes :**

| Méthode | Route | Action |
|---------|-------|--------|
| POST | `/users` | Crée un user (proxy user-service) |
| GET | `/users` | Liste users paginés (proxy) |
| GET | `/users/:id` | Détail user (proxy) |
| PUT | `/users/:id` | Update user (proxy) |
| DELETE | `/users/:id` | Supprime user (proxy) |
| POST | `/users/:userId/accounts` | Crée un compte (proxy account-service) |
| GET | `/users/:userId/accounts` | Liste comptes d'un user (proxy) |
| GET | `/users/:userId/accounts/:id` | Détail compte (proxy) |
| PUT | `/users/:userId/accounts/:id` | Update compte (proxy) |
| DELETE | `/users/:userId/accounts/:id` | Supprime compte (proxy) |
| POST | `/transactions` | **Publie dans queue RabbitMQ** → retourne 202 |
| GET | `/transactions` | Liste transactions paginées (in-memory) |
| GET | `/transactions/account/:accountId` | Transactions d'un compte |

**Code clé — `app.js` :**

```javascript
import express from 'express';
import userRoutes from './routes/users.js';
import accountRoutes from './routes/accounts.js';
import transactionRoutes from './routes/transactions.js';
import rateLimit from "express-rate-limit";
import cors from 'cors';
import { connectQueue } from './services/queue.service.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: "Trop de requêtes, réessayez dans une minute" }
});
app.use(limiter);

app.use('/users', userRoutes);
app.use('/users/:userId/accounts', accountRoutes);
app.use('/transactions', transactionRoutes);

app.get('/', (req, res) => {
    res.json({ message: "BigBank API v1.0" });
});

connectQueue();
export default app;
```

**Code clé — Transactions asynchrones via RabbitMQ :**

```javascript
// routes/transactions.js
router.post('/', (req, res) => {
    const data = createTransactionSchema.parse(req.body);
    publishTransaction(data);  // envoie dans la queue, ne traite PAS
    res.status(202).json({     // 202 = Accepted (pas 201)
        message: "Transaction en cours de traitement",
        data
    });
});
```

```javascript
// services/queue.service.js
import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest@localhost:5672';
const QUEUE_NAME = 'transactions';
let channel = null;

export async function connectQueue() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
    } catch (err) {
        console.error('Erreur connexion RabbitMQ:', err.message);
        setTimeout(connectQueue, 5000);
    }
}

export function publishTransaction(data) {
    if (!channel) throw new Error('RabbitMQ non connecté');
    channel.sendToQueue(
        QUEUE_NAME,
        Buffer.from(JSON.stringify(data)),
        { persistent: true }
    );
}
```

**Code clé — Proxy HTTP vers user-service :**

```javascript
// services/user.service.js
const USER_URL = process.env.USER_URL || 'http://localhost:3004/users';

export async function createUser(data) {
    const response = await fetch(USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function getAllUsers() {
    const response = await fetch(`${USER_URL}?role=customer`);
    const result = await response.json();
    return result.data || result;
}
```

**Code clé — Proxy HTTP vers account-service :**

```javascript
// services/account.service.js
const ACCOUNT_URL = process.env.ACCOUNT_URL || 'http://localhost:3003/accounts';

export async function createAccount(userId, data) {
    const response = await fetch(ACCOUNT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data })
    });
    if (!response.ok) {
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function updateBalance(accountId, amount) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    });
    return response.json();
}
```

**Code clé — Route accounts (mergeParams) :**

```javascript
// routes/accounts.js
import { Router } from 'express';
const router = Router({ mergeParams: true }); // permet d'accéder à req.params.userId

router.post('/', async (req, res) => {
    const data = createAccountSchema.parse(req.body);
    const account = await accountService.createAccount(parseInt(req.params.userId), data);
    res.status(201).json(account);
});
```

---

### 3.2 `user-service` — Port 3004

**Rôle :** CRUD des utilisateurs. Stockage **in-memory** (tableau JS). Hashage des mots de passe avec bcrypt.

**Dépendances :** express, express-rate-limit, bcrypt, zod

**Structure :**

```
user-service/
├── index.js
├── package.json
├── Dockerfile
├── .dockerignore
└── src/
    ├── app.js
    ├── routes/users.js
    ├── services/user.service.js
    └── schemas/user.schema.js
```

**Particularités :**

- Filtre par `role` (query param `?role=customer`)
- Fonction `sanitize()` qui retire le password avant de renvoyer le user
- Unicité de l'email vérifiée manuellement
- ID auto-incrémenté avec `nextId++`
- Rôles : `"customer"` (default) ou `"employee"`

**Schéma Zod :**

```javascript
export const createUserSchema = z.object({
    firstname: z.string().min(1, "Le prénom est obligatoire"),
    lastname: z.string().min(1, "Le nom est obligatoire"),
    email: z.email("Email invalide"),
    phone: z.string().optional(),
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
    role: z.enum(["customer", "employee"], { message: "Role invalide" }).default("customer")
});

export const updateUserSchema = z.object({
    firstname: z.string().min(1).optional(),
    lastname: z.string().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
    password: z.string().min(8).optional()
});
```

**Code complet — `user.service.js` :**

```javascript
import bcrypt from 'bcrypt';

let users = [];
let nextId = 1;

export async function createUser(data) {
    const existing = users.find(u => u.email === data.email);
    if (existing) {
        throw { status: 409, message: "Cet email est déjà utilisé" };
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = {
        id: nextId++,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        phone: data.phone || null,
        role: data.role || "customer",
        password: hashedPassword
    };
    users.push(user);
    return sanitize(user);
}

export function getAllUsers(role) {
    let result = users;
    if (role) {
        result = users.filter(u => u.role === role);
    }
    return result.map(sanitize);
}

export function getUserById(id) {
    const user = users.find(u => u.id === id);
    if (!user) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    return sanitize(user);
}

export async function updateUser(id, data) {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    if (data.email && data.email !== users[index].email) {
        const emailTaken = users.find(u => u.email === data.email);
        if (emailTaken) {
            throw { status: 409, message: "Cet email est déjà utilisé" };
        }
    }
    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }
    users[index] = { ...users[index], ...data };
    return sanitize(users[index]);
}

export function deleteUser(id) {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    users.splice(index, 1);
}

function sanitize(user) {
    const { password, ...safe } = user;
    return safe;
}
```

**Routes users (dans le user-service) :**

```javascript
import { Router } from 'express';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';
import * as userService from '../services/user.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const data = createUserSchema.parse(req.body);
        const user = await userService.createUser(data);
        res.status(201).json(user);
    } catch (err) {
        if (err.errors) return res.status(400).json({ errors: err.errors });
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role || null;
    const start = (page - 1) * limit;
    const allUsers = userService.getAllUsers(role);
    const paginatedUsers = allUsers.slice(start, start + limit);
    res.json({
        data: paginatedUsers,
        pagination: { page, limit, total: allUsers.length, totalPages: Math.ceil(allUsers.length / limit) }
    });
});

router.get('/:id', (req, res) => {
    try {
        const user = userService.getUserById(parseInt(req.params.id));
        res.json(user);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

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

router.delete('/:id', (req, res) => {
    try {
        userService.deleteUser(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

export default router;
```

---

### 3.3 `account-service` — Port 3003

**Rôle :** CRUD des comptes bancaires. Stockage **PostgreSQL** avec support replica (lecture sur replica, écriture sur primary).

**Dépendances :** express, express-rate-limit, pg, zod

**Structure :**

```
account-service/
├── index.js
├── package.json
├── Dockerfile
├── .gitignore
└── src/
    ├── app.js
    ├── db.js                   # Connexion PostgreSQL primary + replica
    ├── routes/accounts.js
    ├── services/account.service.js
    └── schemas/account.schema.js
```

**Particularités :**

- **2 pools PostgreSQL** : `primaryPool` (écriture) et `replicaPool` (lecture)
- Balance initiale de **100** à la création
- Route spéciale `PATCH /:id/balance` pour modifier le solde
- Init de la table au démarrage avec `CREATE TABLE IF NOT EXISTS`

**Code clé — `db.js` (connexion PostgreSQL) :**

```javascript
import pg from 'pg';

const { Pool } = pg;

const primaryUrl = process.env.DATABASE_URL || 'postgresql://bigbank:bigbank@localhost:5432/bigbank';
const primaryPool = new Pool({ connectionString: primaryUrl });

const replicaUrl = process.env.DATABASE_REPLICA_URL || primaryUrl;
const replicaPool = new Pool({ connectionString: replicaUrl });

export async function initDb() {
    const client = await primaryPool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id SERIAL PRIMARY KEY,
                "userId" INTEGER NOT NULL,
                label VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                balance DECIMAL(12,2) DEFAULT 100,
                "createdAt" TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch (err) {
        if (err.code !== '23505') throw err;
    } finally {
        client.release();
    }
}

export default primaryPool;
export { replicaPool };
```

**Code clé — `index.js` (init DB avant listen) :**

```javascript
import app from './src/app.js';
import { initDb } from './src/db.js';

const PORT = process.env.PORT || 3003;

async function start() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`Account Service est démarré sur http://localhost:${PORT}`);
    });
}
start();
```

**Code complet — `account.service.js` :**

```javascript
import pool from '../db.js';
import { replicaPool } from '../db.js';

export async function createAccount(data) {
    const res = await pool.query(
        'INSERT INTO accounts ("userId", label, type, balance) VALUES ($1, $2, $3, 100) RETURNING *',
        [data.userId, data.label, data.type]
    );
    const row = res.rows[0];
    return {
        id: row.id,
        userId: row.userId,
        label: row.label,
        type: row.type,
        balance: parseFloat(row.balance),
        createdAt: new Date().toISOString?.() || row.createdAt
    };
}

// LECTURE sur replica
export async function getAccountsByUser(userId) {
    const res = await replicaPool.query('SELECT * FROM accounts WHERE "userId" = $1 ORDER BY id', [userId]);
    return res.rows.map(rowToAccount);
}

// LECTURE sur replica
export async function getAccountById(accountId) {
    const res = await replicaPool.query('SELECT * FROM accounts WHERE id = $1', [accountId]);
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
    return rowToAccount(res.rows[0]);
}

// ECRITURE sur primary
export async function updateAccount(accountId, data) {
    const res = await pool.query(
        'UPDATE accounts SET label = COALESCE($2, label) WHERE id = $1 RETURNING *',
        [accountId, data.label]
    );
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
    return rowToAccount(res.rows[0]);
}

export async function deleteAccount(accountId) {
    const res = await pool.query('DELETE FROM accounts WHERE id = $1 RETURNING id', [accountId]);
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
}

export async function updateBalance(accountId, amount) {
    const res = await pool.query(
        'UPDATE accounts SET balance = balance + $2 WHERE id = $1 RETURNING *',
        [accountId, amount]
    );
    if (res.rows.length === 0) throw { status: 404, message: 'Compte non trouvé' };
    return rowToAccount(res.rows[0]);
}

function rowToAccount(row) {
    return {
        id: row.id,
        userId: row.userId,
        label: row.label,
        type: row.type,
        balance: parseFloat(row.balance),
        createdAt: row.createdAt?.toISOString?.() || row.createdAt
    };
}
```

**Schéma Zod :**

```javascript
export const createAccountSchema = z.object({
    userId: z.number().int().positive("userId invalide"),
    label: z.string().min(1, "Le nom du compte est obligatoire"),
    type: z.enum(["checking", "savings"], { message: "Type invalide (checking ou savings)" })
});

export const updateAccountSchema = z.object({
    label: z.string().min(1).optional()
});
```

**Routes :**

| Méthode | Route | Action |
|---------|-------|--------|
| POST | `/accounts` | Crée un compte |
| GET | `/accounts/user/:userId` | Comptes d'un user |
| GET | `/accounts/:id` | Détail |
| PUT | `/accounts/:id` | Update label |
| DELETE | `/accounts/:id` | Supprime |
| PATCH | `/accounts/:id/balance` | Modifie le solde (+/-) |

---

### 3.4 `transaction-service` — Port 3005

**Rôle :** **Consommateur** de la queue RabbitMQ `transactions`. Traite les transactions, met à jour les soldes via account-service, puis **publie** dans la queue `notifications`.

**Dépendances :** express, express-rate-limit, amqplib, zod

**Structure :**

```
transaction-service/
├── index.js
├── package.json
├── Dockerfile
├── .dockerignore
└── src/
    ├── app.js
    ├── routes/transactions.js
    ├── services/
    │   ├── transaction.service.js   # Logique + producer notifications
    │   └── queue.consumer.js        # Consumer queue transactions
    └── schemas/transaction.schema.js
```

**Double rôle RabbitMQ :**

1. **Consumer** de la queue `transactions` (reçoit les messages de bigbank)
2. **Producer** dans la queue `notifications` (envoie vers notification-service)

**Code clé — `index.js` (démarre le consumer au boot) :**

```javascript
import app from './src/app.js';
import { startConsumer } from './src/services/queue.consumer.js';

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
    console.log(`Transaction Service démarré sur http://localhost:${PORT}`);
});

startConsumer();
```

**Code complet — `queue.consumer.js` (Consumer RabbitMQ) :**

```javascript
import amqp from 'amqplib';
import { createTransaction } from './transaction.service.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'transactions';

export async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        channel.prefetch(1);  // traite 1 message à la fois

        console.log(`En attente de messages sur la queue "${QUEUE_NAME}"...`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg) {
                const data = JSON.parse(msg.content.toString());
                console.log('Transaction reçue:', data);
                try {
                    const result = await createTransaction(data);
                    console.log('Transaction traitée avec succès:', result.id);
                    channel.ack(msg);      // succès = acquittement
                } catch (err) {
                    console.error('Erreur traitement transaction:', err.message);
                    channel.nack(msg, false, true);  // échec = requeue
                }
            }
        });
    } catch (err) {
        console.error('Erreur connexion RabbitMQ consumer:', err.message);
        setTimeout(startConsumer, 5000);  // retry dans 5s
    }
}
```

**Code complet — `transaction.service.js` :**

```javascript
import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const NOTIFICATION_QUEUE = 'notifications';
let notifChannel = null;

const ACCOUNT_URL = process.env.ACCOUNT_URL || 'http://localhost:3003/accounts';

let transactions = [];
let nextId = 1;

export async function createTransaction(data) {
    const fromAccount = await getAccount(data.fromAccountId);
    const toAccount = await getAccount(data.toAccountId);

    if (data.fromAccountId === data.toAccountId) {
        throw { status: 400, message: "Impossible de transférer vers le même compte" };
    }
    if (fromAccount.balance < data.amount) {
        throw { status: 400, message: "Solde insuffisant" };
    }

    await updateBalance(data.fromAccountId, -data.amount);
    await updateBalance(data.toAccountId, data.amount);

    const transaction = {
        id: nextId++,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: data.amount,
        description: data.description || null,
        createdAt: new Date().toISOString()
    };

    transactions.push(transaction);
    await notifyTransfer(transaction, fromAccount, toAccount);
    return transaction;
}

export function getAllTransactions() {
    return transactions;
}

export function getTransactionsByAccount(accountId) {
    return transactions.filter(
        t => t.fromAccountId === accountId || t.toAccountId === accountId
    );
}

async function getAccount(accountId) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}`);
    if (!response.ok) {
        throw { status: 404, message: `Compte ${accountId} non trouvé` };
    }
    return response.json();
}

async function updateBalance(accountId, amount) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    });
    return response.json();
}

// Connexion à la queue notifications au démarrage
async function connectNotificationQueue() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        notifChannel = await connection.createChannel();
        await notifChannel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
    } catch (err) {
        console.error('Erreur connexion queue notifications:', err.message);
        setTimeout(connectNotificationQueue, 500);
    }
}
connectNotificationQueue();

// Publie la notification dans RabbitMQ
async function notifyTransfer(transaction, fromAccount, toAccount) {
    if (!notifChannel) {
        console.error('Queue notifications non connectée');
        return;
    }
    notifChannel.sendToQueue(
        NOTIFICATION_QUEUE,
        Buffer.from(JSON.stringify({
            fromAccount,
            toAccount,
            amount: transaction.amount,
            description: transaction.description
        })),
        { persistent: true }
    );
}
```

**Schéma Zod :**

```javascript
export const createTransactionSchema = z.object({
    fromAccountId: z.number().int().positive("ID compte source invalide"),
    toAccountId: z.number().int().positive("ID compte destination invalide"),
    amount: z.number().positive("Le montant doit être positif"),
    description: z.string().optional()
});
```

---

### 3.5 `notification-service` — Port 3002

**Rôle :** Reçoit les notifications (via RabbitMQ queue `notifications` OU via HTTP POST direct). Affiche les détails du virement dans les logs console.

**Dépendances :** express, amqplib

**Structure :**

```
notification-service/
├── index.js
├── package.json
├── Dockerfile
├── .gitignore
└── src/
    ├── app.js
    ├── routes/notify.js
    └── services/queue.consumer.js
```

**2 modes de réception :**

1. **HTTP** : route `POST /notify` (utilisé par bigbank directement pour les virements synchrones)
2. **RabbitMQ** : consumer sur queue `notifications` (utilisé quand les transactions passent par la queue)

**Code clé — `index.js` :**

```javascript
import app from './src/app.js';
import { startNotificationConsumer } from './src/services/queue.consumer.js';

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Notification Service démarré sur http://localhost:${PORT}`);
});

startNotificationConsumer();
```

**Code clé — Route HTTP `/notify` :**

```javascript
router.post('/', (req, res) => {
    const { fromAccount, toAccount, amount, description } = req.body;
    const timestamp = new Date().toLocaleString('fr-FR');

    console.log("======================================");
    console.log('NOTIFICATION SERVICE (port 3002)');
    console.log(`De       : Compte #${fromAccount.id} (${fromAccount.label})`);
    console.log(`Vers     : Compte #${toAccount.id} (${toAccount.label})`);
    console.log(`Montant  : ${amount} €`);
    console.log(`Desc.    : ${description || 'Aucune'}`);
    console.log("======================================");

    res.status(200).json({
        success: true,
        message: "Notification envoyée avec succès",
        timestamp
    });
});
```

**Code complet — Consumer RabbitMQ notifications :**

```javascript
import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'notifications';

export async function startNotificationConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        channel.prefetch(1);

        console.log(`En attente de notifications sur la queue "${QUEUE_NAME}"...`);

        channel.consume(QUEUE_NAME, (msg) => {
            if (msg) {
                const { fromAccount, toAccount, amount, description } =
                    JSON.parse(msg.content.toString());
                const timestamp = new Date().toLocaleString('fr-FR');

                console.log("=================================");
                console.log('NOTIFICATION SERVICE (via RabbitMQ)');
                console.log(`Date     : ${timestamp}`);
                console.log(`De       : Compte #${fromAccount.id} (${fromAccount.label})`);
                console.log(`Vers     : Compte #${toAccount.id} (${toAccount.label})`);
                console.log(`Montant  : ${amount} EUR`);
                console.log(`Desc.    : ${description || 'Aucune'}`);
                console.log("=================================");

                channel.ack(msg);
                console.log('Notification traitée et acquittée');
            }
        });
    } catch (err) {
        console.log('Erreur connexion RabbitMQ notification consumer:', err.message);
        setTimeout(startNotificationConsumer, 5000);
    }
}
```

---

### 3.6 `bigbank-admin` — Port 3001

**Rôle :** API d'administration. Agrégateur qui appelle les 3 services (user, account, transaction) et construit des vues combinées.

**Dépendances :** express (uniquement)

**Pas de rate-limit, pas de Zod** — c'est un service interne.

**Structure :**

```
bigbank-admin/
├── index.js
├── package.json
├── Dockerfile
├── .gitignore
├── requests.http
└── src/
    ├── app.js
    ├── routes/admin.js
    └── services/api.service.js
```

**Routes :**

| Méthode | Route | Action |
|---------|-------|--------|
| GET | `/admin/users` | Tous les users |
| GET | `/admin/users/:id` | User + ses comptes (agrégé) |
| GET | `/admin/transactions` | Toutes les transactions |
| GET | `/admin/overview` | Vue complète : tous users + leurs comptes + toutes transactions |

**Code clé — Agrégation (api.service.js) :**

```javascript
const USER_URL = process.env.USER_URL || 'http://localhost:3004/users';
const ACCOUNT_URL = process.env.ACCOUNT_URL || 'http://localhost:3003/accounts';
const TRANSACTION_URL = process.env.TRANSACTION_URL || 'http://localhost:3005/transactions';

async function callApi(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw { status: response.status, message: `Erreur API: ${response.statusText}` };
    }
    return response.json();
}

export async function getFullOverview() {
    const users = await getAllUsers();
    const overview = await Promise.all(
        users.map(async (user) => {
            const accounts = await getAccountsByUser(user.id);
            return { ...user, accounts };
        })
    );
    const transactions = await getAllTransactions();
    return { users: overview, transactions };
}
```

---

## 4. LOAD BALANCERS (Nginx)

3 load balancers identiques dans leur structure, algorithme **round-robin** (default Nginx) :

| LB | Port | Backend instances |
|----|------|-------------------|
| `bigbank-lb` | 3030 | bigbank-1:3000, bigbank-2:3000 |
| `user-lb` | 3010 | user-service-1:3004, user-service-2:3004 |
| `account-lb` | 3020 | account-service-1:3003, account-service-2:3003 |

**Pattern Nginx (identique pour les 3) :**

```nginx
upstream backend_name {
    server service-1:PORT;
    server service-2:PORT;
}

server {
    listen LB_PORT;

    location / {
        proxy_pass http://backend_name;
    }
}
```

**Dockerfile LB (identique pour les 3) :**

```dockerfile
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE PORT
```

---

## 5. BASE DE DONNÉES PostgreSQL

### Primary (db) — Port 5432

- Image : `postgres:16-alpine`
- Credentials : `bigbank` / `bigbank`
- Volume : `pgdata:/var/lib/postgresql/data`
- Healthcheck : `pg_isready -U bigbank`

**Script d'init (`db/init-replica.sh`) :**

```bash
#!/bin/sh
set -e

cat >> "$PGDATA/postgresql.conf" <<EOF
wal_level = replica
max_wal_senders = 3
hot_standby = on
EOF

echo "host replication replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator';
EOSQL
```

### Replica (db-replica) — Port 5433

- Image custom basée sur `postgres:16-alpine`
- Volume : `pgreplica:/var/lib/postgresql/data`

**Script de démarrage (`db-replica/start-replica.sh`) :**

```bash
#!/bin/sh
set -e

until pg_isready -h db -p 5432 -U bigbank; do
  echo "En attente du primary..."
  sleep 2
done

if [ ! -f "$PGDATA/pg_VERSION" ]; then
  echo "Initialisation du replica depuis le primary..."
  chown postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"
  gosu postgres pg_basebackup -h db -D "$PGDATA" -U replicator -Fp -Xs -P -R
fi

exec gosu postgres postgres
```

**Dockerfile db-replica :**

```dockerfile
FROM postgres:16-alpine
COPY start-replica.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start-replica.sh
CMD ["start-replica.sh"]
```

**Utilisation dans le code :** Les lectures (SELECT) passent par la replica, les écritures (INSERT/UPDATE/DELETE) par le primary.

---

## 6. RABBITMQ

- Image : `rabbitmq:3.11-management` (avec UI web)
- Ports : `5672` (AMQP), `15672` (Management UI)
- Credentials : `guest` / `guest`
- Healthcheck : `rabbitmq-diagnostics check_port_connectivity`
- Volume : `rabbitmqdata:/var/lib/rabbitmq` (persistance)

### Queues

| Queue | Producteur | Consommateur | Messages |
|-------|-----------|-------------|----------|
| `transactions` | bigbank (queue.service.js) | transaction-service (queue.consumer.js) | `{ fromAccountId, toAccountId, amount, description }` |
| `notifications` | transaction-service (transaction.service.js) | notification-service (queue.consumer.js) | `{ fromAccount, toAccount, amount, description }` |

### Flux complet d'une transaction

```
1. Client POST /transactions → bigbank-lb → bigbank
2. bigbank valide (Zod) → publie dans queue "transactions" → retourne 202
3. transaction-service consume le message depuis la queue "transactions"
4. transaction-service appelle account-service (GET comptes, PATCH balances)
5. transaction-service publie dans queue "notifications"
6. notification-service consume depuis la queue "notifications" et affiche dans les logs
```

### Persistance (Exercice 5)

Le volume `rabbitmqdata` garantit que les messages ne sont pas perdus si RabbitMQ est redémarré (`docker compose down`). Seul `docker compose down -v` détruit les données.

**Test de persistance :**

1. `docker stop <notification-service-container>`
2. Envoyer une transaction (le message reste dans la queue `notifications`)
3. Vérifier sur `http://localhost:15672` → Queues → 1 message "Ready"
4. `docker start <notification-service-container>`
5. Le message est automatiquement traité

---

## 7. FRONTEND

Frontend statique servi par Nginx sur le port **8080**.

**Structure :**

```
frontend/
├── index.html
├── css/style.css
├── js/app.js
├── Dockerfile
├── .dockerignore
└── nginx.conf
```

- Formulaire de virement entre comptes
- Appelle `http://localhost:3030` (bigbank-lb)
- Charge les comptes du user 1 (`GET /users/1/accounts`)
- Envoie les virements (`POST /transactions`)

**Nginx config frontend :**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /css/ {
        add_header Cache-Control "public, max-age=60";
    }

    location /js/ {
        add_header Cache-Control "public, max-age=60";
    }
}
```

**Dockerfile frontend :**

```dockerfile
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 8. DOCKER COMPOSE — Map des ports

| Service | Port exposé | Port interne |
|---------|-------------|-------------|
| frontend | 8080 | 80 |
| bigbank-lb | 3030 | 3030 |
| bigbank-admin | 3001 | 3001 |
| user-lb | 3010 | 3010 |
| account-lb | 3020 | 3020 |
| notification-service | 3002 | 3002 |
| transaction-service | 3005 | 3005 |
| db | 5432 | 5432 |
| db-replica | 5433 | 5432 |
| rabbitmq | 5672 + 15672 | 5672 + 15672 |

---

## 9. PATTERNS DE CODE RÉCURRENTS

### 9.1 Structure d'un service

```
service/
├── index.js           # Point d'entrée : import app, listen(PORT)
├── package.json       # "type": "module" (ESM)
├── Dockerfile         # node:20-alpine, npm ci --omit=dev
└── src/
    ├── app.js         # Express app : middleware + routes
    ├── routes/        # Router Express, validation Zod, try/catch
    ├── services/      # Logique métier ou appels HTTP externes
    └── schemas/       # Schémas Zod (create + update)
```

### 9.2 Gestion d'erreurs (pattern identique partout)

```javascript
router.post('/', async (req, res) => {
    try {
        const data = createSchema.parse(req.body);  // validation Zod
        const result = await service.create(data);
        res.status(201).json(result);
    } catch (err) {
        if (err.errors) {                            // erreur Zod
            return res.status(400).json({ errors: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message }); // erreur métier
    }
});
```

### 9.3 Erreurs métier (throw objet)

```javascript
throw { status: 404, message: "Utilisateur non trouvé" };
throw { status: 409, message: "Cet email est déjà utilisé" };
throw { status: 400, message: "Solde insuffisant" };
```

### 9.4 Pagination

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const start = (page - 1) * limit;
const paginated = allItems.slice(start, start + limit);

res.json({
    data: paginated,
    pagination: {
        page,
        limit,
        total: allItems.length,
        totalPages: Math.ceil(allItems.length / limit)
    }
});
```

### 9.5 Rate limiting

```javascript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 50,              // 50 requêtes max
    message: { error: "Trop de requêtes, réessayez dans une minute" }
});
app.use(limiter);
```

### 9.6 Appels HTTP inter-services (fetch natif Node 20)

```javascript
const URL = process.env.SERVICE_URL || 'http://localhost:PORT/path';

export async function create(data) {
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}
```

### 9.7 Reconnexion RabbitMQ automatique

```javascript
export async function connectQueue() {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
    } catch (err) {
        console.error('Erreur connexion RabbitMQ:', err.message);
        setTimeout(connectQueue, 5000);  // retry dans 5s
    }
}
```

### 9.8 Dockerfile (identique pour tous les services Node)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE PORT
CMD ["node", "index.js"]
```

### 9.9 Variables d'environnement

Toutes les URLs inter-services sont configurées via env vars avec fallback local :

```javascript
const USER_URL = process.env.USER_URL || 'http://localhost:3004/users';
const ACCOUNT_URL = process.env.ACCOUNT_URL || 'http://localhost:3003/accounts';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
```

---

## 10. COMMANDE DE LANCEMENT

```bash
docker compose up --build
```

**Ordre de démarrage (depends_on) :**

1. `db` (healthcheck pg_isready) → `db-replica`
2. `rabbitmq` (healthcheck check_port_connectivity)
3. `user-service-1/2`, `account-service-1/2` (depends on db)
4. `user-lb`, `account-lb` (depends on services)
5. `notification-service`, `transaction-service` (depends on rabbitmq)
6. `bigbank-1/2` (depends on LBs + notification + rabbitmq)
7. `bigbank-lb` (depends on bigbank instances)
8. `bigbank-admin` (depends on LBs + transaction-service)
9. `frontend` (depends on bigbank-lb)

---

## 11. REQUÊTES DE TEST

### Setup initial

```http
### Créer un utilisateur
POST http://localhost:3030/users
Content-Type: application/json

{
  "firstname": "Test",
  "lastname": "RabbitMQ",
  "email": "test@rabbitmq.com",
  "password": "password123"
}

### Créer compte A (checking)
POST http://localhost:3030/users/1/accounts
Content-Type: application/json

{
  "label": "Compte Courant",
  "type": "checking"
}

### Créer compte B (savings)
POST http://localhost:3030/users/1/accounts
Content-Type: application/json

{
  "label": "Compte Epargne",
  "type": "savings"
}
```

### Transaction via RabbitMQ

```http
POST http://localhost:3030/transactions
Content-Type: application/json

{
  "fromAccountId": 1,
  "toAccountId": 2,
  "amount": 25,
  "description": "Transfert via queue transactions"
}
```

### Vérifications

```http
GET http://localhost:3030/transactions
GET http://localhost:3030/users/1/accounts
GET http://localhost:3030/transactions/account/1
GET http://localhost:3001/admin/overview
```

### Management UI RabbitMQ

- URL : `http://localhost:15672`
- Login : `guest` / `guest`
- Onglet Queues : voir `transactions` et `notifications`
