# Architecture — TicketApp

## Vue d'ensemble

```mermaid
graph TD
    User((Utilisateur)) --> N[Nginx Frontal]
    
    subgraph "Couche Présentation"
        N --> FE[Frontend SPA]
        N -- "/api" --> GWLB[Gateway LB]
        GWLB --> GW[API Gateway Replicas]
    end

    subgraph "Load Balancers Internes"
        GW --> ALB[Auth LB]
        GW --> ULB[User LB]
        GW --> ELB[Event LB]
        GW --> BLB[Booking LB]
        GW --> PLB[Payment LB]
    end

    subgraph "Microservices (Logique Métier)"
        ALB --> AS[Auth Service Replicas]
        ULB --> US[User Service Replicas]
        ELB --> ES[Event Service Replicas]
        BLB --> BS[Booking Service Replicas]
        PLB --> PS[Payment Service Replicas]
        GW -.-> NS[Notification Service]
    end

    subgraph "Infrastructure Partagée"
        RMQ[RabbitMQ Broker]
        RED[Redis Cache]
        ZIP[Zipkin Tracing]
    end

    subgraph "Silos de Données (Patroni / Slave)"
        subgraph "Silos Critiques (HA)"
            BS --> RED
            BDB[(Booking Cluster Patroni)]
            PDB[(Payment Cluster Patroni)]
            ETC{ETCD Cluster}
            BDB & PDB --- ETC
        end
        
        subgraph "Silos Standards"
            ADB[(Auth DB Slave)]
            UDB[(User DB Slave)]
            EDB[(Event DB Slave)]
            NDB[(Notif DB Slave)]
        end
        
        PGB[PgBouncer Layer]
    end

    %% Connexions Logical
    AS & US & ES & BS & PS & NS --- PGB
    PGB --- ADB & UDB & EDB & NDB & BDB & PDB
    
    PS -- "Queue" --> RMQ
    RMQ -- "Sync" --> BS & ES
    
    %% Observabilité
    AS & US & ES & BS & PS & NS -.-> ZIP
```
## Flow de réservation (queue)

```
  POST /bookings
       │
       ▼
  api-gateway  ──publish──▶  RabbitMQ
                              queue: "bookings"
                                    │
                                    ▼
                            [ booking-service ]
                            • décrémente capacity (atomic UPDATE)
                            • crée le ticket (status: pending)
                            • publish ──▶ queue: "payments"
                                                │
                                                ▼
                                        [ payment-service ]
                                        • simule paiement
                                        ┌──────┴──────┐
                                     succès         échec
                                        │              │
                                  ticket=confirmed  ticket=cancelled
                                  restore capacity (si échec)
                                        │              │
                                        └──────┬───────┘
                                               ▼
                                        queue: "notifications"
                                               │
                                               ▼
                                    [ notification-service ]
                                    • log + sauvegarde en DB
```

## Services

| Service              | Port LB | Instances | Base de données         |
|----------------------|---------|-----------|-------------------------|
| api-gateway          | 3030    | ×2        | —                       |
| auth-service         | 3011    | ×2        | auth-db + auth-replica  |
| user-service         | 3010    | ×2        | user-db + user-replica  |
| event-service        | 3020    | ×2        | event-db + event-replica|
| booking-service      | 3021    | ×2        | booking-db + replica    |
| payment-service      | 3022    | ×1        | payment-db + replica    |
| notification-service | 3023    | ×1        | notif-db + replica      |
| frontend             | 8080    | ×1        | —                       |
| rabbitmq             | 5672    | ×1        | —                       |

## Réplication PostgreSQL (primary / replica)

```
  PRIMARY (écritures)                REPLICA (lectures)
  ┌─────────────────┐                ┌──────────────────┐
  │   INSERT        │  WAL streaming │   SELECT         │
  │   UPDATE   ─────┼───────────────▶│   (read-only)    │
  │   DELETE        │                │                  │
  └─────────────────┘                └──────────────────┘

  Dans le code :
  primaryPool.query(...)   ← INSERT / UPDATE / DELETE
  replicaPool.query(...)   ← SELECT
```

## Structure des dossiers

```
services/
├── auth/
│   ├── auth-service/      ← Express (register, login, JWT)
│   ├── db/                ← init-replica.sh (WAL config)
│   ├── db-replica/        ← Dockerfile + start-replica.sh
│   └── lb/                ← nginx round-robin
├── user/
│   ├── user-service/      ← Express (CRUD users)
│   ├── db/
│   ├── db-replica/
│   └── lb/
├── event/                 ← même structure
├── booking/               ← même structure + consumer RabbitMQ
├── payment/               ← consumer RabbitMQ (simulation paiement)
├── notification/          ← consumer RabbitMQ (log + DB)
├── gateway/
│   ├── api-gateway/       ← Express (routing + publish queue)
│   └── lb/
└── frontend/
    └── frontend-app/      ← HTML + CSS + JS (nginx)
```
