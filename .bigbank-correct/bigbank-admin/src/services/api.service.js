const USER_URL = process.env.USER_URL || 'http://localhost:3004/users';
const ACCOUNT_URL = process.env.ACCOUNT_URL || 'http://localhost:3003/accounts';
const TRANSACTION_URL = process.env.TRANSACTION_URL || 'http://localhost:3005/transactions';

async function callApi(url){
    const response = await fetch(url);
    if(!response.ok){
        throw{ status: response.status, message: `Erreur API: ${response.statusText}` };
    }
    return response.json();
}

export async function getAllUsers(){
    const result = await callApi(USER_URL);
    return result.data || result;
}

export async function getUserById(id){
    return callApi(`${USER_URL}/${id}`);
}

export async function getAccountsByUser(userId) {
    const result = await callApi(`${ACCOUNT_URL}/user/${userId}`);
    return result.data || result;
}

export async function getAllTransactions() {
    const result = await callApi(TRANSACTION_URL);
    return result.data || result;
}

export async function getFullOverview() {
    const users = await getAllUsers();

    const overview = await Promise.all(
        users.map(async (user) => {
            const accounts = await getAccountsByUser(user.id);
            return { ...user, accounts };
        })
    );

    const transactions = await getAllTransactions();
    return { users: overview, transactions}
}