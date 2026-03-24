import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const USER_URL   = process.env.USER_URL;

export async function register(data) {
    const res = await fetch(USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw { status: res.status, message: body.error || 'Erreur création utilisateur' };

    const token = jwt.sign({ id: body.id, email: body.email, role: body.role }, JWT_SECRET, { expiresIn: '24h' });
    return { user: body, token };
}

export async function login(data) {
    const res = await fetch(USER_URL + '/by-email/' + encodeURIComponent(data.email));
    const body = await res.json();
    if (!res.ok) throw { status: 401, message: "Email ou mot de passe invalide" };

    const valid = await bcrypt.compare(data.password, body.password);
    if (!valid) throw { status: 401, message: "Email ou mot de passe invalide" };

    const { password, ...safe } = body;
    const token = jwt.sign({ id: safe.id, email: safe.email, role: safe.role }, JWT_SECRET, { expiresIn: '24h' });
    return { user: safe, token };
}

export async function getAllUsers() {
    const res = await fetch(USER_URL);
    const body = await res.json();
    return body.data || body;
}
