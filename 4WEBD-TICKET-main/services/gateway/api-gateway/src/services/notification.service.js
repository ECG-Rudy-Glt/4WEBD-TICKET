const NOTIFICATION_URL = process.env.NOTIFICATION_URL;

export async function getAllNotifications(page = 1, limit = 10) {
    const response = await fetch(`${NOTIFICATION_URL}?page=${page}&limit=${limit}`);
    return response.json();
}

export async function getNotificationsByUser(userId, page = 1, limit = 10) {
    const response = await fetch(`${NOTIFICATION_URL}/user/${userId}?page=${page}&limit=${limit}`);
    return response.json();
}
