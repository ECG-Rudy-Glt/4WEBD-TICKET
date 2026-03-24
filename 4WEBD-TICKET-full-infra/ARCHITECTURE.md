# Architecture — 4WEBD-TICKET

## Flux d'un achat de billet

```
Client HTTP
    │
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  COUCHE FRONTALE                        Port :80                     │
│                                                                      │
│   ┌──────────────┐       ┌──────────────┐                           │
│   │    nginx     │       │ nginx-replica│   Rate Limiting 10 req/s  │
│   │  (actif)     │       │  (standby)   │   Reverse Proxy /api/*    │
│   └──────┬───────┘       └──────────────┘   Static → frontend       │
│          │                                                           │
│   ┌──────┴───────┐       ┌──────────────┐                           │
│   │  frontend    │       │  frontend    │   SPA React/Vue           │
│   │  (actif)     │       │  -replica    │   servi par Nginx          │
│   └──────────────┘       └──────────────┘                           │
└──────────────────────────────┬───────────────────────────────────────┘
                               │  /api/*  →  strip /api  →  /
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  API GATEWAY (JWT + Routing)                                         │
│                                                                      │
│   ┌─────────────────┐       ┌─────────────────────┐                 │
│   │   api-gateway   │       │ api-gateway-replica │                 │
│   │  (actif)        │       │  (standby)          │                 │
│   │  JWT Validation │       │  JWT Validation     │                 │
│   │  Role-Based AC  │       │  Role-Based AC      │                 │
│   │  Rate Limiting  │       │  Rate Limiting      │                 │
│   └────────┬────────┘       └─────────────────────┘                 │
└────────────┼─────────────────────────────────────────────────────────┘
             │
     ┌───────┼───────────────────────────────┐
     │       │                               │
     ▼       ▼                               ▼
  /auth   /events                       /bookings (async RabbitMQ)
  /users  /tickets                      /payments
          /notifications                ...
             │
             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  COUCHE SERVICES (6 x 2 réplicas)                                    │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │auth-service │  │user-service │  │event-service│                  │
│  │    :3004    │  │    :3001    │  │    :3006    │                  │
│  │   replica   │  │   replica   │  │   replica   │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   booking   │  │   payment   │  │notification │                  │
│  │  -service   │  │  -service   │  │  -service   │                  │
│  │    :3003    │  │    :3005    │  │    :3002    │                  │
│  │   replica   │  │   replica   │  │   replica   │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         │   ┌────────────┼──────┐         │                         │
│         │   │            │      │         │                         │
│         ▼   ▼            │      ▼         │                         │
│    ┌─────────┐           │  ┌─────────┐   │                         │
│    │  Redis  │           │  │RabbitMQ │◄──┘                         │
│    │  :6379  │           │  │  :5672  │                             │
│    │ (cache) │           │  │  async  │                             │
│    │ (locks) │           │  │  queue  │                             │
│    └─────────┘           │  └─────────┘                             │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  COUCHE PROXY DB — PgBouncer (1 par silo)   Port :6432              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │auth-pgbouncer│  │user-pgbouncer│  │event-pgbouncer│              │
│  │pool=20 tx    │  │pool=20 tx    │  │pool=20 tx    │               │
│  │max=200 conn  │  │max=200 conn  │  │max=200 conn  │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │booking-      │  │payment-      │  │notif-        │               │
│  │pgbouncer     │  │pgbouncer     │  │pgbouncer     │               │
│  │pool=20 tx    │  │pool=20 tx    │  │pool=20 tx    │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼────────────────────────┘
          │                 │                 │
    ┌─────┘           ┌─────┘           ┌─────┘
    ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  COUCHE BASE DE DONNÉES                                              │
│                                                                      │
│  ── Silos STANDARD (Bitnami PostgreSQL 16 master/slave) ──          │
│                                                                      │
│  ┌──────────────────────┐   ┌──────────────────────┐                │
│  │   auth-db (master)   │   │  auth-db-replica     │                │
│  │  WAL streaming ──────┼──►│  (slave, read-only)  │                │
│  └──────────────────────┘   └──────────────────────┘                │
│                                                                      │
│  ┌──────────────────────┐   ┌──────────────────────┐                │
│  │   user-db (master)   │   │  user-db-replica     │                │
│  │  WAL streaming ──────┼──►│  (slave, read-only)  │                │
│  └──────────────────────┘   └──────────────────────┘                │
│                                                                      │
│  ┌──────────────────────┐   ┌──────────────────────┐                │
│  │  event-db (master)   │   │  event-db-replica    │                │
│  │  WAL streaming ──────┼──►│  (slave, read-only)  │                │
│  └──────────────────────┘   └──────────────────────┘                │
│                                                                      │
│  ┌──────────────────────┐   ┌──────────────────────┐                │
│  │  notif-db (master)   │   │  notif-db-replica    │                │
│  │  WAL streaming ──────┼──►│  (slave, read-only)  │                │
│  └──────────────────────┘   └──────────────────────┘                │
│                                                                      │
│  ── Silos CRITIQUES (Patroni HA — 3 nœuds) ──                       │
│                                                                      │
│  CLUSTER BOOKING                      CLUSTER PAYMENT               │
│  ┌────────────┐                       ┌────────────┐                │
│  │booking-db-1│◄─ leader (prio:100)   │payment-db-1│◄─ leader       │
│  │  :5432     │                       │  :5432     │   (prio:100)   │
│  │  :8008 REST│                       │  :8008 REST│                │
│  └─────┬──────┘                       └─────┬──────┘                │
│        │ WAL streaming                      │ WAL streaming          │
│  ┌─────┴──────┐  ┌────────────┐       ┌─────┴──────┐  ┌───────────┐ │
│  │booking-db-2│  │booking-db-3│       │payment-db-2│  │payment-db-3│ │
│  │ (replica)  │  │ (replica)  │       │ (replica)  │  │ (replica) │ │
│  └────────────┘  └────────────┘       └────────────┘  └───────────┘ │
│                                                                      │
│  ── Consensus ETCD (3 nœuds) — utilisé par Patroni ──               │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                     │
│  │  etcd-1  │◄───►│  etcd-2  │◄───►│  etcd-3  │                     │
│  │  :2379   │     │  :2379   │     │  :2379   │                     │
│  │  :2380   │     │  :2380   │     │  :2380   │                     │
│  └──────────┘     └──────────┘     └──────────┘                     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  OBSERVABILITÉ & MAINTENANCE                                         │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐   │
│  │  zipkin  :9411   │    │  cron-backup                         │   │
│  │  Tracing distribué│   │  Simulation backup payment_db / 6h   │   │
│  └──────────────────┘    └──────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Flux complet d'un achat "Star Tour"

```
  Client
    │
    │ POST /api/bookings  { eventId, quantity, cardToken }
    ▼
  nginx (rate limit 10 req/s)
    │
    ▼
  api-gateway  ──► JWT validation ──► authenticate()
    │
    ▼
  booking-service
    ├─► Redis   → vérifie places disponibles (lock atomique)
    ├─► event-service → confirme l'événement actif
    │
    │  ◄─── répond 202 "Réservation en cours" à l'utilisateur
    │
    ▼
  RabbitMQ  queue: "bookings"
    │
    ├──────────────────────────────────────────────┐
    ▼                                              ▼
  payment-service                      notification-service
    │  consomme RabbitMQ                   │  consomme RabbitMQ
    │  valide la CB (simulé)               │  envoie email/SMS (simulé)
    │  INSERT payment_db                   │  INSERT notif_db
    │  via PgBouncer → payment-db-1        │  via PgBouncer → notif-db
    │
    ▼
  RabbitMQ  queue: "payment.success" / "payment.failed"
    │
    ▼
  notification-service  → notifie l'utilisateur du résultat
