// ============================================
// AIRTRACE BACKEND SERVER (PostgreSQL)
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();

// CORS
const allowed = process.env.ALLOWED_ORIGINS || '*';
app.use(cors({
    origin: function (origin, callback) {
        // allow all for now if no specific list is provided, or check against list
        if (!origin || allowed === '*' || allowed.split(',').includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json());

// DATABASE CONNECTION (PostgreSQL)
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'airtrace',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false
});

db.connect()
    .then(() => console.log('✅ PostgreSQL pool created'))
    .catch(err => console.error('❌ Connection error', err.stack));

// TEST ROUTE 
app.get('/', (req, res) => {
    res.json({ message: '✈️ AirTrace Backend is Running on PostgreSQL!' });
});

// INIT DB ROUTE (Temporary)
app.get('/api/init-db', async (req, res) => {
    try {
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await db.query(`
            DROP TABLE IF EXISTS claim CASCADE;
            DROP TABLE IF EXISTS item CASCADE;
            DROP TABLE IF EXISTS staff CASCADE;
            DROP TABLE IF EXISTS passenger CASCADE;
            DROP TABLE IF EXISTS flight CASCADE;
            DROP TABLE IF EXISTS category CASCADE;
            DROP TABLE IF EXISTS location CASCADE;
        `);
        await db.query(schema);
        res.json({ success: true, message: '✅ Database initialized successfully!' });
    } catch (err) {
        console.error('Init error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// SEARCH ITEMS
app.get('/api/search-items', async (req, res) => {
    try {
        const { flight_number, claim_id, passenger_id } = req.query;
        if (!flight_number && !claim_id && !passenger_id) {
            return res.json({ success: false, message: 'Required fields missing' });
        }

        let query = `
            SELECT i.*, c.category_name, f.airline_name, f.origin_airport, f.arrival_time,
                   l.terminal_code, l.zone_type, l.specific_spot
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN flight f ON i.flight_number = f.flight_number
            LEFT JOIN location l ON i.location_id = l.location_id
            WHERE 1=1
        `;
        let params = [];
        let pIndex = 1;
        if (flight_number) { query += ` AND UPPER(i.flight_number) = UPPER($${pIndex++})`; params.push(flight_number); }
        if (claim_id) { query += ` AND i.item_id IN (SELECT item_id FROM claim WHERE claim_id = $${pIndex++})`; params.push(claim_id); }
        if (passenger_id) { query += ` AND (i.passenger_id = $${pIndex} OR i.item_id IN (SELECT item_id FROM claim WHERE passenger_id = $${pIndex}))`; params.push(passenger_id); pIndex++; }

        const { rows } = await db.query(query, params);

        res.json({ success: true, count: rows.length, items: rows });
    } catch (error) {
        console.error('Search error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// ADD ITEM
app.post('/api/add-item', async (req, res) => {
    try {
        const { flight_number, item_name, description, serial_number, category_id, location_id, status, date_found, registered_by_staff_id, passenger_id } = req.body;
        const { rows } = await db.query(
            `INSERT INTO item (flight_number, item_name, description, serial_number, category_id, location_id, status, date_found, registered_by_staff_id, passenger_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING item_id`,
            [flight_number, item_name, description, serial_number, category_id, location_id || null, status, date_found || new Date(), registered_by_staff_id || null, passenger_id || null]
        );
        res.json({ success: true, message: 'Item added', id: rows[0].item_id });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// CREATE CLAIM
app.post('/api/create-claim', async (req, res) => {
    try {
        const { passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date, processed_by_staff_id } = req.body;
        const { rows } = await db.query(
            `INSERT INTO claim (passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date, processed_by_staff_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING claim_id`,
            [passenger_id, item_id, claim_date || new Date(), status || 'Pending', proof_of_ownership || null, resolution_date || null, processed_by_staff_id || null]
        );
        res.json({ success: true, claim_id: rows[0].claim_id });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// UPDATE ITEM STATUS
app.put('/api/update-item/:item_id', async (req, res) => {
    try {
        const { status, location_id } = req.body;
        const item_id = req.params.item_id;

        let query = 'UPDATE item SET status = $1';
        let params = [status];
        let pIndex = 2;
        if (location_id) { query += `, location_id = $${pIndex++}`; params.push(location_id); }
        query += ` WHERE item_id = $${pIndex++}`;
        params.push(item_id);

        const result = await db.query(query, params);
        res.json({ success: result.rowCount > 0 });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// STAFF LOGIN (Simplified for now)
app.post('/api/staff-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const { rows } = await db.query('SELECT * FROM staff WHERE username = $1 AND password = $2', [username, password]);
        if (rows.length > 0) {
            res.json({ success: true, staff: rows[0] });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// GET UTILITIES (Categories, Flights, Locations)
app.get('/api/categories', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM category');
        res.json({ success: true, categories: rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});
app.get('/api/flights', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM flight');
        res.json({ success: true, flights: rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});
app.get('/api/locations', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM location');
        res.json({ success: true, locations: rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// --------------------------------------------
// PASSENGER-DRIVEN REPORTING (Lost Item + Claim)
// --------------------------------------------
app.post('/api/passenger-report', async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const {
            first_name, last_name, email, phone_number, passport_number,
            flight_number, category_id, item_name, description, serial_number
        } = req.body;

        // 1. Ensure Passenger exists or create new
        let passengerId;
        const pCheck = await client.query('SELECT passenger_id FROM passenger WHERE email = $1', [email]);
        if (pCheck.rows.length > 0) {
            passengerId = pCheck.rows[0].passenger_id;
        } else {
            const pInsert = await client.query(
                `INSERT INTO passenger (first_name, last_name, email, phone_number, passport_number)
                 VALUES ($1, $2, $3, $4, $5) RETURNING passenger_id`,
                [first_name, last_name, email, phone_number, passport_number]
            );
            passengerId = pInsert.rows[0].passenger_id;
        }

        // 2. Create Lost Item
        const iInsert = await client.query(
            `INSERT INTO item (item_name, description, serial_number, status, flight_number, category_id, passenger_id)
             VALUES ($1, $2, $3, 'Lost', $4, $5, $6) RETURNING item_id`,
            [item_name, description, serial_number, flight_number, category_id, passengerId]
        );
        const itemId = iInsert.rows[0].item_id;

        // 3. Create Claim
        const cInsert = await client.query(
            `INSERT INTO claim (passenger_id, item_id, status)
             VALUES ($1, $2, 'Pending') RETURNING claim_id`,
            [passengerId, itemId]
        );
        const claimId = cInsert.rows[0].claim_id;

        await client.query('COMMIT');
        res.json({ success: true, message: 'Report submitted successfully', claim_id: claimId, passenger_id: passengerId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Report Error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    } finally {
        client.release();
    }
});

// DASHBOARD STATS (For Admin Overview)
app.get('/api/stats', async (req, res) => {
    try {
        const itemRes = await db.query("SELECT COUNT(*) FROM item WHERE status = 'Found'");
        const claimRes = await db.query("SELECT COUNT(*) FROM claim WHERE status = 'Pending'");
        const verifiedRes = await db.query("SELECT COUNT(*) FROM claim WHERE status = 'Verified'");
        const flightRes = await db.query("SELECT COUNT(*) FROM flight");

        res.json({
            success: true,
            totalFound: itemRes.rows[0].count,
            pendingClaims: claimRes.rows[0].count,
            verified: verifiedRes.rows[0].count,
            flights: flightRes.rows[0].count
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// GET ALL CLAIMS (For Staff)
app.get('/api/claims', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT c.*, p.first_name, p.last_name, i.item_name, i.status as item_status
            FROM claim c
            JOIN passenger p ON c.passenger_id = p.passenger_id
            JOIN item i ON c.item_id = i.item_id
            ORDER BY c.claim_date DESC
            LIMIT 50
        `);
        res.json({ success: true, claims: rows });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
});
