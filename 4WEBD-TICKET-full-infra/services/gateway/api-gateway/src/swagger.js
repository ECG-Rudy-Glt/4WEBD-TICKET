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
                Error: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                },
            },
        },
        paths: {
            '/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Créer un compte',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object', required: ['firstname','lastname','email','password'],
                            properties: {
                                firstname: { type: 'string' },
                                lastname:  { type: 'string' },
                                email:     { type: 'string', format: 'email' },
                                phone:     { type: 'string' },
                                password:  { type: 'string', minLength: 8 },
                                role:      { type: 'string', enum: ['user','operator','admin'] },
                            },
                        }}},
                    },
                    responses: {
                        201: { description: 'Compte créé', content: { 'application/json': { schema: {
                            type: 'object',
                            properties: { user: { '$ref': '#/components/schemas/User' }, token: { type: 'string' } },
                        }}}},
                        400: { description: 'Données invalides' },
                        409: { description: 'Email déjà utilisé' },
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
                            type: 'object', required: ['email','password'],
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
                        401: { description: 'Identifiants invalides' },
                    },
                },
            },
            '/users': {
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
                                data: { type: 'array', items: { '$ref': '#/components/schemas/User' } },
                                pagination: { type: 'object', properties: { page: {type:'integer'}, limit: {type:'integer'}, total: {type:'integer'}, totalPages: {type:'integer'} } },
                            },
                        }}}},
                    },
                },
                post: {
                    tags: ['Users'],
                    summary: 'Créer un utilisateur',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: {
                            type: 'object', required: ['firstname','lastname','email','password'],
                            properties: {
                                firstname: { type: 'string' },
                                lastname:  { type: 'string' },
                                email:     { type: 'string', format: 'email' },
                                phone:     { type: 'string' },
                                password:  { type: 'string', minLength: 8 },
                                role:      { type: 'string', enum: ['user','operator','admin'] },
                            },
                        }}},
                    },
                    responses: {
                        201: { description: 'Utilisateur créé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
                        400: { description: 'Données invalides' },
                        409: { description: 'Email déjà utilisé' },
                    },
                },
            },
            '/users/{id}': {
                get: {
                    tags: ['Users'], summary: 'Obtenir un utilisateur',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Utilisateur', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
                        404: { description: 'Non trouvé' },
                    },
                },
                put: {
                    tags: ['Users'], summary: 'Modifier un utilisateur',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: {
                        type: 'object',
                        properties: { firstname: {type:'string'}, lastname: {type:'string'}, email: {type:'string'}, phone: {type:'string'}, password: {type:'string'} },
                    }}}},
                    responses: { 200: { description: 'Utilisateur modifié' }, 404: { description: 'Non trouvé' } },
                },
                delete: {
                    tags: ['Users'], summary: 'Supprimer un utilisateur',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 204: { description: 'Supprimé' }, 404: { description: 'Non trouvé' } },
                },
            },
            '/events': {
                get: {
                    tags: ['Events'], summary: 'Lister les événements',
                    parameters: [
                        { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: { 200: { description: 'Liste paginée', content: { 'application/json': { schema: {
                        type: 'object',
                        properties: {
                            data: { type: 'array', items: { '$ref': '#/components/schemas/Event' } },
                            pagination: { type: 'object' },
                        },
                    }}}},
                    },
                },
                post: {
                    tags: ['Events'], summary: 'Créer un événement (admin/operator)',
                    security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: {
                        type: 'object', required: ['title','date','venue','maxCapacity','priceInCents'],
                        properties: {
                            title:        { type: 'string' },
                            description:  { type: 'string' },
                            date:         { type: 'string', format: 'date-time' },
                            venue:        { type: 'string' },
                            maxCapacity:  { type: 'integer', minimum: 1 },
                            priceInCents: { type: 'integer', minimum: 0 },
                        },
                    }}}},
                    responses: {
                        201: { description: 'Événement créé', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Event' } } } },
                        401: { description: 'Non authentifié' },
                        403: { description: 'Accès refusé' },
                    },
                },
            },
            '/events/{id}': {
                get: {
                    tags: ['Events'], summary: 'Obtenir un événement',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Événement', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Event' } } } }, 404: { description: 'Non trouvé' } },
                },
                put: {
                    tags: ['Events'], summary: 'Modifier un événement (admin/operator)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: {
                        type: 'object',
                        properties: { title: {type:'string'}, description: {type:'string'}, date: {type:'string',format:'date-time'}, venue: {type:'string'}, maxCapacity: {type:'integer'}, priceInCents: {type:'integer'} },
                    }}}},
                    responses: { 200: { description: 'Événement modifié' }, 401: { description: 'Non authentifié' }, 403: { description: 'Accès refusé' }, 404: { description: 'Non trouvé' } },
                },
                delete: {
                    tags: ['Events'], summary: 'Supprimer un événement (admin/operator)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 204: { description: 'Supprimé' }, 401: { description: 'Non authentifié' }, 403: { description: 'Accès refusé' } },
                },
            },
            '/bookings': {
                post: {
                    tags: ['Bookings'], summary: 'Acheter un billet',
                    security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: {
                        type: 'object', required: ['eventId','quantity','cardToken'],
                        properties: {
                            eventId:   { type: 'integer' },
                            quantity:  { type: 'integer', minimum: 1 },
                            cardToken: { type: 'string', description: 'Numéro de carte simulé (16 chiffres)' },
                        },
                    }}}},
                    responses: {
                        202: { description: 'Réservation en cours de traitement' },
                        400: { description: 'Données invalides ou événement non disponible' },
                        401: { description: 'Non authentifié' },
                        409: { description: 'Plus assez de places' },
                    },
                },
            },
            '/tickets/user/{userId}': {
                get: {
                    tags: ['Tickets'], summary: 'Billets d\'un utilisateur',
                    parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Liste des billets', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Ticket' } } } } } },
                },
            },
            '/tickets/event/{eventId}': {
                get: {
                    tags: ['Tickets'], summary: 'Billets d\'un événement',
                    parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Liste des billets', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Ticket' } } } } } },
                },
            },
            '/tickets/{id}': {
                get: {
                    tags: ['Tickets'], summary: 'Obtenir un billet',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Billet', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Ticket' } } } }, 404: { description: 'Non trouvé' } },
                },
            },
        },
    },
    apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
