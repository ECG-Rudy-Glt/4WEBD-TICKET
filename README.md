# Projet 4WEBD-TICKET — Plateforme de Réservation de Billets



---

> [!IMPORTANT]
> **PROJET À ÉVALUER : 4WEBD-TICKET-main**
>
> **Le dossier de référence pour la notation est exclusivement `4WEBD-TICKET-main`.**
> Ce dossier implémente l'intégralité des fonctionnalités requises de manière optimale et conforme au cahier des charges.
>
> Le dossier **`4WEBD-TICKET-full-infra`** constitue une extension technique destinée à démontrer la mise en œuvre d'une infrastructure de production hautement disponible et résiliente. **Bien que ce dossier ne doive pas être noté, il repose sur le même code applicatif que la version de référence.**
>
> *Note : Ces deux configurations sont délibérément "overkill" pour un déploiement sur un serveur unique (Docker Compose), mais elles servent à simuler une architecture distribuée réelle sur plusieurs serveurs physiques ou clusters.*

---

## Comparaison des Architectures

| Caractéristique | 4WEBD-TICKET-main (À NOTER) | 4WEBD-TICKET-full-infra (Extension HA) |
|-----------------|-----------------------------|-----------------------------------------|
| **Architecture** | Microservices (Silos de données) | Microservices HA (45+ conteneurs) |
| **Nombre de conteneurs** | **30 conteneurs** | **46 conteneurs** |
| **Bases de données** | PostgreSQL Master-Slave | Patroni (HA) + PgBouncer |
| **Load Balancing** | Nginx Edge Proxy + LBs Internes (Round Robin) | Nginx Edge + LBs Internes (Round Robin) |
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
