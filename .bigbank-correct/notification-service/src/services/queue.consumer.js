import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'notifications';

export async function startNotificationConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        channel.prefetch(1);

        console.log(`En attente de notifications sur la queue "${QUEUE_NAME}"...`);

        channel.consume(QUEUE_NAME, (msg) => {
            if (msg) {
                const { fromAccount, toAccount, amount, description } = JSON.parse(msg.content.toString());
                const timestamp = new Date().toLocaleString('fr-FR');

                console.log("\n=================================");
                console.log('NOTIFICATION SERVICE (via RabbitMQ)');
                console.log("===================================");
                console.log(`Date     : ${timestamp}`);
                console.log(`De       : Compte #${fromAccount.id} (${fromAccount.label}`);
                console.log(`Vers     : Compte #${toAccount.id} (${toAccount.label}`);
                console.log(`Montant  : ${amount} EUR`);
                console.log(`Desc.    : ${description || 'Aucune'}`);
                console.log("\n=================================");

                channel.ack(msg);
                console.log('Notification traitee et acquittee');
            }
        });
    } catch (err) {
        console.log('Erreur connexion RabbitMQ notification consumer:', err.message);
        setTimeout(startNotificationConsumer, 5000);
    }
}