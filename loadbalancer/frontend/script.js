const API = '/api';

function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(name).classList.remove('hidden');
}

function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    setTimeout(() => el.className = 'toast hidden', 3000);
}

function table(cols, rows) {
    if (!rows.length) return '<p>Aucun résultat.</p>';
    return `<table>
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}



document.getElementById('createUserForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    if (!body.phone) delete body.phone;
    try {
        const res = await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        toast(`Utilisateur #${data.id} créé`);
        e.target.reset();
    } catch (err) {
        toast(err.message, 'error');
    }
});

async function loadUsers() {
    try {
        const res = await fetch(`${API}/users`);
        const { data } = await res.json();
        document.getElementById('usersList').innerHTML = table(
            ['ID', 'Prénom', 'Nom', 'Email', 'Téléphone'],
            data.map(u => [u.id, u.firstname, u.lastname, u.email, u.phone])
        );
    } catch (err) {
        toast('Erreur chargement utilisateurs', 'error');
    }
}



document.getElementById('createAccountForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const userId = fd.get('userId');
    const body = { label: fd.get('label'), type: fd.get('type') };
    try {
        const res = await fetch(`${API}/users/${userId}/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        toast(`Compte #${data.id} créé`);
        e.target.reset();
    } catch (err) {
        toast(err.message, 'error');
    }
});

async function loadAccounts() {
    const userId = document.getElementById('accountsUserId').value;
    if (!userId) return toast('Entrez un ID utilisateur', 'error');
    try {
        const res = await fetch(`${API}/users/${userId}/accounts`);
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        document.getElementById('accountsList').innerHTML = table(
            ['ID', 'Label', 'Type', 'Solde'],
            data.map(a => [a.id, a.label, a.type, `${a.balance ?? 0} €`])
        );
    } catch (err) {
        toast(err.message, 'error');
    }
}


document.getElementById('createTransactionForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
        fromAccountId: parseInt(fd.get('fromAccountId')),
        toAccountId: parseInt(fd.get('toAccountId')),
        amount: parseFloat(fd.get('amount')),
        description: fd.get('description') || undefined
    };
    try {
        const res = await fetch(`${API}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        toast('Virement effectué');
        e.target.reset();
    } catch (err) {
        toast(err.message, 'error');
    }
});

async function loadTransactions() {
    try {
        const res = await fetch(`${API}/transactions`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data.data ?? []);
        document.getElementById('transactionsList').innerHTML = table(
            ['ID', 'De', 'Vers', 'Montant', 'Description'],
            rows.map(t => [t.id, t.fromAccountId, t.toAccountId, `${t.amount} €`, t.description])
        );
    } catch (err) {
        toast('Erreur chargement transactions', 'error');
    }
}
