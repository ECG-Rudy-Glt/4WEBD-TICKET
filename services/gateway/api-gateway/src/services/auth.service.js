const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001/auth';

export async function register(data) {
    const response = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const body = await response.json();
    if (!response.ok) throw { status: response.status, message: body.error || body.message };
    return body;
}

export async function login(data) {
    const response = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const body = await response.json();
    if (!response.ok) throw { status: response.status, message: body.error || body.message };
    return body;
}

export async function getAllUsers() {
    const response = await fetch(`${AUTH_URL}/users`);
    const body = await response.json();
    return Array.isArray(body) ? body : (body.data || []);
}
