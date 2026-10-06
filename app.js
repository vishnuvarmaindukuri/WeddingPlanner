// Paste your Google Apps Script Web App URL here:
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzehBdWtSVJMcMP3LaUssV_grWoyYOsIETbXzpJO2X9LA9twsNyhHsAmih2e0nOG7Ts/exec";

let expensesData = [];
let currentFilter = "all";

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in this session
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showDashboard();
    }

    // Login Form Logic
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

    // Setup Sidebar filtering
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            currentFilter = item.getAttribute('data-filter');
            document.getElementById('current-view-title').textContent = 
                currentFilter === 'all' ? 'All Expenses' : `${currentFilter} Expenses`;
            
            renderTable();
            renderStats();
        });
    });

    // Form submission
    const form = document.getElementById('expense-form');
    form.addEventListener('submit', handleAddExpense);

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', fetchExpenses);
});

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'flex';
    fetchExpenses(); // Only load the data after a successful login
}


async function fetchExpenses() {
    const tbody = document.getElementById('expense-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">Fetching latest data...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_API_URL);
        expensesData = await response.json();
        renderTable();
        renderStats();
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-text" style="color:red;">Error loading data. Check API URL.</td></tr>';
        console.error(error);
    }
}

function renderTable() {
    const tbody = document.getElementById('expense-table-body');
    tbody.innerHTML = '';

    const filtered = currentFilter === 'all' 
        ? expensesData 
        : expensesData.filter(item => item.event.toLowerCase() === currentFilter.toLowerCase());

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No expenses found.</td></tr>';
        return;
    }

    filtered.forEach(row => {
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
        tbody.appendChild(tr);
    });
}

function renderStats() {
    const filtered = currentFilter === 'all' 
        ? expensesData 
        : expensesData.filter(item => item.event.toLowerCase() === currentFilter.toLowerCase());

    const totalEstimated = filtered.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
    
    const totalActual = filtered.reduce((sum, item) => {
        const actual = Number(item.actual_cost) || 0;
        const estimated = Number(item.estimated_cost) || 0;
        const effectiveCost = actual > 0 ? actual : estimated;
        return sum + effectiveCost;
    }, 0);

    const totalPaid = filtered.reduce((sum, item) => sum + (Number(item.paid_amount) || 0), 0);

    document.getElementById('stat-estimated').textContent = `₹${totalEstimated.toLocaleString('en-IN')}`;
    document.getElementById('stat-actual').textContent = `₹${totalActual.toLocaleString('en-IN')}`;
    document.getElementById('stat-paid').textContent = `₹${totalPaid.toLocaleString('en-IN')}`;

    // NEW LINE TO ADD:
    renderPaymentSummary(filtered); 
}

// NEW FUNCTION
function renderPaymentSummary(filteredData) {
    const container = document.getElementById('payment-summary-list');
    container.innerHTML = ''; // Clear out old data

    const paymentTotals = {};

    // Group the amounts by the person's name
    filteredData.forEach(row => {
        const amount = Number(row.paid_amount) || 0;
        let person = (row.paid_by || "").trim();

        if (amount > 0) {
            // If there's an amount but no name, assign it to 'Unassigned'
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

    // If no payments exist, show a placeholder
    if (persons.length === 0) {
        container.innerHTML = '<p class="loading-text" style="padding:0;">No payments recorded for this view.</p>';
        return;
    }

    // Generate a card for each person
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
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } // text/plain prevents browser CORS preflight check
        });

        // Reset form and reload
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