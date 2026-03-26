const TRANSLATIONS = {
    fr: {
        // Navigation
        nav_events: 'Événements',
        nav_my_tickets: 'Mes billets',
        nav_login: 'Connexion',
        nav_register: 'Inscription',
        nav_admin: 'Admin',
        nav_logout: 'Déconnexion',

        // Events page
        events_title: 'Événements disponibles',
        events_loading: 'Chargement...',
        events_none: 'Aucun événement disponible.',
        events_load_error: 'Erreur de chargement.',
        events_buy_btn: 'Acheter un billet',
        events_seats: 'place(s)',

        // Buy page
        buy_back: '← Retour',
        buy_title: 'Acheter un billet',
        buy_qty_label: 'Quantité',
        buy_card_label: 'Numéro de carte (simulé)',
        buy_card_placeholder: '1234567890123456',
        buy_submit: "Confirmer l'achat",
        buy_card_invalid: 'Numéro de carte invalide (16 chiffres).',
        buy_success: 'Réservation envoyée ! Vous recevrez une confirmation sous peu.',
        buy_event_load_error: "Impossible de charger l'événement.",
        buy_price_per_ticket: '/ billet',

        // My tickets page
        tickets_title: 'Mes billets',
        tickets_login_required: 'Connectez-vous pour voir vos billets.',
        tickets_none: 'Aucun billet.',
        tickets_load_error: 'Erreur de chargement.',
        tickets_code_label: 'Code :',
        tickets_seats: 'place(s)',

        // Login page
        login_title: 'Connexion',
        login_email_label: 'Email',
        login_email_placeholder: 'email@exemple.com',
        login_pwd_label: 'Mot de passe',
        login_submit: 'Se connecter',

        // Register page
        register_title: 'Inscription',
        register_firstname_label: 'Prénom',
        register_lastname_label: 'Nom',
        register_email_label: 'Email',
        register_pwd_label: 'Mot de passe',
        register_submit: "S'inscrire",

        // Admin page
        admin_title: 'Administration',
        admin_create_event_title: 'Créer un événement',
        admin_field_title: 'Titre',
        admin_field_desc: 'Description',
        admin_field_date: 'Date',
        admin_field_venue: 'Lieu',
        admin_field_capacity: 'Capacité max',
        admin_field_price: 'Prix (centimes)',
        admin_create_btn: "Créer l'événement",
        admin_events_list_title: 'Tous les événements',
        admin_events_loading: 'Chargement...',
        admin_events_none: 'Aucun événement.',
        admin_events_load_error: 'Erreur.',
        admin_users_title: 'Utilisateurs',
        admin_users_loading: 'Chargement...',
        admin_users_none: 'Aucun utilisateur.',
        admin_users_load_error: 'Erreur.',
        admin_search_ticket_title: 'Chercher un billet',
        admin_ticket_id_placeholder: 'ID du billet',
        admin_search_btn: 'Chercher',
        admin_tickets_title: 'Billets',
        admin_close_btn: 'Fermer',
        admin_tickets_btn: 'Billets',
        admin_delete_btn: 'Supprimer',
        admin_delete_confirm: 'Supprimer cet événement ?',
        admin_delete_error: 'Erreur suppression.',
        admin_event_created: 'Événement créé !',
        admin_tickets_for_event: 'Billets pour :',
        admin_tickets_for_user: 'Billets de :',
        admin_ticket_by_id: 'Billet #',
        admin_tickets_none: 'Aucun billet trouvé.',
        admin_seats: 'place(s)',

        // Generic
        error_generic: 'Une erreur est survenue.',
        code_label: 'Code:',

        // Lang switcher
        lang_fr: 'FR',
        lang_en: 'EN',

        // Date locale
        date_locale: 'fr-FR',
    },

    en: {
        // Navigation
        nav_events: 'Events',
        nav_my_tickets: 'My Tickets',
        nav_login: 'Login',
        nav_register: 'Register',
        nav_admin: 'Admin',
        nav_logout: 'Logout',

        // Events page
        events_title: 'Available Events',
        events_loading: 'Loading...',
        events_none: 'No events available.',
        events_load_error: 'Loading error.',
        events_buy_btn: 'Buy a ticket',
        events_seats: 'seat(s)',

        // Buy page
        buy_back: '← Back',
        buy_title: 'Buy a ticket',
        buy_qty_label: 'Quantity',
        buy_card_label: 'Card number (simulated)',
        buy_card_placeholder: '1234567890123456',
        buy_submit: 'Confirm purchase',
        buy_card_invalid: 'Invalid card number (16 digits).',
        buy_success: 'Booking sent! You will receive a confirmation shortly.',
        buy_event_load_error: 'Unable to load event.',
        buy_price_per_ticket: '/ ticket',

        // My tickets page
        tickets_title: 'My Tickets',
        tickets_login_required: 'Please log in to see your tickets.',
        tickets_none: 'No tickets.',
        tickets_load_error: 'Loading error.',
        tickets_code_label: 'Code:',
        tickets_seats: 'seat(s)',

        // Login page
        login_title: 'Login',
        login_email_label: 'Email',
        login_email_placeholder: 'email@example.com',
        login_pwd_label: 'Password',
        login_submit: 'Sign in',

        // Register page
        register_title: 'Register',
        register_firstname_label: 'First name',
        register_lastname_label: 'Last name',
        register_email_label: 'Email',
        register_pwd_label: 'Password',
        register_submit: 'Sign up',

        // Admin page
        admin_title: 'Administration',
        admin_create_event_title: 'Create an event',
        admin_field_title: 'Title',
        admin_field_desc: 'Description',
        admin_field_date: 'Date',
        admin_field_venue: 'Venue',
        admin_field_capacity: 'Max capacity',
        admin_field_price: 'Price (cents)',
        admin_create_btn: 'Create event',
        admin_events_list_title: 'All events',
        admin_events_loading: 'Loading...',
        admin_events_none: 'No events.',
        admin_events_load_error: 'Error.',
        admin_users_title: 'Users',
        admin_users_loading: 'Loading...',
        admin_users_none: 'No users.',
        admin_users_load_error: 'Error.',
        admin_search_ticket_title: 'Search a ticket',
        admin_ticket_id_placeholder: 'Ticket ID',
        admin_search_btn: 'Search',
        admin_tickets_title: 'Tickets',
        admin_close_btn: 'Close',
        admin_tickets_btn: 'Tickets',
        admin_delete_btn: 'Delete',
        admin_delete_confirm: 'Delete this event?',
        admin_delete_error: 'Delete error.',
        admin_event_created: 'Event created!',
        admin_tickets_for_event: 'Tickets for:',
        admin_tickets_for_user: 'Tickets by:',
        admin_ticket_by_id: 'Ticket #',
        admin_tickets_none: 'No tickets found.',
        admin_seats: 'seat(s)',

        // Generic
        error_generic: 'An error occurred.',
        code_label: 'Code:',

        // Lang switcher
        lang_fr: 'FR',
        lang_en: 'EN',

        // Date locale
        date_locale: 'en-US',
    }
};

let currentLang = localStorage.getItem('lang') || 'fr';

function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) ||
           (TRANSLATIONS['fr'][key]) || key;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    applyTranslations();
    if (typeof refreshCurrentPage === 'function') refreshCurrentPage();
}

function applyTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });
}
