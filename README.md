# 4WEBD-TICKET
this repo contain the code of 4WEBD Project for supinfo

database on master 

[ CONTAINER POSTGRES MASTER ]
|
|-- Instance de Processus (Le moteur SQL)
|   |
|   |-- Base : "db_auth"    <-- (Accès réservé au micro-service Auth)
|   |-- Base : "db_user"    <-- (Accès réservé au micro-service User)
|   |-- Base : "db_event"   <-- (Accès réservé au micro-service Event)
|   |-- Base : "db_booking" <-- (Accès réservé au micro-service Booking)
|   |-- Base : "db_payment" <-- (Accès réservé au micro-service Payment)
|
|-- Gestion des logs de transaction (WAL)
|-- Envoi des données vers les SLAVES (Réplication)