import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const NOTIFICATION_QUEUE = 'notifications';

let notifChannel = null;

const ACCOUNT_URL = process.env.ACCOUNT_URL || 'http://localhost:3003/accounts';

let transactions = [];
let nextId = 1;

export async function createTransaction(data) {
    const fromAccount = await getAccount(data.fromAccountId);
    const toAccount = await getAccount(data.toAccountId);

    if (data.fromAccountId === data.toAccountId){
        throw { status: 400, message: "Impossible de transférer vers le même compte" };
    }

    if (fromAccount.balance < data.amount){
        throw { status: 400, message: "Solde insuffisant" };
    }

    await updateBalance(data.fromAccountId, -data.amount);
    await updateBalance(data.toAccountId, data.amount);

    const transaction = {
        id: nextId++,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: data.amount,
        description: data.description || null,
        createdAt: new Date().toISOString()
    };

    transactions.push(transaction);
    await notifyTransfer(transaction, fromAccount, toAccount);
    return transaction;
}

export function getAllTransactions() {
    return transactions;
}

export function getTransactionsByAccount(accountId) {
    return transactions.filter(
        t => t.fromAccountId === accountId || t.toAccountId === accountId
    );
}

async function getAccount(accountId){
    const response = await fetch(`${ACCOUNT_URL}/${accountId}`);
    if(!response.ok){
        throw { status: 404, message: `Compte ${accountId} non trouvé` };
    }
    return response.json();
}

async function updateBalance(accountId, amount) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    });
    return response.json();
}

async function connectNotificationQueue() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        notifChannel = await connection.createChannel();
        await notifChannel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
        console.log(`Connecte a RabbitMQ, queue "${NOTIFICATION_QUEUE}" prete`);
    } catch (err) {
        console.error('Erreur connexion queue notifications:', err.message);
        setTimeout(connectNotificationQueue, 500);
    }
}

connectNotificationQueue();

async function notifyTransfer(transaction, fromAccount, toAccount){

        if (!notifChannel) {
            console.error('Queue notifications non connectee');
            return;
        }

        notifChannel.sendToQueue(
            NOTIFICATION_QUEUE,
            Buffer.from(JSON.stringify({
                fromAccount,
                toAccount,
                amount: transaction.amount,
                description: transaction.description
            })),
            { persistent: true }
        );
        console.log('Notification publiee dans la queue notifications');
}