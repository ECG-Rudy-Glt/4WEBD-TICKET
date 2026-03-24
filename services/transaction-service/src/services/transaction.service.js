import { publish } from '../rabbitmq.js';

const ACCOUNT_URL = process.env.ACCOUNT_SERVICE_URL || 'http://loadbalancer-account-service/accounts';

let transactions = [];
let nextId = 1;

export async function createTransaction(data, userId, userRole) {
    const fromAccount = await getAccount(data.fromAccountId);
    const toAccount = await getAccount(data.toAccountId);

    if (userRole === 'client') {
        if (fromAccount.userId !== userId) {
            throw { status: 403, message: "Vous ne pouvez transferer que depuis vos propres comptes" };
        }
    }

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

    // Notification async via RabbitMQ (remplace l'appel HTTP direct)
    await publish('transaction.completed', { transaction, fromAccount, toAccount });

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

