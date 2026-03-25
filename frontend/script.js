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
    const passengerId = document.getElementById('passengerId')?.value?.trim() || '';

    if (!flightNumber && !claimId && !passengerId) {
        showError('errorMessage', 'Please enter flight number, claim ID, or passenger ID!');
        return;
    }

    document.getElementById('loadingMessage').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';

    let url = `${API_URL}/search-items?`;
    if (flightNumber) url += `flight_number=${flightNumber}`;
    if (claimId) url += `${url.includes('=') ? '&' : ''}claim_id=${claimId}`;
    if (passengerId) url += `${url.includes('=') ? '&' : ''}passenger_id=${passengerId}`;

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
                    ${item.passenger_id ? `
                    <div class="item-field">
                        <span class="item-field-label">Passenger ID</span>
                        <span class="item-field-value" style="color: var(--sky-400); font-weight: 700;">#P-${item.passenger_id}</span>
                    </div>` : ''}
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
    const baggageId = document.getElementById('baggageId')?.value?.trim();
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
        baggage_id: baggageId,
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
                navAuth.href = staff.role === 'Admin' ? 'admin-login.html' : 'staff-login.html';
            }
            if (backBtn) {
                backBtn.href = staff.role === 'Admin' ? 'admin-login.html' : 'staff-login.html';
            }

            const claimPanel = document.getElementById('claimPanel');
            const claimDivider = document.getElementById('claimDivider');
            const updatePanel = document.getElementById('updatePanel');
            const updateDivider = document.getElementById('updateDivider');
            const registerPanel = document.getElementById('registerPanel');
            const adminOverview = document.getElementById('adminOverview');

            if (staff.role !== 'Admin') {
                // Staff Role: Only Register
                if (claimPanel) claimPanel.style.display = 'none';
                if (claimDivider) claimDivider.style.display = 'none';
                if (updatePanel) updatePanel.style.display = 'none';
                if (updateDivider) updateDivider.style.display = 'none';
                if (adminOverview) adminOverview.style.display = 'none';

                if (pageHeader) pageHeader.innerHTML = '<h2>Operational Console</h2>';
                if (pageDesc) pageDesc.textContent = 'Operational View: Register newly found baggage items.';
            } else {
                // Admin Role: Claims & Updates + Stats
                if (registerPanel) registerPanel.style.display = 'none';
                if (adminOverview) adminOverview.style.display = 'block';

                if (pageHeader) pageHeader.innerHTML = '<h2>Management Console</h2>';
                if (pageDesc) pageDesc.textContent = 'Strategic View: Review passenger claims, track fleet logistics, and verify items.';

                // Load components
                loadStats();
                if (document.getElementById('claimsTableBody')) loadClaims();
            }
        } catch (e) {
            console.error('Error parsing staff data', e);
        }
    }
});

