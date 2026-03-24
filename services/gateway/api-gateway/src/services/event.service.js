const EVENT_URL = process.env.EVENT_URL;

export async function createEvent(data) {
    const response = await fetch(EVENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function getAllEvents(query = '') {
    const response = await fetch(`${EVENT_URL}${query ? '?' + query : ''}`);
    const body = await response.json();
    return Array.isArray(body) ? body : (body.data || []);
}

export async function getEventById(id) {
    const response = await fetch(`${EVENT_URL}/${id}`);
    if (!response.ok) {
        throw { status: 404, message: "Événement non trouvé" };
    }
    return response.json();
}

export async function updateEvent(id, data) {
    const response = await fetch(`${EVENT_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw { status: response.status, message: err.error || err.message };
    }
    return response.json();
}

export async function deleteEvent(id) {
    const response = await fetch(`${EVENT_URL}/${id}`, { method: 'DELETE' });
    if (!response.ok) {
        throw { status: 404, message: "Événement non trouvé" };
    }
}
