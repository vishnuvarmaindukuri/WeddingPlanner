const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzehBdWtSVJMcMP3LaUssV_grWoyYOsIETbXzpJO2X9LA9twsNyhHsAmih2e0nOG7Ts/exec";

// Store the data completely separately
let expensesSheetData = [];
let shoppingSheetData = [];
let currentFilter = "all";

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showDashboard();
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const errorText = document.getElementById('login-error');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
            errorText.style.display = 'none';

            const payload = {
                action: "login",
                username: document.getElementById('login-username').value.trim(),
                password: document.getElementById('login-password').value
            };

            try {
                const response = await fetch(GOOGLE_SHEET_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    sessionStorage.setItem('isLoggedIn', 'true');
                    showDashboard();
                } else {
                    errorText.style.display = 'block';
                }
            } catch (err) {
                errorText.textContent = "Connection error. Please try again.";
                errorText.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Login';
            }
        });
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            currentFilter = item.getAttribute('data-filter');
            const titleEl = document.getElementById('current-view-title');
            if(titleEl) {
                titleEl.textContent = currentFilter === 'all' ? 'All Expenses' : `${currentFilter} Expenses`;
            }
            
            renderTable();
            renderStats();
        });
    });

    const form = document.getElementById('expense-form');
    if(form) form.addEventListener('submit', handleAddExpense);

    const refreshBtn = document.getElementById('refresh-btn');
    if(refreshBtn) refreshBtn.addEventListener('click', fetchExpenses);
});

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'flex';
    fetchExpenses(); 
}

async function fetchExpenses() {
    const tbodyEvents = document.getElementById('expense-table-body');
    const tbodyShopping = document.getElementById('shopping-table-body');
    
    if(tbodyEvents) tbodyEvents.innerHTML = '<tr><td colspan="7" class="loading-text">Fetching latest data...</td></tr>';
    if(tbodyShopping) tbodyShopping.innerHTML = '<tr><td colspan="7" class="loading-text">Fetching latest data...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_API_URL);
        const allData = await response.json();
        
        // Data comes pre-separated directly from the Google Sheets tabs!
        expensesSheetData = allData.expenses || [];
        shoppingSheetData = allData.shopping || [];
        
        renderTable();
        renderStats();
    } catch (error) {
        if(tbodyEvents) tbodyEvents.innerHTML = '<tr><td colspan="7" class="loading-text" style="color:red;">Error loading data. Check API URL.</td></tr>';
        if(tbodyShopping) tbodyShopping.innerHTML = '<tr><td colspan="7" class="loading-text" style="color:red;">Error loading data. Check API URL.</td></tr>';
        console.error(error);
    }
}

function renderTable() {
    const tbodyEvents = document.getElementById('expense-table-body');
    const tbodyShopping = document.getElementById('shopping-table-body');
    
    if(tbodyEvents) tbodyEvents.innerHTML = '';
    if(tbodyShopping) tbodyShopping.innerHTML = '';

    // Filter each sheet's data independently based on the sidebar
    const filteredEvents = currentFilter === 'all' 
        ? expensesSheetData 
        : expensesSheetData.filter(item => (item.event || "").toLowerCase() === currentFilter.toLowerCase());

    const filteredShopping = currentFilter === 'all' 
        ? shoppingSheetData 
        : shoppingSheetData.filter(item => (item.event || "").toLowerCase() === currentFilter.toLowerCase());

    // 1. Render Events Table
    if (tbodyEvents) {
        if (filteredEvents.length === 0) {
            tbodyEvents.innerHTML = '<tr><td colspan="7" class="loading-text">No event expenses found.</td></tr>';
        } else {
            filteredEvents.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${row.event}</strong></td>
                    <td>${row.category}</td>
                    <td>${row.item_name}</td>
                    <td>₹${Number(row.estimated_cost).toLocaleString('en-IN')}</td>
                    <td>₹${Number(row.actual_cost).toLocaleString('en-IN')}</td>
                    <td>₹${Number(row.paid_amount).toLocaleString('en-IN')}</td>
                    <td>${row.paid_by || '-'}</td>
                `;
                tbodyEvents.appendChild(tr);
            });
        }
    }

    // 2. Render Shopping Table
    if (tbodyShopping) {
        if (filteredShopping.length === 0) {
            tbodyShopping.innerHTML = '<tr><td colspan="7" class="loading-text">No shopping expenses found.</td></tr>';
        } else {
            filteredShopping.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${row.event}</strong></td>
                    <td>${row.category}</td>
                    <td>${row.item_name}</td>
                    <td>₹${Number(row.estimated_cost).toLocaleString('en-IN')}</td>
                    <td>₹${Number(row.actual_cost).toLocaleString('en-IN')}</td>
                    <td>₹${Number(row.paid_amount).toLocaleString('en-IN')}</td>
                    <td>${row.paid_by || '-'}</td>
                `;
                tbodyShopping.appendChild(tr);
            });
        }
    }
}

