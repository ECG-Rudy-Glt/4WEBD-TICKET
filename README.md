# Projet 4WEBD-TICKET — Plateforme de Réservation de Billets

Bienvenue dans le dépôt du projet 4WEBD-TICKET. Ce projet a été développé dans le cadre du module 4WEBD (SUPINFO) pour répondre aux exigences d'une plateforme SaaS de billetterie haute disponibilité.

---

> [!IMPORTANT]
> **PROJET À ÉVALUER : 4WEBD-TICKET-main**
>
> **Le dossier de référence pour la notation est exclusivement `4WEBD-TICKET-main`.**
> Ce dossier implémente l'intégralité des fonctionnalités requises de manière optimale et conforme au cahier des charges.
>
> Le dossier **`4WEBD-TICKET-full-infra`** constitue une extension technique destinée à démontrer la mise en œuvre d'une infrastructure de production hautement disponible et résiliente. **Bien que ce dossier ne doive pas être noté, il repose sur le même code applicatif que la version de référence.**

---

## Comparaison des Architectures

| Caractéristique | 4WEBD-TICKET-main (À NOTER) | 4WEBD-TICKET-full-infra (Extension HA) |
|-----------------|-----------------------------|-----------------------------------------|
| **Architecture** | Microservices (Silos de données) | Microservices HA (45+ conteneurs) |
| **Nombre de conteneurs** | **30 conteneurs** | **46 conteneurs** |
| **Bases de données** | PostgreSQL Master-Slave | Patroni (HA) + PgBouncer |
| **Load Balancing** | Nginx Edge Proxy | Nginx Edge + LBs Internes (Round Robin) |
| **Failover DB** | Manuel / Réplication WAL | **Automatique (<30s)** via Patroni/ETCD |
| **Gestion Connexions** | Directe vers Pools PostgreSQL | **Pooler PgBouncer** (Optimisation CPU) |
| **Performance** | Cache Redis | Cache Redis + Verrous Atomiques |

---

## Analyse Technique de l'Infrastructure Full-Infra

La version "full-infra" a été conçue pour répondre aux contraintes de charge extrême (événements de type "Star Tour").

### PgBouncer et Gestion des Connexions
L'utilisation de **PgBouncer** est indispensable pour prévenir la saturation du processeur sur les serveurs PostgreSQL. Dans une architecture à 45 conteneurs, le nombre de connexions simultanées pourrait excéder les capacités des bases de données. PgBouncer agit comme une couche de multiplexage, permettant de maintenir un pool de connexions actives réduit tout en acceptant un grand nombre de requêtes clients.

### Patroni et ETCD pour la Haute Disponibilité
Pour les services critiques que sont **Booking** (réservations) et **Payment** (transactions), toute interruption de service ou perte de données est proscrite. 
- **Patroni** gère l'automatisation de la réplication et du failover.
- **ETCD** assure le consensus distribué, garantissant l'intégrité de l'élection du leader et évitant les problématiques de "split-brain".

### Load Balancing Interne (Round Robin)
Chaque microservice est précédé d'un load balancer Nginx interne configuré en Round Robin. Cette approche permet une scalabilité horizontale transparente pour l'API Gateway, qui interagit avec un point de terminaison unique par service.

### Configuration du Reverse Proxy (trust proxy)
Afin d'assurer le bon fonctionnement du rate-limiting (`express-rate-limit`) à travers les multiples couches de proxy, le paramètre `app.set('trust proxy', 1)` a été configuré. Cela permet aux services d'identifier l'adresse IP réelle de l'utilisateur final plutôt que celle du dernier proxy interne.

### Gestion des Risques et Résilience
L'analyse de la criticité des opérations a conduit aux choix suivants :
- **Processus d'Achat** : Utilisation de RabbitMQ pour une gestion asynchrone, permettant de lisser les pics de charge et d'assurer qu'aucune transaction n'est perdue.
- **Récupération des données** : Les lectures sont distribuées sur les réplicas PostgreSQL afin de garantir la disponibilité des services de consultation même en cas d'indisponibilité du nœud d'écriture.
- **Observabilité** : L'intégration de **Zipkin** permet un traçage distribué des requêtes, essentiel pour le diagnostic en environnement microservices.

---

## Réponses aux Exigences du Cahier des Charges

### Fonctionnalités implémentées
- **Interfaces CRUD** : Gestion des utilisateurs, des événements et des billets.
- **Sécurité** : Authentification et autorisation via JWT, gestion des rôles (Admin, Creator, User).
- **Transactions** : Circuit de réservation asynchrone validé par le service de paiement.
- **Notifications** : Système de confirmation simulé via RabbitMQ (Logs et base de données dédiés).

### Questions Étudiantes
1. **Architecture** : Microservices conteneurisés via Docker Compose.
2. **Prévention de la survente** : Utilisation de verrous atomiques **Redis (DECR)** pour la gestion des stocks en temps réel.
3. **Sécurité des données** : Hachage des mots de passe avec BCRYPT et association unique utilisateur-billet.
4. **Performance** : Temps de latence cible inférieur à 300ms grâce à l'asynchronisme.
5. **Sauvegardes** : Automatisation des backups pour la base de données de paiement (`cron-backup`).
6. **Documentation** : Spécifications OpenAPI/Swagger détaillant l'ensemble des points de terminaison.

---

## Guide d'Installation

1. Cloner le dépôt.
2. Accéder au répertoire du projet souhaité (`main` ou `full-infra`).
3. Lancer l'infrastructure :
   ```bash
   docker-compose up -d --build
   ```
4. Point d'accès utilisateur : `http://localhost`.
5. Monitoring : Interface RabbitMQ (`:15672`), Zipkin (`:9411`).

---
*Projet réalisé par Groupe 2*
