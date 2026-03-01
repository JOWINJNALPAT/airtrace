// ============================================
// CONFIGURATION - backend URL is determined dynamically
//  - during local development it falls back to localhost
//  - in production you can set a meta tag <meta name="api-base-url" content="https://your-backend.onrender.com">
//  - or define window.API_BASE_URL before loading this script
// ============================================
let API_URL = 'http://localhost:3000/api';
if (typeof window !== 'undefined') {
    if (window.API_BASE_URL) {
        API_URL = window.API_BASE_URL;
    } else {
        const meta = document.querySelector('meta[name="api-base-url"]');
        if (meta && meta.content) {
            API_URL = meta.content.replace(/\/\/+$/, '') + '/api';
        }
    }
}
// ensure no trailing slash
API_URL = API_URL.replace(/\/+$/, '');

// ============================================
// 1. SEARCH ITEMS BY FLIGHT OR CLAIM
// ============================================
function searchItems() {
    const flightNumber = document.getElementById('flightNumber')?.value?.trim() || '';
    const claimId = document.getElementById('claimId')?.value?.trim() || '';

    if (!flightNumber && !claimId) {
        showError('errorMessage', 'Please enter flight number or claim ID!');
        return;
    }

    document.getElementById('loadingMessage').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';

    let url = `${API_URL}/search-items?`;
    if (flightNumber) url += `flight_number=${flightNumber}`;
    if (claimId) url += `${flightNumber ? '&' : ''}claim_id=${claimId}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            document.getElementById('loadingMessage').style.display = 'none';

            if (data.success && data.items && data.items.length > 0) {
                displayItems(data.items);
                document.getElementById('resultsSection').style.display = 'block';
            } else {
                showError('errorMessage', data.message || 'No items found');
            }
        })
        .catch(error => {
            document.getElementById('loadingMessage').style.display = 'none';
            console.error('Error:', error);
            showError('errorMessage', 'Error searching items. Make sure backend is running!');
        });
}

function displayItems(items) {
    const resultsDiv = document.getElementById('resultsSection');
    resultsDiv.innerHTML = `<h3>${items.length} Item${items.length > 1 ? 's' : ''} Found</h3>`;

    items.forEach((item, idx) => {
        const dateStr = item.date_found
            ? new Date(item.date_found).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
        const locationStr = item.specific_spot
            ? `${item.terminal_code || ''} — ${item.specific_spot}`
            : (item.terminal_code || '—');
        const statusClass = (item.status || 'lost').toLowerCase();
        const displayStatus = item.status === 'Found' ? `Founded at ${item.terminal_code || ''}` : item.status;
        const itemHTML = `
            <div class="item-card" style="animation-delay: ${idx * 0.06}s">
                <div class="item-card-header">
                    <div>
                        <div class="item-card-title">${item.item_name}</div>
                        <div class="item-card-sub">Item ID: #${item.item_id} &nbsp;·&nbsp; ${item.category_name || 'Uncategorised'}</div>
                    </div>
                    <span class="status-badge ${statusClass}">${displayStatus}</span>
                </div>
                <div class="item-card-body">
                    <div class="item-field">
                        <span class="item-field-label">Flight</span>
                        <span class="item-field-value">${item.flight_number}${item.airline_name ? ' — ' + item.airline_name : ''}</span>
                    </div>
                    <div class="item-field">
                        <span class="item-field-label">Date Found</span>
                        <span class="item-field-value">${dateStr}</span>
                    </div>
                    <div class="item-field">
                        <span class="item-field-label">Location</span>
                        <span class="item-field-value">${locationStr}</span>
                    </div>
                    <div class="item-field">
                        <span class="item-field-label">Description</span>
                        <span class="item-field-value">${item.description || '—'}</span>
                    </div>
                </div>
            </div>
        `;
        resultsDiv.innerHTML += itemHTML;
    });
}

// ============================================
// HOME PAGE SEARCH FUNCTION
// ============================================
function searchFromHome() {
    const flightNumber = document.getElementById('homeFlightNumber')?.value?.trim() || '';
    const claimId = document.getElementById('homeClaimId')?.value?.trim() || '';

    // Transfer values to search page and navigate
    if (flightNumber) {
        window.location.href = 'search.html?flight=' + encodeURIComponent(flightNumber);
    } else if (claimId) {
        window.location.href = 'search.html?claim=' + encodeURIComponent(claimId);
    } else {
        alert('Please enter a flight number or claim ID!');
    }
}

// ============================================
// 2. ADD ITEM (LUGGAGE) FUNCTION (For Staff)
// ============================================
function addItem() {
    const flightNumber = document.getElementById('flightNumber')?.value?.trim();
    const itemName = document.getElementById('itemName')?.value?.trim();
    const description = document.getElementById('itemDescription')?.value?.trim();
    const serialNumber = document.getElementById('serialNumber')?.value?.trim();
    const categoryId = document.getElementById('categoryId')?.value;
    const locationId = document.getElementById('locationId')?.value;
    const status = document.getElementById('itemStatus')?.value || 'Found';

    if (!flightNumber || !itemName || !categoryId) {
        showError('addError', '⚠️ Please fill in all required fields (Flight, Item Name, Category)!');
        return;
    }

    document.getElementById('addError').style.display = 'none';

    let staffId = null;
    try {
        const staffData = localStorage.getItem('staff');
        if (staffData) staffId = JSON.parse(staffData).staff_id;
    } catch (e) { }

    const itemData = {
        flight_number: flightNumber,
        item_name: itemName,
        description: description,
        serial_number: serialNumber,
        category_id: parseInt(categoryId),
        location_id: locationId ? parseInt(locationId) : null,
        status: status,
        registered_by_staff_id: staffId
    };

    fetch(`${API_URL}/add-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('addMessage', '✅ Item added successfully! (ID: ' + data.id + ')');
                clearForm();
            } else {
                showError('addError', '❌ ' + (data.message || 'Error adding item'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('addError', '❌ Error connecting to server. Make sure backend is running!');
        });
}