function renderStats() {
    const filteredEvents = currentFilter === 'all' 
        ? expensesSheetData 
        : expensesSheetData.filter(item => (item.event || "").toLowerCase() === currentFilter.toLowerCase());

    const filteredShopping = currentFilter === 'all' 
        ? shoppingSheetData 
        : shoppingSheetData.filter(item => (item.event || "").toLowerCase() === currentFilter.toLowerCase());

    // Main 3 Totals: Combine both lists for the grand total
    const combinedData = [...filteredEvents, ...filteredShopping];
    
    const totalEstimated = combinedData.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
    const totalActual = combinedData.reduce((sum, item) => {
        const actual = Number(item.actual_cost) || 0;
        const estimated = Number(item.estimated_cost) || 0;
        return sum + (actual > 0 ? actual : estimated);
    }, 0);
    const totalPaid = combinedData.reduce((sum, item) => sum + (Number(item.paid_amount) || 0), 0);

    const estEl = document.getElementById('stat-estimated');
    const actEl = document.getElementById('stat-actual');
    const paidEl = document.getElementById('stat-paid');

    if(estEl) estEl.textContent = `₹${totalEstimated.toLocaleString('en-IN')}`;
    if(actEl) actEl.textContent = `₹${totalActual.toLocaleString('en-IN')}`;
    if(paidEl) paidEl.textContent = `₹${totalPaid.toLocaleString('en-IN')}`;

    // Shopping Specific Totals
    // This finds any item in the shopping tab where the event name contains "Mansari" or "Vishnu"
    const mansariShopping = filteredShopping.filter(item => (item.event || '').toLowerCase().includes('mansari'));
    const vishnuShopping = filteredShopping.filter(item => (item.event || '').toLowerCase().includes('vishnu'));

    const mEst = mansariShopping.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
    const mAct = mansariShopping.reduce((sum, item) => {
        const actual = Number(item.actual_cost) || 0;
        const estimated = Number(item.estimated_cost) || 0;
        return sum + (actual > 0 ? actual : estimated);
    }, 0);

    const vEst = vishnuShopping.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
    const vAct = vishnuShopping.reduce((sum, item) => {
        const actual = Number(item.actual_cost) || 0;
        const estimated = Number(item.estimated_cost) || 0;
        return sum + (actual > 0 ? actual : estimated);
    }, 0);

    const mEstEl = document.getElementById('stat-mansari-est');
    if(mEstEl) mEstEl.textContent = `₹${mEst.toLocaleString('en-IN')}`;
    
    const mActEl = document.getElementById('stat-mansari-act');
    if(mActEl) mActEl.textContent = `₹${mAct.toLocaleString('en-IN')}`;

    const vEstEl = document.getElementById('stat-vishnu-est');
    if(vEstEl) vEstEl.textContent = `₹${vEst.toLocaleString('en-IN')}`;

    const vActEl = document.getElementById('stat-vishnu-act');
    if(vActEl) vActEl.textContent = `₹${vAct.toLocaleString('en-IN')}`;

    renderPaymentSummary(combinedData); 
}

function renderPaymentSummary(combinedData) {
    const container = document.getElementById('payment-summary-list');
    if(!container) return;
    
    container.innerHTML = ''; 

    const paymentTotals = {};

    combinedData.forEach(row => {
        const amount = Number(row.paid_amount) || 0;
        let person = (row.paid_by || "").trim();

        if (amount > 0) {
            if (person === "") {
                person = "Unassigned";
            }
            if (paymentTotals[person]) {
                paymentTotals[person] += amount;
            } else {
                paymentTotals[person] = amount;
            }
        }
    });

    const persons = Object.keys(paymentTotals);

    if (persons.length === 0) {
        container.innerHTML = '<p class="loading-text" style="padding:0;">No payments recorded for this view.</p>';
        return;
    }

    persons.forEach(person => {
        const total = paymentTotals[person];
        const card = document.createElement('div');
        card.className = 'payment-person-card';
        card.innerHTML = `
            <h4>${person}</h4>
            <p>₹${total.toLocaleString('en-IN')}</p>
        `;
        container.appendChild(card);
    });
}

async function handleAddExpense(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const newExpense = {
        // Send the target sheet selected in the dropdown to the backend!
        target_sheet: document.getElementById('form-target-sheet') ? document.getElementById('form-target-sheet').value : "Expenses",
        event: document.getElementById('form-event').value,
        category: document.getElementById('form-category').value,
        item_name: document.getElementById('form-item').value,
        estimated_cost: document.getElementById('form-estimated').value,
        actual_cost: document.getElementById('form-actual').value || "",
        paid_amount: document.getElementById('form-paid').value || "",
        paid_by: document.getElementById('form-paid-by').value || "", 
        notes: ""
    };

    try {
        await fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            body: JSON.stringify(newExpense),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        document.getElementById('expense-form').reset();
        await fetchExpenses();
    } catch (err) {
        alert('Failed to save to Google Sheets.');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Save to Google Sheets';
    }
}