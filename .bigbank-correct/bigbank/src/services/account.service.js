const ACCOUNT_URL = process.env.ACCOUNT_URL || 'http://localhost:3003/accounts';

export async function createAccount(userId, data) {
    const response = await fetch(ACCOUNT_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data })
    });
    if(!response.ok){
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function getAccountsByUser(userId) {
    const response = await fetch(`${ACCOUNT_URL}/user/${userId}`);
    return response.json();
}

export async function getAccountById(accountId) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}`);
    if(!response.ok) {
        throw { status: 404, message: "Compte non trouvé" };
    }
    return response.json();
}

export async function getAccountByIdOnly(accountId) {
    return getAccountById(accountId);
}

export async function updateAccount(userId, accountId, data) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}` , {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if(!response.ok){
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function deleteAccount(userId, accountId) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}`, {
        method: 'DELETE'
    });
    if(!response.ok) {
        throw { status: 404, message: "Compte non trouvé" };
    }
}

export async function updateBalance(accountId, amount) {
    const response = await fetch(`${ACCOUNT_URL}/${accountId}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ amount })
    });
    return response.json();
}