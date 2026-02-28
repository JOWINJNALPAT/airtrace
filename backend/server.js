// ============================================
// AIRTRACE BACKEND SERVER
// ============================================
require('dotenv').config();

// Step 1: Import (load) required packages
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');


// Step 2: Create Express app
const app = express();

// Step 3: Middleware (helpers that process requests)
// Configure CORS to allow requests from frontend domains (set via ALLOWED_ORIGINS env var)
// ALLOWED_ORIGINS can be a comma-separated list or "*" for all origins.
const allowed = process.env.ALLOWED_ORIGINS || '*';
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowed === '*' || allowed.split(',').includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
// Allow receiving JSON data
app.use(express.json());

// ============================================
// DATABASE CONNECTION (using environment variables)
// ============================================
// Expected env vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT (optional)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'airtrace',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('✅ Database pool created - Using new schema (PASSENGER, STAFF, CLAIM, ITEM, LOCATION, FLIGHT, CATEGORY)');

// ============================================
// TEST ROUTE (Just to check if server is running)
// ============================================
app.get('/', (req, res) => {
    res.json({ message: '✈️ AirTrace Backend is Running!' });
});

// ============================================
// API 1: SEARCH ITEMS BY PASSENGER/FLIGHT/CLAIM
// ============================================
// Frontend sends: /api/search-items?flight_number=BA123 or ?claim_id=5
// Backend returns: Items with details

