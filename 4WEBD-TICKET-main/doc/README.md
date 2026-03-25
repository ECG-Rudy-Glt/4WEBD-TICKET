Step 1: Base subject
Groups of 2 students

You are in charge of building a new system to handle concerts and events tickets.
You already know that your system will be used by both small business (maybe a school organizing an event) or by international star for a "tour".

Your SaaS system should be able to handle that workload and be optimized as best as you can.



Features:
- API to CRUD (Create, Read, Update, Delete) all informations relatives to events
- API to CRUD all informations relative to users
- API to handle authentification / authorization
- API to handle buying tickets

You will need to send confirmation about each "buy" operation - you can send and email or an SMS confirmation (no need to pay for such service you can just simulate that being an asynchronous call)

You need to have a full operational and easy to deploy solution based on the technologies you choose.

There is no specific recommendation just the end result is expected.

You have to think about the risk for each operation, criticity of each HTTP calls and what could be the impact if some requests are not processed.
In case of some error in the process, the user need to be notified accordingly.
If such scenario happens you need to be able to find logs usefull for debugging purpose

Step 2: Questions

Student questions

<!-- Y a t il une technologie ou architecture particuliere => Pas de techno particuliere / Architecture Micro Service -->
<!-- Cas d'usage specifiques comme types d events => Chaque event a un nombre de place max (pas de survente) -->
<!-- System d'auth => Admin, EventCreator - Operator, User (listing de tous les achats / billets), User -->
System de langue => Anglais / France (pas besoin d internationalization)
<!-- Ticket numerote => pour de la securite on doit pouvoir matcher le ticket avec l'utilisateur -->
Contraintes techniques => Pas de temps minimal (-300ms)
Contraintes legals => backup a interval regulier la base payment
BDD security => pas de mdp en clair.
Qualite => Le code doit etre teste. Il faut que le projet puisse etre lance facilement (+ tests)
Documentation => Swagger / OpenAPI definition des endpoints. Un schema sur votre architecture + choix
LoadBalancer = > Au moins une explication de la config (ou et comment)
Mail => Pas besoin de payer un system de mail
Achat ticket => Par CB





Rules:
Based on the first information in the description you can ask me all the questions you want and write them all.

I will review them and provide an answer and update the base document

The purpose of it is for you to use your knowledge to challenge the business on the solution, see the questions you need to ask to fully understand the project you will be working on.
As the course is not finished yet, it is normal if you don't have all the questions, Another round of this "play" will be done the last day to finalize the validation of the project.