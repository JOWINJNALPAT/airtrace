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
        const itemHTML = `
            <div class="item-card" style="animation-delay: ${idx * 0.06}s">
                <div class="item-card-header">
                    <div>
                        <div class="item-card-title">${item.item_name}</div>
                        <div class="item-card-sub">Item ID: #${item.item_id} &nbsp;·&nbsp; ${item.category_name || 'Uncategorised'}</div>
                    </div>
                    <span class="status-badge ${statusClass}">${item.status}</span>
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

    const itemData = {
        flight_number: flightNumber,
        item_name: itemName,
        description: description,
        serial_number: serialNumber,
        category_id: parseInt(categoryId),
        location_id: locationId ? parseInt(locationId) : null,
        status: status
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
                navAuth.href = staff.role === 'Admin' ? 'admin-login.html' : 'staff-login.html';
            }
            if (backBtn) {
                backBtn.href = staff.role === 'Admin' ? 'admin-login.html' : 'staff-login.html';
            }

            if (staff.role !== 'Admin') {
                const claimPanel = document.getElementById('claimPanel');
                const claimDivider = document.getElementById('claimDivider');
                if (claimPanel) claimPanel.style.display = 'none';
                if (claimDivider) claimDivider.style.display = 'none';

                if (pageHeader) pageHeader.textContent = 'Desk Staff Dashboard';
                if (pageDesc) pageDesc.textContent = 'Restricted View: Register found items and update item statuses only.';
            } else {
                if (pageHeader) pageHeader.textContent = 'Admin Management Dashboard';
                if (pageDesc) pageDesc.textContent = 'Full Access: Register items, manage passenger claims, and oversee operations.';
            }
        } catch (e) {
            console.error('Error parsing staff data', e);
        }
    }
});

// ============================================
// 3. CREATE CLAIM FOR ITEM
// ============================================
function createClaim() {
    const passengerId = document.getElementById('passengerId')?.value?.trim();
    const itemId = document.getElementById('itemId')?.value?.trim();
    const proofOfOwnership = document.getElementById('proofOfOwnership')?.value?.trim();

    if (!passengerId || !itemId) {
        showError('claimError', '⚠️ Please fill in passenger ID and item ID!');
        return;
    }

    const claimData = {
        passenger_id: parseInt(passengerId),
        item_id: parseInt(itemId),
        status: 'Pending',
        proof_of_ownership: proofOfOwnership || null
    };

    fetch(`${API_URL}/create-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('claimMessage', '✅ Claim created successfully! (Claim ID: ' + data.claim_id + ')');
                clearForm();
            } else {
                showError('claimError', '❌ ' + (data.message || 'Error creating claim'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('claimError', '❌ Error connecting to server!');
        });
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
                showSuccess('updateMessage', '✅ Item status updated successfully!');
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
// 4. STAFF LOGIN FUNCTION
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
            if (data.success && data.staff.role === 'Staff') {
                showSuccess('loginSuccess', '✅ Login successful! Redirecting...');
                localStorage.setItem('staff', JSON.stringify(data.staff));
                setTimeout(() => {
                    window.location.href = 'add-luggage.html';
                }, 2000);
            } else if (data.success && data.staff.role === 'Admin') {
                showError('loginError', '❌ Admins must log in through the Admin Portal.');
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
// 4b. ADMIN LOGIN FUNCTION
// ============================================
function adminLogin() {
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
            if (data.success && data.staff.role === 'Admin') {
                showSuccess('loginSuccess', '✅ Admin login successful! Redirecting...');
                localStorage.setItem('staff', JSON.stringify(data.staff));
                setTimeout(() => {
                    window.location.href = 'add-luggage.html';
                }, 2000);
            } else if (data.success && data.staff.role === 'Staff') {
                showError('loginError', '❌ Access Denied. Standard staff must use the Staff Portal.');
            } else {
                showError('loginError', '❌ Invalid admin credentials!');
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