app.get('/api/search-items', async (req, res) => {
    try {
        const { flight_number, claim_id, passenger_id } = req.query;

        if (!flight_number && !claim_id && !passenger_id) {
            return res.json({
                success: false,
                message: 'Flight number, claim ID, or passenger ID is required'
            });
        }

        const connection = await db.getConnection();
        let query = `
            SELECT 
                i.item_id,
                i.location_id,
                i.flight_number,
                i.category_id,
                i.registered_by_staff,
                i.item_name,
                i.description,
                i.serial_number,
                i.status,
                i.date_found,
                c.category_name,
                f.airline_name,
                f.origin_airport,
                f.arrival_time,
                l.terminal_code,
                l.zone_type,
                l.specific_spot
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN flight f ON i.flight_number = f.flight_number
            LEFT JOIN location l ON i.location_id = l.location_id
            WHERE 1=1
        `;
        let params = [];

        if (flight_number) {
            query += ' AND i.flight_number = ?';
            params.push(flight_number);
        }
        if (claim_id) {
            query += ' AND i.item_id IN (SELECT item_id FROM claim WHERE claim_id = ?)';
            params.push(claim_id);
        }
        if (passenger_id) {
            query += ' AND i.item_id IN (SELECT item_id FROM claim WHERE passenger_id = ?)';
            params.push(passenger_id);
        }

        const [rows] = await connection.query(query, params);
        connection.release();

        if (rows.length > 0) {
            res.json({
                success: true,
                count: rows.length,
                items: rows
            });
        } else {
            res.json({
                success: false,
                message: 'No items found'
            });
        }
    } catch (error) {
        console.error('Error in search:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 2: ADD NEW ITEM (LUGGAGE)
// ============================================
// Frontend sends: POST request with item details
// Backend saves to database

app.post('/api/add-item', async (req, res) => {
    try {
        const {
            flight_number,
            item_name,
            description,
            serial_number,
            category_id,
            location_id,
            status,
            date_found,
            registered_by_staff
        } = req.body;

        if (!flight_number || !item_name || !category_id || !status) {
            return res.json({
                success: false,
                message: 'Required fields missing: flight_number, item_name, category_id, status'
            });
        }

        const connection = await db.getConnection();

        const [result] = await connection.query(
            `INSERT INTO item 
            (flight_number, item_name, description, serial_number, category_id, location_id, status, date_found, registered_by_staff)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [flight_number, item_name, description, serial_number, category_id, location_id || null, status, date_found || new Date(), registered_by_staff || null]
        );

        connection.release();

        res.json({
            success: true,
            message: 'Item added successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error adding item:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 3: CREATE CLAIM FOR ITEM
// ============================================
// Frontend sends: POST request with claim details
// Links passenger to item

app.post('/api/create-claim', async (req, res) => {
    try {
        const { passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date } = req.body;

        if (!passenger_id || !item_id) {
            return res.json({
                success: false,
                message: 'passenger_id and item_id are required'
            });
        }

        const connection = await db.getConnection();

        const [result] = await connection.query(
            `INSERT INTO claim (passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [passenger_id, item_id, claim_date || new Date(), status || 'Pending', proof_of_ownership || null, resolution_date || null]
        );

        connection.release();

        res.json({
            success: true,
            message: 'Claim created successfully',
            claim_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating claim:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 4: UPDATE ITEM STATUS
// ============================================
// Frontend sends: PUT request with item_id and new status
// Changes status: Lost → Found → Returned

app.put('/api/update-item/:item_id', async (req, res) => {
    try {
        const item_id = req.params.item_id;
        const { status, location_id } = req.body;

        const validStatuses = ['Lost', 'Found', 'Returned', 'Verified'];
        if (!validStatuses.includes(status)) {
            return res.json({
                success: false,
                message: 'Invalid status'
            });
        }

        const connection = await db.getConnection();

        let query = 'UPDATE item SET status = ?';
        let params = [status];

        if (location_id) {
            query += ', location_id = ?';
            params.push(location_id);
        }

        query += ' WHERE item_id = ?';
        params.push(item_id);

        const [result] = await connection.query(query, params);

        connection.release();

        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: 'Item status updated'
            });
        } else {
            res.json({
                success: false,
                message: 'Item not found'
            });
        }
    } catch (error) {
        console.error('Error updating item:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 5: REGISTER PASSENGER
// ============================================
// Frontend sends: POST request with passenger info
// Creates new passenger record

app.post('/api/register-passenger', async (req, res) => {
    try {
        const { first_name, last_name, phone_number, email, passport_number, address } = req.body;

        if (!first_name || !last_name || !email) {
            return res.json({
                success: false,
                message: 'first_name, last_name, and email are required'
            });
        }

        const connection = await db.getConnection();

        const [result] = await connection.query(
            `INSERT INTO passenger (first_name, last_name, phone_number, email, passport_number, address)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, phone_number || null, email, passport_number || null, address || null]
        );

        connection.release();

        res.json({
            success: true,
            message: 'Passenger registered successfully',
            passenger_id: result.insertId
        });
    } catch (error) {
        console.error('Error registering passenger:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 6: STAFF LOGIN
// ============================================
// Frontend sends: Username and password
// Backend checks if credentials are correct

app.post('/api/staff-login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({
                success: false,
                message: 'Username and password required'
            });
        }

        const connection = await db.getConnection();

        const [rows] = await connection.query(
            'SELECT staff_id, username, role, employee_id FROM staff WHERE username = ? AND password = ?',
            [username, password]
        );

        connection.release();

        if (rows.length > 0) {
            res.json({
                success: true,
                message: 'Login successful',
                staff: {
                    staff_id: rows[0].staff_id,
                    username: rows[0].username,
                    role: rows[0].role,
                    employee_id: rows[0].employee_id
                }
            });
        } else {
            res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Error in login:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 7: GET ALL CATEGORIES
// ============================================
app.get('/api/categories', async (req, res) => {
    try {
        const connection = await db.getConnection();
        const [rows] = await connection.query(
            'SELECT category_id, category_name, storage_requirements FROM category'
        );
        connection.release();

        res.json({
            success: true,
            categories: rows
        });
    } catch (error) {
        console.error('Error:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 8: GET ALL FLIGHTS
// ============================================
app.get('/api/flights', async (req, res) => {
    try {
        const connection = await db.getConnection();
        const [rows] = await connection.query(
            'SELECT flight_number, airline_name, origin_airport, arrival_time FROM flight'
        );
        connection.release();

        res.json({
            success: true,
            flights: rows
        });
    } catch (error) {
        console.error('Error:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 9: GET ALL LOCATIONS
// ============================================
app.get('/api/locations', async (req, res) => {
    try {
        const connection = await db.getConnection();
        const [rows] = await connection.query(
            'SELECT location_id, terminal_code, zone_type, specific_spot FROM location'
        );
        connection.release();

        res.json({
            success: true,
            locations: rows
        });
    } catch (error) {
        console.error('Error:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 10: GET CLAIM DETAILS
// ============================================
app.get('/api/claim/:claim_id', async (req, res) => {
    try {
        const claim_id = req.params.claim_id;
        const connection = await db.getConnection();

        const [rows] = await connection.query(
            `SELECT 
                c.claim_id, c.passenger_id, c.item_id, c.claim_date, c.status, c.proof_of_ownership, c.resolution_date,
                p.first_name, p.last_name, p.email, p.phone_number,
                i.item_name, i.description, i.status as item_status, i.flight_number
            FROM claim c
            JOIN passenger p ON c.passenger_id = p.passenger_id
            JOIN item i ON c.item_id = i.item_id
            WHERE c.claim_id = ?`,
            [claim_id]
        );

        connection.release();

        if (rows.length > 0) {
            res.json({
                success: true,
                claim: rows[0]
            });
        } else {
            res.json({
                success: false,
                message: 'Claim not found'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// API 11: UPDATE CLAIM STATUS
// ============================================
app.put('/api/claim/:claim_id', async (req, res) => {
    try {
        const claim_id = req.params.claim_id;
        const { status, resolution_date } = req.body;

        const validStatuses = ['Pending', 'Verified', 'Resolved'];
        if (!validStatuses.includes(status)) {
            return res.json({
                success: false,
                message: 'Invalid status'
            });
        }

        const connection = await db.getConnection();

        let query = 'UPDATE claim SET status = ?';
        let params = [status];

        if (resolution_date) {
            query += ', resolution_date = ?';
            params.push(resolution_date);
        }

        query += ' WHERE claim_id = ?';
        params.push(claim_id);

        const [result] = await connection.query(query, params);

        connection.release();

        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: 'Claim status updated'
            });
        } else {
            res.json({
                success: false,
                message: 'Claim not found'
            });
        }
    } catch (error) {
        console.error('Error updating claim:', error);
        res.json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  ✈️  AIRTRACE BACKEND SERVER');
    console.log('═══════════════════════════════════════');
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log(`  📍 API base path: /api`);
    console.log('');
    console.log('  📊 Database Tables:');
    console.log('     - PASSENGER (with first_name, last_name, email, phone_number, passport_number, address)');
    console.log('     - STAFF (with username, password, role)');
    console.log('     - ITEM (luggage tracking with status)');
    console.log('     - CLAIM (passenger claims for items)');
    console.log('     - FLIGHT (flight information)');
    console.log('     - LOCATION (where items are found)');
    console.log('     - CATEGORY (item categories)');
    console.log('');
    console.log('  ✅ Ready to receive requests!');
    console.log('═══════════════════════════════════════');
    console.log('');
});
