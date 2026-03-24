const TRANSACTION_URL = 'http://loadbalancer-transaction-service/transactions';

export async function createTransaction(data, userId, userRole) {
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers['x-user-id'] = String(userId);
    if (userRole) headers['x-user-role'] = String(userRole);

    const response = await fetch(TRANSACTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    if(!response.ok){
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function getAllTransactions(page = 1, limit = 10){
    const response = await fetch(`${TRANSACTION_URL}?page=${page}&limit=${limit}`);
    if(!response.ok) throw {status: response.status, message: 'Erreur transaction-service'};
    return response.json();
}

export async function getTransactionsByAccount(accountId) {
    const response = await fetch(`${TRANSACTION_URL}/account/${accountId}`);
    if (!response.ok) throw { status: response.status, message: 'Erreur transaction-service' };
    return response.json();
}