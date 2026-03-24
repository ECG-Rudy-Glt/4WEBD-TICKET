import bcrypt from 'bcrypt';

let users = [];
let nextId = 1;

export async function createUser(data) {
    const existing = users.find(u => u.email === data.email);
    if(existing) {
        throw { status: 409, message: "Cet email est déjà utilisé" };
    }

    const hashedPassword  =await bcrypt.hash(data.password, 10);

    const user = {
        id: nextId ++,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        phone: data.phone || null,
        role: data.role || "customer",
        password: hashedPassword
    };

    users.push(user);
    return sanitize(user);
}

export function getAllUsers(role) {
    let result = users;
    if(role){
        result = users.filter(u => u.role === role);
    }
    return result.map(sanitize);
}

export function getUserById(id){
    const user = users.find(u => u.id ===id);
    if(!user){
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    return sanitize(user);
}

export async function updateUser(id, data) {
    const index = users.findIndex(u => u.id === id);
    if(index === -1) {
        throw { status: 404, message: "Utilisateur non trouvé"};
    }

    if (data.email && data.email !== users[index].email) {
        const emailTaken = users.find(u => u.email === data.email);
        if (emailTaken) {
            throw { status: 409, message: "Cet email est déjà utilisé" };
        }
    }
    
    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }

    users[index] = { ...users[index], ...data };
    return sanitize(users[index]);
}

export function deleteUser(id) {
    const index = users.findIndex(u => u.id === id);
    if(index === -1) {
        throw { status: 404, message: "Utilisateur non trouvé" };
    }
    users.splice(index, 1);
}

function sanitize(user){
    const { password, ...safe } = user;
    return safe;
}