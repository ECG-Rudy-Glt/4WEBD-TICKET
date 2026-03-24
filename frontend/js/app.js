(function () {
    const API_BASE = 'http://localhost:3030';

    const sourceSelect = document.getElementById('source');
    const destSelect = document.getElementById('destination');
    const amountInput = document.getElementById('amount');
    const descriptionInput = document.getElementById('description');
    const submitBtn = document.getElementById('submitBtn');
    const messageEl = document.getElementById('message');

    function showMessage(text, isError) {
        messageEl.textContent = text;
        messageEl.className = 'message ' + (isError ? 'error': 'success');
    }

    function clearMessage() {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }

    async function loadAccounts() {
        try {
            const res = await fetch(API_BASE + '/users/1/accounts');
            if(!res.ok) throw new Error('Impossible de charger les comptes');
            const data = await res.json();
            const accounts = Array.isArray(data) ? data : (data.data || []);
            return accounts;
        } catch (e) {
            console.error(e);
            showMessage('Erreur chargement des comptes. Vérifiez que l\'API BigBank (port 3000) est démarrée.', true);
            return [];
        }
    }

    function fillSelects(accounts) {
        const option = (acc) => {
            const o = document.createElement('option');
            o.value = acc.id;
            o.textContent = acc.label + ' (#' + acc.id + ') - ' + (acc.balance ?? 0) + ' €';
            return o;
        };
        sourceSelect.innerHTML = '<option value="">- Choisir -</option>';
        destSelect.innerHTML = '<option value="">- Choisir -</option>';
        accounts.forEach(function (acc) {
            sourceSelect.appendChild(option(acc));
            destSelect.appendChild(option(acc));
        });
    }

    submitBtn.addEventListener('click', async function () {
        clearMessage();
        const fromId = parseInt(sourceSelect.value, 10);
        const toId = parseInt(destSelect.value, 10);
        const amount = parseFloat(amountInput.value, 10);
        const description = descriptionInput.value.trim() || null;

        if (!fromId || !toId || !amount || amount <= 0) {
            showMessage('Remplissez compte source, destination et montant valide.', true);
            return;
        }

        if(fromId === toId) {
            showMessage('Source et destination doivent être différents.', true);
            return;
        }

        submitBtn.disabled = true;
        try{
            const res = await fetch(API_BASE + '/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromAccountId: fromId,
                    toAccountId: toId,
                    amount: amount,
                    description: description
                })
            });

            const body = await res.json();
            if(!res.ok){
                showMessage(body.error || body.message || 'Erreur virement', true);
                return;
            }
            showMessage('Virement effectué (id ' + (body.id || '') + ').', false);
            amountInput.value = '';
            await loadAccounts().then(fillSelects);
        } catch (e) {
            showMessage('Erreur réseau ou CORS. Vérifiez que BigBank (3000) tourne et autorise cette origine.', true);
        } finally {
            submitBtn.disabled = false;
        }
    });

    loadAccounts().then(fillSelects);
})();