-- Initialisation des bases de données et utilisateurs par service
-- Ce script est exécuté au démarrage du PostgreSQL primaire

-- Auth service
CREATE USER auth_user WITH PASSWORD 'auth_pass';
CREATE DATABASE auth_db OWNER auth_user;

-- Booking service
CREATE USER booking_user WITH PASSWORD 'booking_pass';
CREATE DATABASE booking_db OWNER booking_user;

-- Payment service
CREATE USER payment_user WITH PASSWORD 'payment_pass';
CREATE DATABASE payment_db OWNER payment_user;

-- Notification service
CREATE USER notif_user WITH PASSWORD 'notif_pass';
CREATE DATABASE notif_db OWNER notif_user;
