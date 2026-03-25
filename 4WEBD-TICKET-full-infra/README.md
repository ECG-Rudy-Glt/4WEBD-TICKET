# 4WEBD-TICKET-full-infra — Architecture Haute Disponibilité (HA)

Ce dossier présente une extension avancée du projet TicketApp, conçue pour démontrer la mise en œuvre d'une infrastructure hautement disponible et résiliente, capable de supporter des charges extrêmes.

## Caractéristiques Principales

L'architecture full-infra repose sur 45 conteneurs orchestrés pour offrir une disponibilité maximale. Elle intègre des composants critiques absents de la version standard :

- **Automatic Failover** : Utilisation de **Patroni** et **ETCD** pour garantir une bascule automatique des bases de données de réservation et de paiement en moins de 30 secondes.
- **Orchestration Massive** : Déploiement de **46 conteneurs** assurant la redondance de chaque couche.
- **Connection Pooling** : Implémentation de **PgBouncer** pour optimiser les performances et la consommation de ressources CPU des serveurs de base de données.
- **Load Balancing Multi-Niveau** : Redondance des services avec des Load Balancers internes (Nginx) pour une distribution de charge équilibrée.
- **Atomic Locks** : Utilisation de **Redis** pour sécuriser les transactions de billetterie et prévenir toute survente ("Star Tour").

## Schéma d'Architecture (Haute Disponibilité)

```mermaid
graph TD
    User((Utilisateur)) --> N[Nginx Frontal]
    
    subgraph "Nœuds de Distribution"
        N --> FE[Frontend SPA x2]
        N -- "/api" --> GWLB[Gateway LB]
        GWLB --> GW[API Gateway x2]
    end

    subgraph "Communication lnterne"
        GW --> ALB[Auth LB]
        GW --> ULB[User LB]
        GW --> ELB[Event LB]
        GW --> BLB[Booking LB]
        GW --> PLB[Payment LB]
    end

    subgraph "Microservices Répliqués"
        ALB --> AS[Auth Service Replicas]
        ULB --> US[User Service Replicas]
        ELB --> ES[Event Service Replicas]
        BLB --> BS[Booking Service Replicas]
        PLB --> PS[Payment Service Replicas]
        GW -.-> NS[Notification Service]
    end

    subgraph "Gestion de Consensus"
        ETCD{ETCD Cluster x3}
    end

    subgraph "Couche de Persistance Avancée"
        subgraph "HA Silos (Booking/Payment)"
            BS & PS --- PGB_HA[PgBouncer HA]
            PGB_HA --- BDB[(Booking Cluster Patroni x3)]
            PGB_HA --- PDB[(Payment Cluster Patroni x3)]
            BDB & PDB --- ETCD
        end
        
        subgraph "Standard Silos"
            AS & US & ES --- PGB_STD[PgBouncer Standard]
            PGB_STD --- ADB[(Auth DB Master/Slave)]
            PGB_STD --- UDB[(User DB Master/Slave)]
            PGB_STD --- EDB[(Event DB Master/Slave)]
        end
    end

    subgraph "Infrastructure Partagée"
        RMQ[RabbitMQ]
        RED[Redis]
        ZIP[Zipkin]
    end
```

## Pour Aller Plus Loin

Cette version a été développée pour illustrer les mécanismes de résilience requis en production réelle :
- **Observabilité** : Traçage distribué complet via **Zipkin**.
- **Récupération après sinistre** : Failover automatique géré par Patroni en cas de crash d'un leader de base de données.
- **Scalabilité** : Ajout transparent de réplicas applicatifs via les Load Balancers internes Nginx.

## Installation et Lancement

Depuis ce dossier :
```bash
docker-compose up -d --build
```
- Frontend : `http://localhost`
- API Gateway : `http://localhost/api`
- RabbitMQ UI : `http://localhost:15672`
- Zipkin Tracing : `http://localhost:9411`
