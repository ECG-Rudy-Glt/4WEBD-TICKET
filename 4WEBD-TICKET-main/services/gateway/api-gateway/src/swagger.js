import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'TicketApp API',
            version: '1.0.0',
            description: 'API Gateway — TicketApp microservices',
        },
        servers: [{ url: 'http://localhost:3030' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id:        { type: 'integer' },
                        firstname: { type: 'string' },
                        lastname:  { type: 'string' },
                        email:     { type: 'string', format: 'email' },
                        phone:     { type: 'string', nullable: true },
                        role:      { type: 'string', enum: ['user', 'operator', 'admin'] },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Event: {
                    type: 'object',
                    properties: {
                        id:               { type: 'integer' },
                        title:            { type: 'string' },
                        description:      { type: 'string' },
                        date:             { type: 'string', format: 'date-time' },
                        venue:            { type: 'string' },
                        maxCapacity:      { type: 'integer' },
                        availableTickets: { type: 'integer' },
                        priceInCents:     { type: 'integer' },
                        status:           { type: 'string', enum: ['active', 'cancelled', 'completed'] },
                        createdAt:        { type: 'string', format: 'date-time' },
                    },
                },
                Ticket: {
                    type: 'object',
                    properties: {
                        id:           { type: 'integer' },
                        eventId:      { type: 'integer' },
                        userId:       { type: 'integer' },
                        ticketCode:   { type: 'string', format: 'uuid' },
                        status:       { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
                        quantity:     { type: 'integer' },
                        priceInCents: { type: 'integer' },
                        createdAt:    { type: 'string', format: 'date-time' },
                    },
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id:            { type: 'integer' },
                        ticketId:      { type: 'integer' },
                        userId:        { type: 'integer' },
                        amountInCents: { type: 'integer' },
                        status:        { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
                        cardToken:     { type: 'string' },
                        createdAt:     { type: 'string', format: 'date-time' },
                    },
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id:        { type: 'integer' },
                        userId:    { type: 'integer' },
                        type:      { type: 'string' },
                        message:   { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page:       { type: 'integer' },
                        limit:      { type: 'integer' },
                        total:      { type: 'integer' },
                        totalPages: { type: 'integer' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                },
            },
        },
        tags: [
            { name: 'Auth',          description: 'Authentification — auth-service (port 3011)' },
            { name: 'Users',         description: 'Gestion des utilisateurs — user-service (port 3010)' },
            { name: 'Events',        description: 'Gestion des événements — event-service (port 3020)' },
            { name: 'Bookings',      description: 'Réservation de billets — booking-service (port 3021)' },
            { name: 'Tickets',       description: 'Consultation & gestion des billets — booking-service (port 3021)' },
            { name: 'Payments',      description: 'Paiements — payment-service (port 3022)' },
            { name: 'Notifications', description: 'Notifications — notification-service (port 3023)' },
        ],
        paths: {

            // ─── Auth ─────────────────────────────────────────────────────────────
            '/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Créer un compte',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            required: ['firstname', 'lastname', 'email', 'password'],
                            properties: {
                                firstname: { type: 'string' },
                                lastname:  { type: 'string' },
                                email:     { type: 'string', format: 'email' },
                                phone:     { type: 'string' },
                                password:  { type: 'string', minLength: 8 },
                                role:      { type: 'string', enum: ['user', 'operator', 'admin'] },
                            },
                        }}},
                    },
                    responses: {
                        201: { description: 'Compte créé', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: { user: { '$ref': '#/components/schemas/User' }, token: { type: 'string' } },
                        }}}},
                        400: { description: 'Données invalides', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        409: { description: 'Email déjà utilisé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Se connecter',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            required: ['email', 'password'],
                            properties: {
                                email:    { type: 'string', format: 'email' },
                                password: { type: 'string' },
                            },
                        }}},
                    },
                    responses: {
                        200: { description: 'Connexion réussie', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: { user: { '$ref': '#/components/schemas/User' }, token: { type: 'string' } },
                        }}}},
                        400: { description: 'Données invalides', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        401: { description: 'Identifiants invalides', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },

            // ─── Users ────────────────────────────────────────────────────────────
            '/users': {
                post: {
                    tags: ['Users'],
                    summary: 'Créer un utilisateur',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            required: ['firstname', 'lastname', 'email', 'password'],
                            properties: {
                                firstname: { type: 'string' },
                                lastname:  { type: 'string' },
                                email:     { type: 'string', format: 'email' },
                                phone:     { type: 'string' },
                                password:  { type: 'string', minLength: 8 },
                                role:      { type: 'string', enum: ['user', 'operator', 'admin'] },
                            },
                        }}},
                    },
                    responses: {
                        201: { description: 'Utilisateur créé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
                        400: { description: 'Données invalides', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        409: { description: 'Email déjà utilisé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
                get: {
                    tags: ['Users'],
                    summary: 'Lister les utilisateurs (admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Liste paginée', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: {
                                data:       { type: 'array', items: { '$ref': '#/components/schemas/User' } },
                                pagination: { '$ref': '#/components/schemas/Pagination' },
                            },
                        }}}},
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        403: { description: 'Accès refusé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/users/me': {
                get: {
                    tags: ['Users'],
                    summary: 'Obtenir mon profil (utilisateur connecté)',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Profil de l\'utilisateur connecté', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/users/{id}': {
                get: {
                    tags: ['Users'],
                    summary: 'Obtenir un utilisateur par ID',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Utilisateur', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
                put: {
                    tags: ['Users'],
                    summary: 'Modifier un utilisateur',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            properties: {
                                firstname: { type: 'string' },
                                lastname:  { type: 'string' },
                                email:     { type: 'string', format: 'email' },
                                phone:     { type: 'string' },
                                password:  { type: 'string', minLength: 8 },
                            },
                        }}},
                    },
                    responses: {
                        200: { description: 'Utilisateur modifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
                        400: { description: 'Données invalides', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
                delete: {
                    tags: ['Users'],
                    summary: 'Supprimer un utilisateur',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        204: { description: 'Supprimé' },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },

            // ─── Events ───────────────────────────────────────────────────────────
            '/events': {
                get: {
                    tags: ['Events'],
                    summary: 'Lister les événements',
                    parameters: [
                        { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Liste paginée des événements', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: {
                                data:       { type: 'array', items: { '$ref': '#/components/schemas/Event' } },
                                pagination: { '$ref': '#/components/schemas/Pagination' },
                            },
                        }}}},
                    },
                },
                post: {
                    tags: ['Events'],
                    summary: 'Créer un événement (admin / operator)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            required: ['title', 'date', 'venue', 'maxCapacity', 'priceInCents'],
                            properties: {
                                title:        { type: 'string' },
                                description:  { type: 'string' },
                                date:         { type: 'string', format: 'date-time' },
                                venue:        { type: 'string' },
                                maxCapacity:  { type: 'integer', minimum: 1 },
                                priceInCents: { type: 'integer', minimum: 0 },
                            },
                        }}},
                    },
                    responses: {
                        201: { description: 'Événement créé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Event' } } } },
                        400: { description: 'Données invalides', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        403: { description: 'Accès refusé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/events/{id}': {
                get: {
                    tags: ['Events'],
                    summary: 'Obtenir un événement par ID',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Événement', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Event' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
                put: {
                    tags: ['Events'],
                    summary: 'Modifier un événement (admin / operator)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            properties: {
                                title:        { type: 'string' },
                                description:  { type: 'string' },
                                date:         { type: 'string', format: 'date-time' },
                                venue:        { type: 'string' },
                                maxCapacity:  { type: 'integer', minimum: 1 },
                                priceInCents: { type: 'integer', minimum: 0 },
                            },
                        }}},
                    },
                    responses: {
                        200: { description: 'Événement modifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Event' } } } },
                        400: { description: 'Données invalides', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        403: { description: 'Accès refusé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
                delete: {
                    tags: ['Events'],
                    summary: 'Supprimer un événement (admin / operator)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        204: { description: 'Supprimé' },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        403: { description: 'Accès refusé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },

            // ─── Bookings ─────────────────────────────────────────────────────────
            '/bookings': {
                post: {
                    tags: ['Bookings'],
                    summary: 'Acheter un billet (réservation asynchrone)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            required: ['eventId', 'quantity', 'cardToken'],
                            properties: {
                                eventId:   { type: 'integer' },
                                quantity:  { type: 'integer', minimum: 1 },
                                cardToken: { type: 'string', description: 'Numéro de carte simulé (16 chiffres)' },
                            },
                        }}},
                    },
                    responses: {
                        202: { description: 'Réservation en cours de traitement', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: { message: { type: 'string' }, data: { type: 'object' } },
                        }}}},
                        400: { description: 'Données invalides ou événement non disponible', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        409: { description: 'Plus assez de places', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },

            // ─── Tickets ──────────────────────────────────────────────────────────
            '/tickets': {
                get: {
                    tags: ['Tickets'],
                    summary: 'Lister tous les billets (admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Liste paginée des billets', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: {
                                data:       { type: 'array', items: { '$ref': '#/components/schemas/Ticket' } },
                                pagination: { '$ref': '#/components/schemas/Pagination' },
                            },
                        }}}},
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        403: { description: 'Accès refusé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/tickets/user/{userId}': {
                get: {
                    tags: ['Tickets'],
                    summary: 'Billets d\'un utilisateur',
                    parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Liste des billets', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Ticket' } } } } },
                        404: { description: 'Utilisateur non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/tickets/event/{eventId}': {
                get: {
                    tags: ['Tickets'],
                    summary: 'Billets d\'un événement',
                    parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Liste des billets', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Ticket' } } } } },
                        404: { description: 'Événement non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/tickets/{id}': {
                get: {
                    tags: ['Tickets'],
                    summary: 'Obtenir un billet par ID',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Billet', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Ticket' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/tickets/{id}/status': {
                patch: {
                    tags: ['Tickets'],
                    summary: 'Mettre à jour le statut d\'un billet',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object',
                            required: ['status'],
                            properties: {
                                status:    { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
                                paymentId: { type: 'integer', description: 'ID du paiement associé (optionnel)' },
                            },
                        }}},
                    },
                    responses: {
                        200: { description: 'Billet mis à jour', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Ticket' } } } },
                        400: { description: 'Statut invalide', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },

            // ─── Payments ─────────────────────────────────────────────────────────
            '/payments': {
                get: {
                    tags: ['Payments'],
                    summary: 'Lister tous les paiements (admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Liste paginée des paiements', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: {
                                data:       { type: 'array', items: { '$ref': '#/components/schemas/Payment' } },
                                pagination: { '$ref': '#/components/schemas/Pagination' },
                            },
                        }}}},
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        403: { description: 'Accès refusé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/payments/user/{userId}': {
                get: {
                    tags: ['Payments'],
                    summary: 'Paiements d\'un utilisateur',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
                        { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit',  in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Paiements de l\'utilisateur', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Payment' } } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        404: { description: 'Utilisateur non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/payments/{id}': {
                get: {
                    tags: ['Payments'],
                    summary: 'Obtenir un paiement par ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Paiement', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Payment' } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        404: { description: 'Non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },

            // ─── Notifications ────────────────────────────────────────────────────
            '/notifications': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Lister toutes les notifications (admin)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Liste des notifications', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: {
                                data:       { type: 'array', items: { '$ref': '#/components/schemas/Notification' } },
                                pagination: { '$ref': '#/components/schemas/Pagination' },
                            },
                        }}}},
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        403: { description: 'Accès refusé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/notifications/user/{userId}': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Notifications d\'un utilisateur',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
                        { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit',  in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Notifications de l\'utilisateur', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Notification' } } } } },
                        401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                        404: { description: 'Utilisateur non trouvé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
                    },
                },
            },
        },
    },
    apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
