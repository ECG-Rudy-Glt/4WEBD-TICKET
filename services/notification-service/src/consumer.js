import amqp from 'amqplib';

const EXCHANGE = 'transactions';
const QUEUE = 'notification.transactions';

export async function startConsumer() {
    const url = process.env.RABBITMQ_URL || 'amqp://rabbitmq:rabbitmq@rabbitmq:5672';
    const conn = await amqp.connect(url);
    const channel = await conn.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, 'transaction.completed');

    channel.prefetch(1);
    channel.consume(QUEUE, (msg) => {
        if (!msg) return;
        try {
            const { transaction, fromAccount, toAccount } = JSON.parse(msg.content.toString());
            const timestamp = new Date().toLocaleString('fr-FR');

            console.log("\n======================================");
            console.log('NOTIFICATION SERVICE (RabbitMQ consumer)');
            console.log("======================================");
            console.log(`Date     : ${timestamp}`);
            console.log(`De       : Compte #${fromAccount.id} (${fromAccount.label})`);
            console.log(`Vers     : Compte #${toAccount.id} (${toAccount.label})`);
            console.log(`Montant  : ${transaction.amount} €`);
            console.log(`Desc.    : ${transaction.description || 'Aucune'}`);
            console.log("======================================\n");

            channel.ack(msg);
        } catch (err) {
            console.error('[Consumer] Erreur traitement message:', err.message);
            channel.nack(msg, false, false);
        }
    });

    console.log('[RabbitMQ] Consumer démarré, en attente de transaction.completed');
}
