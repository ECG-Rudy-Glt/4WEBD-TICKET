(function () {
    const API = 'http://localhost:3030';
    let token = localStorage.getItem('token');
    let currentEventId = null;

    // ── Navigation ────────────────────────────────────────
    window.showPage = function (name) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + name).classList.add('active');
        if (name === 'events')     loadEvents();
        if (name === 'my-tickets') loadMyTickets();
    };

    function getPayload() {
        if (!token) return null;
        try {
            const p = token.split('.')[1];
            return JSON.parse(atob(p + '='.repeat((4 - p.length % 4) % 4)));
        } catch (_) { return null; }
    }

    function updateNav() {
        const payload = getPayload();
        document.getElementById('nav-auth').style.display = token ? 'none' : '';
        document.getElementById('nav-user').style.display = token ? '' : 'none';
        document.getElementById('nav-admin').style.display = (payload && payload.role === 'admin') ? '' : 'none';
    }

    function showMsg(id, text, ok) {
        const el = document.getElementById(id);
        el.className = 'message ' + (ok ? 'success' : 'error');
        el.textContent = text;
    }

    // ── HTTP helper ───────────────────────────────────────
    async function api(path, options = {}) {
        const res = await fetch(API + path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(options.headers || {})
            }
        });
        const data = await res.json();
        if (!res.ok) throw data;
        return data;
    }

    // ── Events ────────────────────────────────────────────
    async function loadEvents() {
        const list = document.getElementById('events-list');
        try {
            const result = await api('/events');
            const events = result.data || result;
            if (!events.length) { list.innerHTML = '<p style="color:#8b949e">Aucun événement disponible.</p>'; return; }
            list.innerHTML = events.map(e => `
                <div class="card">
                    <h3>${e.title}</h3>
                    <p>${new Date(e.date).toLocaleString('fr-FR')} — ${e.venue}</p>
                    <p>${e.availableTickets} place(s) · ${(e.priceInCents / 100).toFixed(2)} €</p>
                    <button class="btn-secondary" onclick="openBuy(${e.id})">Acheter un billet</button>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p style="color:#f85149">Erreur de chargement.</p>';
        }
    }

    window.openBuy = async function (eventId) {
        if (!token) { showPage('login'); return; }
        currentEventId = eventId;
        try {
            const e = await api('/events/' + eventId);
            document.getElementById('buy-event-info').innerHTML = `
                <h3>${e.title}</h3>
                <p>${new Date(e.date).toLocaleString('fr-FR')} — ${e.venue}</p>
                <p>${(e.priceInCents / 100).toFixed(2)} € / billet</p>
            `;
            document.getElementById('buy-msg').innerHTML = '';
            showPage('buy');
        } catch (e) {
            alert("Impossible de charger l'événement.");
        }
    };

    window.buyTicket = async function () {
        const qty  = parseInt(document.getElementById('buy-qty').value);
        const card = document.getElementById('buy-card').value.trim();
        if (!card || card.length < 16) {
            showMsg('buy-msg', 'Numéro de carte invalide (16 chiffres).', false);
            return;
        }
        try {
            await api('/bookings', {
                method: 'POST',
                body: JSON.stringify({ eventId: currentEventId, quantity: qty, cardToken: card })
            });
            showMsg('buy-msg', 'Réservation envoyée ! Vous recevrez une confirmation sous peu.', true);
        } catch (e) {
            showMsg('buy-msg', e.error || 'Erreur lors de la réservation.', false);
        }
    };

    // ── Tickets ───────────────────────────────────────────
    async function loadMyTickets() {
        const list = document.getElementById('tickets-list');
        if (!token) { list.innerHTML = '<p style="color:#8b949e">Connectez-vous pour voir vos billets.</p>'; return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const tickets = await api('/tickets/user/' + payload.id);
            if (!tickets.length) { list.innerHTML = '<p style="color:#8b949e">Aucun billet.</p>'; return; }
            list.innerHTML = tickets.map(t => `
                <div class="card">
                    <h3>Billet #${t.id} <span class="badge badge-${t.status}">${t.status}</span></h3>
                    <p>Code : <strong>${t.ticketCode}</strong></p>
                    <p>${t.quantity} place(s) · ${(t.priceInCents / 100).toFixed(2)} €</p>
                    <p>${new Date(t.createdAt).toLocaleString('fr-FR')}</p>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p style="color:#f85149">Erreur de chargement.</p>';
        }
    }

    // ── Auth ──────────────────────────────────────────────
    window.login = async function () {
        try {
            const res = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email:    document.getElementById('login-email').value,
                    password: document.getElementById('login-pwd').value
                })
            });
            token = res.token;
            localStorage.setItem('token', token);
            updateNav();
            showPage('events');
        } catch (e) {
            showMsg('login-msg', e.error || 'Identifiants invalides.', false);
        }
    };

    window.register = async function () {
        try {
            const res = await api('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    firstname: document.getElementById('reg-firstname').value,
                    lastname:  document.getElementById('reg-lastname').value,
                    email:     document.getElementById('reg-email').value,
                    password:  document.getElementById('reg-pwd').value
                })
            });
            token = res.token;
            localStorage.setItem('token', token);
            updateNav();
            showPage('events');
        } catch (e) {
            showMsg('register-msg', e.error || "Erreur lors de l'inscription.", false);
        }
    };

    window.logout = function () {
        token = null;
        localStorage.removeItem('token');
        updateNav();
        showPage('events');
    };

    // ── Admin ─────────────────────────────────────────────
    async function adminLoadEvents() {
        const list = document.getElementById('admin-events-list');
        try {
            const result = await api('/events');
            const events = result.data || result;
            if (!events.length) { list.innerHTML = '<p style="color:#8b949e">Aucun événement.</p>'; return; }
            list.innerHTML = events.map(e => `
                <div class="card" style="margin-bottom:8px">
                    <strong>${e.title}</strong> — ${e.availableTickets}/${e.maxCapacity} places · ${(e.priceInCents/100).toFixed(2)} €
                    <span style="float:right">
                        <button class="btn-secondary" onclick="adminDeleteEvent(${e.id})">Supprimer</button>
                    </span>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p style="color:#f85149">Erreur.</p>';
        }
    }

    async function adminLoadUsers() {
        const list = document.getElementById('admin-users-list');
        try {
            const result = await api('/auth/users');
            const users = result.data || result;
            if (!users.length) { list.innerHTML = '<p style="color:#8b949e">Aucun utilisateur.</p>'; return; }
            list.innerHTML = users.map(u => `
                <div class="card" style="margin-bottom:8px">
                    <strong>${u.firstname} ${u.lastname}</strong> — ${u.email}
                    <span class="badge badge-${u.role}" style="margin-left:8px">${u.role}</span>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p style="color:#f85149">Erreur.</p>';
        }
    }

    window.adminCreateEvent = async function () {
        const dateVal = document.getElementById('adm-date').value;
        try {
            await api('/events', {
                method: 'POST',
                body: JSON.stringify({
                    title:       document.getElementById('adm-title').value,
                    description: document.getElementById('adm-desc').value,
                    date:        dateVal ? new Date(dateVal).toISOString() : '',
                    venue:       document.getElementById('adm-venue').value,
                    maxCapacity: parseInt(document.getElementById('adm-capacity').value),
                    priceInCents: parseInt(document.getElementById('adm-price').value)
                })
            });
            showMsg('admin-event-msg', 'Événement créé !', true);
            adminLoadEvents();
        } catch (e) {
            showMsg('admin-event-msg', e.error || 'Erreur lors de la création.', false);
        }
    };

    window.adminDeleteEvent = async function (id) {
        if (!confirm('Supprimer cet événement ?')) return;
        try {
            await api('/events/' + id, { method: 'DELETE' });
            adminLoadEvents();
        } catch (e) {
            alert(e.error || 'Erreur suppression.');
        }
    };

    // Patch showPage to load admin data
    const _showPage = window.showPage;
    window.showPage = function (name) {
        _showPage(name);
        if (name === 'admin') { adminLoadEvents(); adminLoadUsers(); }
    };

    // ── Init ──────────────────────────────────────────────
    updateNav();
    loadEvents();
})();