// ============================================
// 2B. LOAD CATEGORIES FOR DROPDOWN
// ============================================
function loadCategories() {
    fetch(`${API_URL}/categories`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.categories) {
                const select = document.getElementById('categoryId');
                if (select) {
                    data.categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.category_id;
                        option.textContent = cat.category_name;
                        select.appendChild(option);
                    });
                }
            }
        })
        .catch(error => console.error('Error loading categories:', error));
}

// ============================================
// 2C. LOAD FLIGHTS FOR DROPDOWN
// ============================================
function loadFlights() {
    fetch(`${API_URL}/flights`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.flights) {
                const select = document.getElementById('flightNumber');
                if (select) {
                    data.flights.forEach(flight => {
                        const option = document.createElement('option');
                        option.value = flight.flight_number;
                        option.textContent = flight.flight_number + ' - ' + flight.airline_name;
                        select.appendChild(option);
                    });
                }
            }
        })
        .catch(error => console.error('Error loading flights:', error));
}

// ============================================
// 2D. LOAD LOCATIONS FOR DROPDOWN
// ============================================
function loadLocations() {
    fetch(`${API_URL}/locations`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.locations) {
                const select = document.getElementById('locationId');
                if (select) {
                    data.locations.forEach(loc => {
                        const option = document.createElement('option');
                        option.value = loc.location_id;
                        option.textContent = loc.terminal_code + ' - ' + loc.zone_type + ' - ' + (loc.specific_spot || 'N/A');
                        select.appendChild(option);
                    });
                }
            }
        })
        .catch(error => console.error('Error loading locations:', error));
}

// Initialize dropdowns on page load
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('categoryId')) loadCategories();
    if (document.getElementById('flightNumber')) loadFlights();
    if (document.getElementById('locationId')) loadLocations();
    // Role-based access control for dashboard
    const staffData = localStorage.getItem('staff');
    if (staffData && document.getElementById('claimPanel')) {
        try {
            const staff = JSON.parse(staffData);
            const pageHeader = document.querySelector('.page-header h2');
            const pageDesc = document.querySelector('.page-header p');
            const navAuth = document.querySelector('.nav-cta a');
            const backBtn = document.getElementById('dashboardBackBtn');

            if (navAuth) {
                navAuth.textContent = `Logout (${staff.role})`;
                navAuth.href = 'staff-login.html';
            }
            if (backBtn) {
                backBtn.href = 'staff-login.html';
            }

            if (pageHeader) pageHeader.textContent = 'Staff Dashboard';
            if (pageDesc) pageDesc.textContent = 'Manage item registrations, passenger claims, and status updates.';

            // Load claims for processing
            if (document.getElementById('claimsTableBody')) loadClaims();
        } catch (e) {
            console.error('Error parsing staff data', e);
        }
    }
});

