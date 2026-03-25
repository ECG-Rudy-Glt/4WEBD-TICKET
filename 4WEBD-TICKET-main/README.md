# 4WEBD-TICKET-main — Architecture Microservices Standard

Ce dossier constitue le projet de référence pour l'évaluation. Il implémente une architecture microservices robuste, modulaire et scalable, répondant à l'intégralité des exigences du sujet 4WEBD.

## Alignement avec le Sujet

Ce projet répond spécifiquement aux besoins énoncés :
- **Gestion des Événements** : API CRUD complète via `event-service`.
- **Gestion des Utilisateurs** : API CRUD complète via `user-service`.
- **Authentification et Autorisation** : Gestion sécurisée via `auth-service` (JWT).
- **Processus d'Achat** : Gestion transactionnelle via `booking-service` et validation de paiement via `payment-service`.
- **Notifications** : Système asynchrone via `notification-service` (simulation Email/SMS).
- **Haute Disponibilité** : Tous les services critiques sont répliqués et protégés par des Load Balancers.
- **Déploiement** : Orchestration de **30 conteneurs** Docker.

## Architecture Technique

Le système est découpé en services autonomes communiquant via REST (synchrone) et RabbitMQ (asynchrone).

```mermaid
graph TD
    User((Utilisateur)) --> N[Nginx Frontal]
    
    subgraph "Couche Présentation"
        N --> FE[Frontend SPA]
        N -- "/api" --> GWLB[Gateway LB]
        GWLB --> GW[API Gateway Replicas]
    end

    subgraph "Load Balancers Internes (Nginx)"
        GW --> ALB[Auth LB]
        GW --> ULB[User LB]
        GW --> ELB[Event LB]
        GW --> BLB[Booking LB]
    end

    subgraph "Microservices"
        ALB --> AS[Auth Service Replicas]
        ULB --> US[User Service Replicas]
        ELB --> ES[Event Service Replicas]
        BLB --> BS[Booking Service Replicas]
        GW --> PS[Payment Service]
        GW --> NS[Notification Service]
    end

    subgraph "Persistance (Master/Replica)"
        AS --> ADB[(Auth DBs)]
        US --> UDB[(User DBs)]
        ES --> EDB[(Event DBs)]
        BS --> BDB[(Booking DBs)]
        PS --> PDB[(Payment DBs)]
        NS --> NDB[(Notif DBs)]
    end

    subgraph "Infrastructure"
        RMQ[RabbitMQ]
        RED[Redis]
    end

    %% Communication Asynchrone
    BS -- "Event" --> RMQ
    PS -- "Event" --> RMQ
    RMQ -- "Consume" --> NS
```

### Points Clés
- **Réplication de Données** : Chaque service possède sa propre base de données PostgreSQL configurée avec un Master (écriture) et un Replica (lecture via WAL streaming).
- **Asynchronisme** : L'achat d'un billet déclenche un message dans RabbitMQ, permettant au système de notifier l'utilisateur sans bloquer le flux principal.
- **Performance** : Utilisation de Redis pour optimiser la gestion des places disponibles et éviter la survente lors de fortes charges.

## Installation et Lancement

Depuis ce dossier :
```bash
docker-compose up -d --build
```
- Frontend : `http://localhost:8080`
- API Gateway : `http://localhost:3030/api`
- RabbitMQ UI : `http://localhost:15672`