function loadStats() {
    fetch(`${API_URL}/stats`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                if (document.getElementById('statTotalFound')) document.getElementById('statTotalFound').textContent = data.totalFound;
                if (document.getElementById('statPendingClaims')) document.getElementById('statPendingClaims').textContent = data.pendingClaims;
                if (document.getElementById('statVerified')) document.getElementById('statVerified').textContent = data.verified;
                if (document.getElementById('statFlights')) document.getElementById('statFlights').textContent = data.flights;
            }
        })
        .catch(err => console.error('Error loading stats:', err));
}

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
                        <td style="padding: 16px 8px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: var(--sky-400);">#C-${c.claim_id}</td>
                        <td style="padding: 16px 8px;">
                            <div style="font-weight: 600; color: var(--white);">${c.first_name} ${c.last_name}</div>
                        </td>
                        <td style="padding: 16px 8px;">
                            <div style="font-weight: 600;">${c.item_name}</div>
                            <div style="font-size: 11px; color: var(--text-500); margin-top: 2px;">Item ID: ${c.item_id} • ${c.item_status}</div>
                            <div style="font-size: 11px; color: var(--sky-400); margin-top: 2px;">
                                <span style="opacity: 0.7;">Location:</span> ${c.terminal_code || 'N/A'} ${c.specific_spot ? '— ' + c.specific_spot : ''}
                            </div>
                        </td>
                        <td style="padding: 16px 8px; font-size: 0.85em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-300);">${c.proof_of_ownership || '<span style="opacity:0.3">No proof provided</span>'}</td>
                        <td style="padding: 16px 8px;">
                            <span class="status-badge ${c.status.toLowerCase()}" style="font-size: 9px; padding: 3px 8px;">${c.status}</span>
                        </td>
                        <td style="padding: 16px 8px;">
                            <div style="display: flex; gap: 6px;">
                                <button onclick="prepareProcess(${c.item_id}, '${c.status}', '${(c.proof_of_ownership || '').replace(/'/g, "\\'")}')" class="btn ${c.status === 'Verified' ? 'btn-secondary' : 'btn-primary'}" style="padding: 6px 12px; font-size: 0.8em; border-radius: 6px;">
                                    ${c.status === 'Verified' ? 'Edit Proof' : 'Process'}
                                </button>
                                ${c.status === 'Verified' ? `
                                    <button onclick="quickHandover(${c.item_id})" class="btn" style="padding: 6px 12px; font-size: 0.8em; border-radius: 6px; background: var(--sky-500); color: white;">Handover</button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => console.error('Error loading claims:', err));
}

function prepareProcess(itemId, currentStatus, proof) {
    document.getElementById('updateItemId').value = itemId;
    document.getElementById('updateStatus').value = currentStatus === 'Pending' ? 'Verified' : currentStatus;
    if (document.getElementById('updateProof')) {
        document.getElementById('updateProof').value = proof || '';
    }

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
    const proof = document.getElementById('updateProof')?.value?.trim();

    if (!itemId || !newStatus) {
        showError('updateError', '⚠️ Please fill in item ID and status!');
        return;
    }

    const updateData = {
        status: newStatus,
        proof_of_ownership: proof,
        sync_claim: true // flag to tell backend to update associated claim
    };

    fetch(`${API_URL}/update-item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('updateMessage', `✅ <strong>Success!</strong> Item #${itemId} updated to <strong>${newStatus}</strong>.`);

                // Small delay to ensure DB sync before refresh
                setTimeout(() => {
                    if (document.getElementById('claimsTableBody')) loadClaims();
                    loadStats();
                }, 500);

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

function quickHandover(itemId) {
    if (!confirm('Mark this item as Handed Over to Passenger? This will resolve the claim.')) return;

    fetch(`${API_URL}/update-item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'Returned',
            sync_claim: true,
            proof_of_ownership: 'Handed over directly by staff'
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('✅ Item marked as Returned and Claim Resolved!');
                loadClaims();
                loadStats();
            } else {
                alert('❌ Error: ' + data.message);
            }
        })
        .catch(err => alert('❌ Connection Error'));
}

// ============================================
// 4. STAFF LOGIN FUNCTION (Standard Staff)
// ============================================
function staffLogin() {
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();

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
                showSuccess('loginSuccess', '✅ Staff login successful! Redirecting...');
                localStorage.setItem('staff', JSON.stringify(data.staff));
                setTimeout(() => {
                    window.location.href = 'add-luggage.html';
                }, 2000);
            } else if (data.success && data.staff.role === 'Admin') {
                showError('loginError', '❌ Admins must use the Admin Portal.');
            } else {
                showError('loginError', '❌ Invalid staff credentials!');
            }
        })
        .catch(err => {
            console.error(err);
            showError('loginError', '❌ Connection error!');
        });
}

// ============================================
// 4b. ADMIN LOGIN FUNCTION
// ============================================
function adminLogin() {
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();

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
                showError('loginError', '❌ Staff must use the Staff Portal.');
            } else {
                showError('loginError', '❌ Invalid admin credentials!');
            }
        })
        .catch(err => {
            console.error(err);
            showError('loginError', '❌ Connection error!');
        });
}

// ============================================
// 4c. STAFF/ADMIN REGISTRATION FUNCTION
// ============================================
function registerStaff(role) {
    const username = document.getElementById('regUsername')?.value?.trim();
    const password = document.getElementById('regPassword')?.value?.trim();
    const employeeId = document.getElementById('regEmployeeId')?.value?.trim();

    if (!username || !password || !employeeId) {
        showError('registerError', 'Please enter username, password, and employee ID!');
        return;
    }

    fetch(`${API_URL}/register-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, employee_id: employeeId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('registerSuccess', `✅ Registration successful! Please log in.`);
            setTimeout(() => {
                if (role === 'Admin') {
                    window.location.href = 'admin-login.html';
                } else {
                    window.location.href = 'staff-login.html';
                }
            }, 2000);
        } else {
            showError('registerError', '❌ ' + (data.message || 'Error registering account.'));
        }
    })
    .catch(err => {
        console.error(err);
        showError('registerError', '❌ Connection error!');
    });
}

// ============================================
// 5. CLEAR FORM (Reset form fields)
// ============================================
function clearForm() {
    const formElements = ['flightNumber', 'itemName', 'baggageId', 'itemDescription', 'serialNumber',
        'categoryId', 'locationId', 'itemStatus', 'itemId', 'updateItemId', 'updateStatus', 'updateProof',
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
        successElement.innerHTML = message;
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
                showSuccess('reportMessage', `✅ Success! Your <strong>Passenger ID is #${data.passenger_id}</strong> and your Claim ID is #${data.claim_id}. Please save these for verification with staff.`);
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

// ============================================
// 7. PASSENGER LOGIN FUNCTION
// ============================================
function passengerLogin() {
    const email = document.getElementById('p-email')?.value?.trim();
    const passport = document.getElementById('p-passport')?.value?.trim();

    if (!email || !passport) {
        showError('loginError', 'Please enter email and passport number!');
        return;
    }

    fetch(`${API_URL}/passenger-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password_or_passport: passport })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showSuccess('loginSuccess', '✅ Login successful! Redirecting...');
            localStorage.setItem('passenger', JSON.stringify(data.passenger));
            setTimeout(() => {
                window.location.href = 'passenger-portal.html';
            }, 2000);
        } else {
            showError('loginError', '❌ ' + (data.message || 'Invalid credentials'));
        }
    })
    .catch(err => {
        showError('loginError', '❌ Connection error!');
    });
}

// INJECT BACKGROUND VIDEO
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('bg-video')) {
        const videoHtml = `
            <video autoplay loop muted playsinline id="bg-video" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: -2; opacity: 0.35;">
                <source src="https://assets.mixkit.co/videos/preview/mixkit-airplane-taking-off-in-the-sky-29835-large.mp4" type="video/mp4">
            </video>
            <div id="bg-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--navy-950); opacity: 0.85; z-index: -1; pointer-events: none;"></div>
        `;
        document.body.insertAdjacentHTML('afterbegin', videoHtml);
        document.body.style.background = 'transparent'; // Let video show through
    }
});