```

---

## Tableau des containers (45 total)

| Couche          | Service                   | Image                           | Port interne |
|-----------------|---------------------------|---------------------------------|-------------|
| **Frontal**     | nginx                     | nginx:alpine (custom)           | 80          |
|                 | nginx-replica             | nginx:alpine (custom)           | 80          |
|                 | frontend                  | nginx:alpine (custom SPA)       | 80          |
|                 | frontend-replica          | nginx:alpine (custom SPA)       | 80          |
| **Gateway**     | api-gateway               | node:20-alpine (custom)         | 3000        |
|                 | api-gateway-replica       | node:20-alpine (custom)         | 3000        |
| **Services**    | auth-service              | node:20-alpine (custom)         | 3004        |
|                 | auth-service-replica      | node:20-alpine (custom)         | 3004        |
|                 | user-service              | node:20-alpine (custom)         | 3001        |
|                 | user-service-replica      | node:20-alpine (custom)         | 3001        |
|                 | event-service             | node:20-alpine (custom)         | 3006        |
|                 | event-service-replica     | node:20-alpine (custom)         | 3006        |
|                 | booking-service           | node:20-alpine (custom)         | 3003        |
|                 | booking-service-replica   | node:20-alpine (custom)         | 3003        |
|                 | payment-service           | node:20-alpine (custom)         | 3005        |
|                 | payment-service-replica   | node:20-alpine (custom)         | 3005        |
|                 | notification-service      | node:20-alpine (custom)         | 3002        |
|                 | notification-service-replica | node:20-alpine (custom)      | 3002        |
| **PgBouncer**   | auth-pgbouncer            | bitnamilegacy/pgbouncer         | 6432        |
|                 | user-pgbouncer            | bitnamilegacy/pgbouncer         | 6432        |
|                 | event-pgbouncer           | bitnamilegacy/pgbouncer         | 6432        |
|                 | booking-pgbouncer         | bitnamilegacy/pgbouncer         | 6432        |
|                 | payment-pgbouncer         | bitnamilegacy/pgbouncer         | 6432        |
|                 | notif-pgbouncer           | bitnamilegacy/pgbouncer         | 6432        |
| **DB Standard** | auth-db                   | bitnamilegacy/postgresql:16     | 5432        |
|                 | auth-db-replica           | bitnamilegacy/postgresql:16     | 5432        |
|                 | user-db                   | bitnamilegacy/postgresql:16     | 5432        |
|                 | user-db-replica           | bitnamilegacy/postgresql:16     | 5432        |
|                 | event-db                  | bitnamilegacy/postgresql:16     | 5432        |
|                 | event-db-replica          | bitnamilegacy/postgresql:16     | 5432        |
|                 | notif-db                  | bitnamilegacy/postgresql:16     | 5432        |
|                 | notif-db-replica          | bitnamilegacy/postgresql:16     | 5432        |
| **DB Critique** | booking-db-1 (leader)     | Patroni/postgres:15             | 5432 + 8008 |
|                 | booking-db-2 (replica)    | Patroni/postgres:15             | 5432 + 8008 |
|                 | booking-db-3 (replica)    | Patroni/postgres:15             | 5432 + 8008 |
|                 | payment-db-1 (leader)     | Patroni/postgres:15             | 5432 + 8008 |
|                 | payment-db-2 (replica)    | Patroni/postgres:15             | 5432 + 8008 |
|                 | payment-db-3 (replica)    | Patroni/postgres:15             | 5432 + 8008 |
| **Consensus**   | etcd-1                    | bitnamilegacy/etcd:3.6.4        | 2379 + 2380 |
|                 | etcd-2                    | bitnamilegacy/etcd:3.6.4        | 2379 + 2380 |
|                 | etcd-3                    | bitnamilegacy/etcd:3.6.4        | 2379 + 2380 |
| **Infra**       | rabbitmq                  | rabbitmq:3.11-management        | 5672 + 15672|
|                 | redis                     | redis:7-alpine                  | 6379        |
| **Observ.**     | zipkin                    | openzipkin/zipkin:3             | 9411        |
| **Maintenance** | cron-backup               | node:20-alpine (custom)         | —           |

---

## Points d'accès publics

| URL                          | Service              | Description                    |
|------------------------------|----------------------|--------------------------------|
| `http://localhost`           | nginx → frontend     | Interface utilisateur (SPA)    |
| `http://localhost/api/*`     | nginx → api-gateway  | API REST (JWT requis)          |
| `http://localhost:15672`     | RabbitMQ UI          | guest / guest                  |
| `http://localhost:9411`      | Zipkin UI            | Tracing distribué              |

