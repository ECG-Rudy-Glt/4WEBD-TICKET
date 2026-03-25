(function () {
    const API = '/api';
    let token = localStorage.getItem('token');
    let currentEventId = null;
    let currentPage = 'events';

    // ── Navigation ────────────────────────────────────────
    window.showPage = function (name) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + name).classList.add('active');
        currentPage = name;
        if (name === 'events')     loadEvents();
        if (name === 'my-tickets') loadMyTickets();
    };

    // Called by i18n when language changes — reloads dynamic content
    window.refreshCurrentPage = function () {
        if (currentPage === 'events')     loadEvents();
        if (currentPage === 'my-tickets') loadMyTickets();
        if (currentPage === 'admin') {
            const payload = getPayload();
            const isAdmin = payload && payload.role === 'admin';
            adminLoadEvents();
            if (isAdmin) adminLoadUsers();
        }
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
        document.getElementById('nav-admin').style.display = (payload && (payload.role === 'admin' || payload.role === 'operator')) ? '' : 'none';
    }

    function showMsg(id, text, ok) {
        const el = document.getElementById(id);
        el.className = 'message ' + (ok ? 'success' : 'error');
        el.textContent = text;
    }

    function errMsg(e) {
        if (e && Array.isArray(e.errors)) return e.errors.map(err => err.message).join(', ');
        if (e && e.error) {
            try {
                const parsed = JSON.parse(e.error);
                if (Array.isArray(parsed)) return parsed.map(err => err.message).join(', ');
            } catch (_) {}
            return e.error;
        }
        return t('error_generic');
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
        const data = res.status !== 204 ? await res.json() : null;
        if (!res.ok) throw data;
        return data;
    }

    // ── Events ────────────────────────────────────────────
    async function loadEvents() {
        const list = document.getElementById('events-list');
        try {
            const result = await api('/events');
            const events = result.data || result;
            if (!events.length) {
                list.innerHTML = `<p style="color:#8b949e">${t('events_none')}</p>`;
                return;
            }
            list.innerHTML = events.map(e => `
                <div class="card">
                    <h3>${e.title}</h3>
                    <p>${new Date(e.date).toLocaleString(t('date_locale'))} — ${e.venue}</p>
                    <p>${e.availableTickets} ${t('events_seats')} · ${(e.priceInCents / 100).toFixed(2)} €</p>
                    <button class="btn-secondary" onclick="openBuy(${e.id})">${t('events_buy_btn')}</button>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = `<p style="color:#f85149">${t('events_load_error')}</p>`;
        }
    }

    window.openBuy = async function (eventId) {
        if (!token) { showPage('login'); return; }
        currentEventId = eventId;
        try {
            const e = await api('/events/' + eventId);
            document.getElementById('buy-event-info').innerHTML = `
                <h3>${e.title}</h3>
                <p>${new Date(e.date).toLocaleString(t('date_locale'))} — ${e.venue}</p>
                <p>${(e.priceInCents / 100).toFixed(2)} € ${t('buy_price_per_ticket')}</p>
            `;
            document.getElementById('buy-msg').innerHTML = '';
            showPage('buy');
        } catch (e) {
            alert(t('buy_event_load_error'));
        }
    };

    window.buyTicket = async function () {
        const qty  = parseInt(document.getElementById('buy-qty').value);
        const card = document.getElementById('buy-card').value.trim();
        if (!card || card.length < 16) {
            showMsg('buy-msg', t('buy_card_invalid'), false);
            return;
        }
        try {
            await api('/bookings', {
                method: 'POST',
                body: JSON.stringify({ eventId: currentEventId, quantity: qty, cardToken: card })
            });
            showMsg('buy-msg', t('buy_success'), true);
        } catch (e) {
            showMsg('buy-msg', errMsg(e), false);
        }
    };

    // ── Tickets ───────────────────────────────────────────
    async function loadMyTickets() {
        const list = document.getElementById('tickets-list');
        if (!token) {
            list.innerHTML = `<p style="color:#8b949e">${t('tickets_login_required')}</p>`;
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const tickets = await api('/tickets/user/' + payload.id);
            if (!tickets.length) {
                list.innerHTML = `<p style="color:#8b949e">${t('tickets_none')}</p>`;
                return;
            }
            list.innerHTML = tickets.map(tk => `
                <div class="card">
                    <h3>${t('admin_ticket_by_id')}${tk.id} <span class="badge badge-${tk.status}">${tk.status}</span></h3>
                    <p>${t('tickets_code_label')} <strong>${tk.ticketCode}</strong></p>
                    <p>${tk.quantity} ${t('tickets_seats')} · ${(tk.priceInCents / 100).toFixed(2)} €</p>
                    <p>${new Date(tk.createdAt).toLocaleString(t('date_locale'))}</p>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = `<p style="color:#f85149">${t('tickets_load_error')}</p>`;
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
            showMsg('login-msg', errMsg(e), false);
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
            showMsg('register-msg', errMsg(e), false);
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
            if (!events.length) {
                list.innerHTML = `<p style="color:#8b949e">${t('admin_events_none')}</p>`;
                return;
            }
            list.innerHTML = events.map(e => `
                <div class="card card-row">
                    <div style="flex-grow:1"><strong>${e.title}</strong> — ${e.availableTickets}/${e.maxCapacity} ${t('admin_seats')} · ${(e.priceInCents/100).toFixed(2)} €</div>
                    <div style="display:flex; gap:8px">
                        <button class="btn-secondary" onclick="adminLoadTicketsByEvent(${e.id}, '${e.title.replace(/'/g, "\\'")}')">${t('admin_tickets_btn')}</button>
                        <button class="btn-secondary" style="border-color:#dc2626; color:#dc2626" onclick="adminDeleteEvent(${e.id})">${t('admin_delete_btn')}</button>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = `<p style="color:#f85149">${t('admin_events_load_error')}</p>`;
        }
    }

    async function adminLoadUsers() {
        const list = document.getElementById('admin-users-list');
        try {
            const result = await api('/users');
            const users = result.data || result;
            if (!users.length) {
                list.innerHTML = `<p style="color:#8b949e">${t('admin_users_none')}</p>`;
                return;
            }
            list.innerHTML = users.map(u => `
                <div class="card card-row" style="margin-bottom:8px">
                    <div style="flex-grow:1">
                        <strong>${u.firstname} ${u.lastname}</strong> — ${u.email}
                        <span class="badge badge-${u.role}" style="margin-left:8px">${u.role}</span>
                    </div>
                    <button class="btn-secondary" onclick="adminLoadTicketsByUser(${u.id}, '${u.firstname.replace(/'/g, "\\'")} ${u.lastname.replace(/'/g, "\\'")}')">${t('admin_tickets_btn')}</button>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = `<p style="color:#f85149">${t('admin_users_load_error')}</p>`;
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
            showMsg('admin-event-msg', t('admin_event_created'), true);
            adminLoadEvents();
        } catch (e) {
            showMsg('admin-event-msg', errMsg(e), false);
        }
    };

    window.adminDeleteEvent = async function (id) {
        if (!confirm(t('admin_delete_confirm'))) return;
        try {
            await api('/events/' + id, { method: 'DELETE' });
            adminLoadEvents();
        } catch (e) {
            alert(e.error || t('admin_delete_error'));
        }
    };

    // ── Admin Tickets ─────────────────────────────────────
    window.adminLoadTicketsByEvent = async function (eventId, title) {
        try {
            const tickets = await api('/tickets/event/' + eventId);
            renderAdminTickets(tickets, `${t('admin_tickets_for_event')} ${title}`);
        } catch (e) { alert(errMsg(e)); }
    };

    window.adminLoadTicketsByUser = async function (userId, name) {
        try {
            const tickets = await api('/tickets/user/' + userId);
            renderAdminTickets(tickets, `${t('admin_tickets_for_user')} ${name}`);
        } catch (e) { alert(errMsg(e)); }
    };

    window.adminLoadTicketById = async function () {
        const id = document.getElementById('adm-ticket-id').value;
        if (!id) return;
        try {
            const ticket = await api('/tickets/' + id);
            renderAdminTickets([ticket], `${t('admin_ticket_by_id')}${id}`);
        } catch (e) { alert(errMsg(e)); }
    };

    function renderAdminTickets(tickets, title) {
        const sec  = document.getElementById('admin-tickets-results-section');
        const head = document.getElementById('admin-tickets-title');
        const list = document.getElementById('admin-tickets-list');

        head.textContent = title;
        sec.style.display = 'block';
        sec.scrollIntoView({ behavior: 'smooth' });

        if (!tickets || !tickets.length || (tickets.length === 1 && !tickets[0].id)) {
            list.innerHTML = `<p style="color:#8b949e">${t('admin_tickets_none')}</p>`;
            return;
        }

        list.innerHTML = tickets.map(tk => `
            <div class="card" style="border-style:dashed">
                <div class="card-row">
                    <div>
                        <strong>${t('admin_ticket_by_id')}${tk.id}</strong> <span class="badge badge-${tk.status}">${tk.status}</span><br/>
                        <small>${t('code_label')} ${tk.ticketCode}</small>
                    </div>
                    <div style="text-align:right">
                        ${tk.quantity} ${t('admin_seats')} · ${(tk.priceInCents/100).toFixed(2)} €<br/>
                        <small>${new Date(tk.createdAt).toLocaleString(t('date_locale'))}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Patch showPage to load admin data
    const _showPage = window.showPage;
    window.showPage = function (name) {
        _showPage(name);
        if (name === 'admin') {
            const payload = getPayload();
            const isAdmin = payload && payload.role === 'admin';
            document.getElementById('admin-users-section').style.display = isAdmin ? '' : 'none';
            adminLoadEvents();
            if (isAdmin) adminLoadUsers();
        }
    };

    // ── Init ──────────────────────────────────────────────
    updateNav();
    applyTranslations();
    loadEvents();
})();
