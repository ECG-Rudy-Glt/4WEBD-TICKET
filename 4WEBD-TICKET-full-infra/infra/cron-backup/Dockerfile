FROM node:20-alpine

WORKDIR /app
COPY backup.js .

# Exécute le backup toutes les 6 heures via un simple loop
CMD ["node", "backup.js"]