// ============================================
// 3. LOAD AND PROCESS CLAIMS
// ============================================
function loadClaims() {
    const tableBody = document.getElementById('claimsTableBody');
    if (!tableBody) return;

    fetch(`${API_URL}/claims`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                if (data.claims.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; opacity: 0.5;">No pending claims found.</td></tr>';
                    return;
                }

                tableBody.innerHTML = data.claims.map(c => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 10px 8px;">#C-${c.claim_id}</td>
                        <td style="padding: 10px 8px;">${c.first_name} ${c.last_name}</td>
                        <td style="padding: 10px 8px;">${c.item_name} <br> <small style="opacity:0.6">Item ID: ${c.item_id}</small></td>
                        <td style="padding: 10px 8px; font-size: 0.85em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.proof_of_ownership || '—'}</td>
                        <td style="padding: 10px 8px;"><span class="status-badge" style="padding: 2px 6px; font-size: 0.8em; background: rgba(255,193,7,0.2); color: #ffc107;">${c.status}</span></td>
                        <td style="padding: 10px 8px;">
                            <button onclick="prepareProcess(${c.item_id}, '${c.status}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8em;">Process</button>
                        </td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => console.error('Error loading claims:', err));
}

function prepareProcess(itemId, currentStatus) {
    document.getElementById('updateItemId').value = itemId;
    document.getElementById('updateStatus').value = currentStatus === 'Pending' ? 'Verified' : currentStatus;

    // Smooth scroll to update panel
    document.getElementById('updatePanel').scrollIntoView({ behavior: 'smooth' });

    // Highlight the panel
    const panel = document.getElementById('updatePanel');
    panel.style.boxShadow = '0 0 20px rgba(0, 210, 255, 0.4)';
    setTimeout(() => { panel.style.boxShadow = ''; }, 2000);
}

// ============================================
// 5. UPDATE ITEM STATUS
// ============================================
function updateItemStatus() {
    const itemId = document.getElementById('updateItemId')?.value?.trim();
    const newStatus = document.getElementById('updateStatus')?.value;

    if (!itemId || !newStatus) {
        showError('updateError', '⚠️ Please fill in item ID and status!');
        return;
    }

    const updateData = {
        status: newStatus
    };

    fetch(`${API_URL}/update-item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('updateMessage', `✅ Status updated for Item #${itemId}`);
                if (document.getElementById('claimsTableBody')) loadClaims();
                clearForm();
            } else {
                showError('updateError', '❌ ' + (data.message || 'Error updating status'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('updateError', '❌ Error connecting to server!');
        });
}

// ============================================
// 4. STAFF PORTAL LOGIN
// ============================================
function staffLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showError('loginError', 'Please enter username and password!');
        return;
    }

    fetch(`${API_URL}/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('loginSuccess', `✅ Login successful! Welcome ${data.staff.username}.`);
                localStorage.setItem('staff', JSON.stringify(data.staff));
                setTimeout(() => {
                    window.location.href = 'add-luggage.html';
                }, 1500);
            } else {
                showError('loginError', '❌ Invalid username or password!');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('loginError', '❌ Error connecting to server!');
        });
}

// ============================================
// 5. CLEAR FORM (Reset form fields)
// ============================================
function clearForm() {
    const formElements = ['flightNumber', 'itemName', 'itemDescription', 'serialNumber',
        'categoryId', 'locationId', 'itemStatus', 'passengerId', 'itemId',
        'proofOfOwnership', 'ticketNum', 'passengerName', 'luggageColor',
        'luggageSize', 'luggageDescription', 'luggageStatus'];

    formElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });

    const messages = ['addMessage', 'claimMessage', 'updateMessage', 'addError', 'claimError', 'updateError'];
    messages.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
}

// ============================================
// 6. SHOW ERROR MESSAGE
// ============================================
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// ============================================
// 9. SHOW SUCCESS MESSAGE
// ============================================
function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    const flightInput = document.getElementById('flightNumber');
    if (flightInput) {
        flightInput.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                searchItems();
            }
        });
    }
});

// ============================================
// 6. PASSENGER REPORT LOST ITEM
// ============================================
function reportLostItem() {
    const firstName = document.getElementById('p-firstName')?.value?.trim();
    const lastName = document.getElementById('p-lastName')?.value?.trim();
    const email = document.getElementById('p-email')?.value?.trim();
    const phone = document.getElementById('p-phone')?.value?.trim();
    const passport = document.getElementById('p-passport')?.value?.trim();
    const flightNumber = document.getElementById('p-flightNumber')?.value;
    const categoryId = document.getElementById('p-categoryId')?.value;
    const itemName = document.getElementById('p-itemName')?.value?.trim();
    const description = document.getElementById('p-description')?.value?.trim();
    const serial = document.getElementById('p-serial')?.value?.trim();

    if (!firstName || !lastName || !email || !flightNumber || !itemName || !categoryId) {
        showError('reportError', '⚠️ Please fill in all required fields marked with *');
        return;
    }

    const data = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone,
        passport_number: passport,
        flight_number: flightNumber,
        category_id: parseInt(categoryId),
        item_name: itemName,
        description: description,
        serial_number: serial
    };

    fetch(`${API_URL}/passenger-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showSuccess('reportMessage', `✅ Success! Your claim ID is: <strong>${data.claim_id}</strong>. Please save this for tracking.`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showError('reportError', '❌ ' + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            showError('reportError', '❌ Connection error!');
        });
}
