const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://localhost:3002/notify';

export async function notifyTransfer(transaction, fromAccount, toAccount) {
    try {
        const response = await fetch(NOTIFICATION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromAccount,
                toAccount,
                amount: transaction.amount,
                description: transaction.description
            })
        });

        const result = await response.json();
        console.log('Notificaton service a répondu: ', result.message);
        return result;
    } catch (err) {
        console.error('Notification service indisponible: ', err.message);
        return { success: false, message: 'Service indisponible' };
    }
}