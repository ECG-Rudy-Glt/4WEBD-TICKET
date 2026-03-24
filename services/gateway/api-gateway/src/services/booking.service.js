const BOOKING_URL = process.env.BOOKING_URL;

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
