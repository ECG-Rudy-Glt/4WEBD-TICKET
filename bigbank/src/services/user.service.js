const USER_URL = process.env.USER_URL || 'http://localhost:3004/users';

export async function createUser(data){
    const response = await fetch(USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if(!response.ok){
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }

    return response.json();
}

export async function getAllUsers() {
    const response = await fetch(`${USER_URL}?role=customer`);
    const result = await response.json();
    return result.data || result;
}

export async function getUserById(id){
    const response = await fetch(`${USER_URL}/${id}`);
    if(!response.ok){
        throw { status: 404, message:"Utilisateur non trouvé" };
    }
    return response.json();
}

export async function updateUser(id, data) {
    const response = await fetch(`${USER_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if(!response.ok) {
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function deleteUser(id) {
    const response = await fetch(`${USER_URL}/${id}`, {
        method: 'DELETE'
    });
    if(!response.ok) {
        throw { status: 404, message: "Utilisateur non trouvé"};
    }
}

