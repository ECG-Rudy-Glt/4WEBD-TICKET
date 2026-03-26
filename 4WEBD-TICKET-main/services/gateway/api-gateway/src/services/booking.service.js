const BOOKING_URL = process.env.BOOKING_URL;

export async function getAllTickets(page = 1, limit = 10) {
    const response = await fetch(`${BOOKING_URL}?page=${page}&limit=${limit}`);
    return response.json();
}

export async function updateTicketStatus(id, body) {
    const response = await fetch(`${BOOKING_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw { status: response.status, message: "Erreur mise à jour statut" };
    return response.json();
}

export async function getTicketsByUser(userId) {
    const response = await fetch(`${BOOKING_URL}/user/${userId}`);
    const body = await response.json();
    return Array.isArray(body) ? body : (body.data || []);
}

export async function getTicketsByEvent(eventId) {
    const response = await fetch(`${BOOKING_URL}/event/${eventId}`);
    const body = await response.json();
    return Array.isArray(body) ? body : (body.data || []);
}

export async function getTicketById(id) {
    const response = await fetch(`${BOOKING_URL}/${id}`);
    if (!response.ok) throw { status: 404, message: "Billet non trouvé" };
    return response.json();
}