---

## Choix architecturaux

### Pourquoi PgBouncer ?
Chaque service peut ouvrir jusqu'à 200 connexions clients vers PgBouncer.
PgBouncer maintient un pool de **20 connexions réelles** vers PostgreSQL.
Sans pooler, 200 services × 2 réplicas = 400 connexions directes → crash du CPU PostgreSQL.

### Pourquoi Patroni + ETCD pour booking et payment ?
Ces deux silos sont **critiques** :
- `booking` : perte de données = tickets vendus sans trace
- `payment` : perte de données = transactions financières perdues

Patroni offre un **failover automatique** en < 30 secondes.
ETCD (3 nœuds, quorum = 2) assure le consensus distribué sans split-brain.

### Pourquoi Redis pour le booking ?
Le `booking-service` vérifie et décrémente le compteur de places **en mémoire RAM**.
Latence < 1ms vs. ~5ms PostgreSQL. Garantit qu'on ne vend pas 2 fois le même siège (lock atomique via `DECR`).

### Pourquoi RabbitMQ ?
L'achat est **asynchrone** : l'utilisateur reçoit un `202 Accepted` immédiat.
Le paiement et la notification s'exécutent en arrière-plan.
Si Stripe/Twilio est lent, les messages attendent dans RabbitMQ sans bloquer les ventes.

### Note sur la migration Bitnami (août 2025)
Les images `bitnami/*` ont migré vers `bitnamilegacy/*` (images figées, sans mise à jour)
et `bitnamisecure/*` (payant, mises à jour). Ce projet utilise `bitnamilegacy` pour
rester sur PostgreSQL 16 avec les env vars Bitnami que nous avons configurées.
