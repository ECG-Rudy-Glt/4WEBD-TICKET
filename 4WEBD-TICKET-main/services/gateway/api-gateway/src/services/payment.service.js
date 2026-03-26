const PAYMENT_URL = process.env.PAYMENT_URL;

export async function getAllPayments(page = 1, limit = 10) {
    const response = await fetch(`${PAYMENT_URL}?page=${page}&limit=${limit}`);
    return response.json();
}

export async function getPaymentsByUser(userId, page = 1, limit = 10) {
    const response = await fetch(`${PAYMENT_URL}/user/${userId}?page=${page}&limit=${limit}`);
    return response.json();
}

export async function getPaymentById(id) {
    const response = await fetch(`${PAYMENT_URL}/${id}`);
    if (!response.ok) throw { status: 404, message: "Paiement non trouvé" };
    return response.json();
}
