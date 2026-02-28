// ============================================
// AIRTRACE BACKEND SERVER (POSTGRESQL)
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// CORS
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
app.use(express.json());

// DATABASE CONNECTION (PostgreSQL Pool)
const db = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'airtrace',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

console.log('✅ PostgreSQL pool created');

// TEST ROUTE 
app.get('/', (req, res) => {
    res.json({ message: '✈️ AirTrace Backend is Running on PostgreSQL!' });
});

// SEARCH ITEMS
app.get('/api/search-items', async (req, res) => {
    try {
        const { flight_number, claim_id, passenger_id } = req.query;

        if (!flight_number && !claim_id && !passenger_id) {
            return res.json({ success: false, message: 'Flight number, claim ID, or passenger ID is required' });
        }

        let query = `
            SELECT 
                i.item_id, i.location_id, i.flight_number, i.category_id,
                i.registered_by_staff, i.item_name, i.description,
                i.serial_number, i.status, i.date_found,
                c.category_name, f.airline_name, f.origin_airport, f.arrival_time,
                l.terminal_code, l.zone_type, l.specific_spot
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN flight f ON i.flight_number = f.flight_number
            LEFT JOIN location l ON i.location_id = l.location_id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (flight_number) {
            query += ` AND i.flight_number = $${paramIndex++}`;
            params.push(flight_number);
        }
        if (claim_id) {
            query += ` AND i.item_id IN (SELECT item_id FROM claim WHERE claim_id = $${paramIndex++})`;
            params.push(claim_id);
        }
        if (passenger_id) {
            query += ` AND i.item_id IN (SELECT item_id FROM claim WHERE passenger_id = $${paramIndex++})`;
            params.push(passenger_id);
        }

        const result = await db.query(query, params);

        if (result.rows.length > 0) {
            res.json({ success: true, count: result.rows.length, items: result.rows });
        } else {
            res.json({ success: false, message: 'No items found' });
        }
    } catch (error) {
        console.error('Error in search:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// ADD ITEM
app.post('/api/add-item', async (req, res) => {
    try {
        const { flight_number, item_name, description, serial_number, category_id, location_id, status, date_found, registered_by_staff } = req.body;

        if (!flight_number || !item_name || !category_id || !status) {
            return res.json({ success: false, message: 'Required fields missing: flight_number, item_name, category_id, status' });
        }

        const result = await db.query(
            `INSERT INTO item 
            (flight_number, item_name, description, serial_number, category_id, location_id, status, date_found, registered_by_staff)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING item_id`,
            [flight_number, item_name, description, serial_number, category_id, location_id || null, status, date_found || new Date(), registered_by_staff || null]
        );

        res.json({ success: true, message: 'Item added successfully', id: result.rows[0].item_id });
    } catch (error) {
        console.error('Error adding item:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// CREATE CLAIM
app.post('/api/create-claim', async (req, res) => {
    try {
        const { passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date } = req.body;

        if (!passenger_id || !item_id) {
            return res.json({ success: false, message: 'passenger_id and item_id are required' });
        }

        const result = await db.query(
            `INSERT INTO claim (passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING claim_id`,
            [passenger_id, item_id, claim_date || new Date(), status || 'Pending', proof_of_ownership || null, resolution_date || null]
        );

        res.json({ success: true, message: 'Claim created successfully', claim_id: result.rows[0].claim_id });
    } catch (error) {
        console.error('Error creating claim:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// UPDATE ITEM
app.put('/api/update-item/:item_id', async (req, res) => {
    try {
        const item_id = req.params.item_id;
        const { status, location_id } = req.body;

        const validStatuses = ['Lost', 'Found', 'Returned', 'Verified'];
        if (!validStatuses.includes(status)) {
            return res.json({ success: false, message: 'Invalid status' });
        }

        let query = 'UPDATE item SET status = $1';
        let params = [status];
        let paramIndex = 2;

        if (location_id) {
            query += `, location_id = $${paramIndex++}`;
            params.push(location_id);
        }

        query += ` WHERE item_id = $${paramIndex}`;
        params.push(item_id);

        const result = await db.query(query, params);

        if (result.rowCount > 0) {
            res.json({ success: true, message: 'Item status updated' });
        } else {
            res.json({ success: false, message: 'Item not found' });
        }
    } catch (error) {
        console.error('Error updating item:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// REGISTER PASSENGER
app.post('/api/register-passenger', async (req, res) => {
    try {
        const { first_name, last_name, phone_number, email, passport_number, address } = req.body;

        if (!first_name || !last_name || !email) {
            return res.json({ success: false, message: 'first_name, last_name, and email are required' });
        }

        const result = await db.query(
            `INSERT INTO passenger (first_name, last_name, phone_number, email, passport_number, address)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING passenger_id`,
            [first_name, last_name, phone_number || null, email, passport_number || null, address || null]
        );

        res.json({ success: true, message: 'Passenger registered successfully', passenger_id: result.rows[0].passenger_id });
    } catch (error) {
        console.error('Error registering passenger:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// STAFF LOGIN
app.post('/api/staff-login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, message: 'Username and password required' });
        }

        const result = await db.query(
            'SELECT staff_id, username, role, employee_id FROM staff WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: 'Login successful',
                staff: result.rows[0]
            }
            );
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error in login:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// GET CATEGORIES
app.get('/api/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT category_id, category_name, storage_requirements FROM category');
        res.json({ success: true, categories: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// GET FLIGHTS
app.get('/api/flights', async (req, res) => {
    try {
        const result = await db.query('SELECT flight_number, airline_name, origin_airport, arrival_time FROM flight');
        res.json({ success: true, flights: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// GET LOCATIONS
app.get('/api/locations', async (req, res) => {
    try {
        const result = await db.query('SELECT location_id, terminal_code, zone_type, specific_spot FROM location');
        res.json({ success: true, locations: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// CLAIM DETAILS
app.get('/api/claim/:claim_id', async (req, res) => {
    try {
        const claim_id = req.params.claim_id;
        const result = await db.query(
            `SELECT 
                c.claim_id, c.passenger_id, c.item_id, c.claim_date, c.status, c.proof_of_ownership, c.resolution_date,
                p.first_name, p.last_name, p.email, p.phone_number,
                i.item_name, i.description, i.status as item_status, i.flight_number
            FROM claim c
            JOIN passenger p ON c.passenger_id = p.passenger_id
            JOIN item i ON c.item_id = i.item_id
            WHERE c.claim_id = $1`,
            [claim_id]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, claim: result.rows[0] });
        } else {
            res.json({ success: false, message: 'Claim not found' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// UPDATE CLAIM STATUS
app.put('/api/claim/:claim_id', async (req, res) => {
    try {
        const claim_id = req.params.claim_id;
        const { status, resolution_date } = req.body;

        const validStatuses = ['Pending', 'Verified', 'Resolved'];
        if (!validStatuses.includes(status)) {
            return res.json({ success: false, message: 'Invalid status' });
        }

        let query = 'UPDATE claim SET status = $1';
        let params = [status];
        let paramIndex = 2;

        if (resolution_date) {
            query += `, resolution_date = $${paramIndex++}`;
            params.push(resolution_date);
        }

        query += ` WHERE claim_id = $${paramIndex}`;
        params.push(claim_id);

        const result = await db.query(query, params);

        if (result.rowCount > 0) {
            res.json({ success: true, message: 'Claim status updated' });
        } else {
            res.json({ success: false, message: 'Claim not found' });
        }
    } catch (error) {
        console.error('Error updating claim:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log(`  📍 API base path: /api`);
});
