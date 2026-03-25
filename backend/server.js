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
        if (!origin || allowed === '*' || allowed.split(',').includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json());

// DATABASE CONNECTION (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'airtrace'}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Test Connection
(async () => {
    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL pool connected');
        client.release();
    } catch (err) {
        console.error('❌ PostgreSQL Connection error:', err.message);
    }
})();

// TEST ROUTE 
app.get('/', (req, res) => {
    res.json({ message: '✈️ AirTrace Backend is Running on PostgreSQL!' });
});

// INIT DB ROUTE (Temporary)
app.get('/api/init-db', async (req, res) => {
    try {
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
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
                   l.terminal_code, l.zone_type, l.specific_spot,
                   cl.passenger_id
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN flight f ON i.flight_number = f.flight_number
            LEFT JOIN location l ON i.location_id = l.location_id
            LEFT JOIN claim cl ON i.item_id = cl.item_id
            WHERE 1=1
        `;
        let params = [];
        let counter = 1;

        if (flight_number) {
            query += ` AND UPPER(i.flight_number) = UPPER($${counter})`;
            params.push(flight_number);
            counter++;
        }
        if (claim_id) {
            query += ` AND i.item_id IN (SELECT item_id FROM claim WHERE claim_id = $${counter})`;
            params.push(claim_id);
            counter++;
        }
        if (passenger_id) {
            query += ` AND i.item_id IN (SELECT item_id FROM claim WHERE passenger_id = $${counter})`;
            params.push(passenger_id);
            counter++;
        }

        const { rows } = await pool.query(query, params);

        res.json({ success: true, count: rows.length, items: rows });
    } catch (error) {
        console.error('Search error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

app.post('/api/add-item', async (req, res) => {
    try {
        const { flight_number, item_name, description, serial_number, baggage_id, category_id, location_id, status, date_found, registered_by_staff_id, passenger_id } = req.body;

        const cleanSerial = (serial_number && serial_number.trim() !== "") ? serial_number.trim() : null;
        const cleanBaggage = (baggage_id && baggage_id.trim() !== "") ? baggage_id.trim() : null;

        const { rows } = await pool.query(
            `INSERT INTO item (item_name, description, serial_number, baggage_id, status, date_found, passenger_id, registered_by_staff_id, flight_number, location_id, category_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING item_id`,
            [
                item_name,
                description,
                cleanSerial,
                cleanBaggage,
                status || 'Found',
                date_found || new Date(),
                passenger_id || null,
                registered_by_staff_id || null,
                flight_number,
                location_id || null,
                category_id
            ]
        );
        res.json({ success: true, message: 'Item added', id: rows[0].item_id });
    } catch (error) {
        console.error('Add Item Error:', error);
        if (error.code === '23505') { // PostgreSQL unique violation
            const field = error.detail.includes('serial_number') ? 'Serial Number' : 'Baggage ID';
            return res.json({ success: false, message: `⚠️ Duplicate Error: This ${field} is already registered.` });
        }
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// CREATE CLAIM
app.post('/api/create-claim', async (req, res) => {
    try {
        const { passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date, processed_by_staff_id } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO claim (passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date, processed_by_staff_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING claim_id`,
            [passenger_id, item_id, claim_date || new Date(), status || 'Pending', proof_of_ownership || null, resolution_date || null, processed_by_staff_id || null]
        );
        res.json({ success: true, claim_id: rows[0].claim_id });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// UPDATE ITEM STATUS
app.put('/api/update-item/:item_id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { status, location_id, proof_of_ownership, sync_claim } = req.body;
        const item_id = req.params.item_id;

        // 1. Update Item
        let itemQuery = 'UPDATE item SET status = $1';
        let itemParams = [status];
        let counter = 2;

        if (location_id) {
            itemQuery += `, location_id = $${counter}`;
            itemParams.push(location_id);
            counter++;
        }
        itemQuery += ` WHERE item_id = $${counter}`;
        itemParams.push(item_id);

        const itemResult = await client.query(itemQuery, itemParams);

        // 2. Sync with Claim if requested
        if (sync_claim) {
            let claimStatus = status;
            if (status === 'Returned') claimStatus = 'Resolved';

            let claimQuery = 'UPDATE claim SET status = $1';
            let claimParams = [claimStatus];
            let cCounter = 2;

            if (proof_of_ownership !== undefined) {
                claimQuery += `, proof_of_ownership = $${cCounter}`;
                claimParams.push(proof_of_ownership);
                cCounter++;
            }

            if (status === 'Returned' || status === 'Resolved') {
                claimQuery += `, resolution_date = $${cCounter}`;
                claimParams.push(new Date());
                cCounter++;
            }

            claimQuery += ` WHERE item_id = $${cCounter}`;
            claimParams.push(item_id);

            await client.query(claimQuery, claimParams);
        }

        await client.query('COMMIT');
        res.json({ success: itemResult.rowCount > 0 });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update Item Error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    } finally {
        client.release();
    }
});

// STAFF LOGIN
app.post('/api/staff-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const { rows } = await pool.query('SELECT * FROM staff WHERE username = $1 AND password = $2', [username, password]);
        if (rows.length > 0) {
            res.json({ success: true, staff: rows[0] });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// STAFF/ADMIN REGISTRATION
app.post('/api/register-staff', async (req, res) => {
    try {
        const { username, password, role, employee_id } = req.body;
        
        // Simple validation
        if (!username || !password || !role) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const { rows } = await pool.query(
            `INSERT INTO staff (username, password, role, employee_id)
             VALUES ($1, $2, $3, $4)
             RETURNING staff_id, username, role`,
            [username, password, role, employee_id || null]
        );
        res.json({ success: true, staff: rows[0] });
    } catch (error) {
        console.error('Registration Error:', error);
        if (error.code === '23505') { 
            return res.json({ success: false, message: '⚠️ User with that username or employee ID already exists.' });
        }
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// GET UTILITIES
app.get('/api/categories', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM category');
        res.json({ success: true, categories: rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});
app.get('/api/flights', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM flight');
        res.json({ success: true, flights: rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});
app.get('/api/locations', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM location');
        res.json({ success: true, locations: rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// PASSENGER-DRIVEN REPORTING
app.post('/api/passenger-report', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const {
            first_name, last_name, email, phone_number, passport_number,
            flight_number, category_id, item_name, description, serial_number
        } = req.body;

        let passengerId;
        const pCheck = await client.query('SELECT passenger_id FROM passenger WHERE email = $1', [email]);
        if (pCheck.rows.length > 0) {
            passengerId = pCheck.rows[0].passenger_id;
        } else {
            const pInsert = await client.query(
                `INSERT INTO passenger (first_name, last_name, email, phone_number, passport_number)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING passenger_id`,
                [first_name, last_name, email, phone_number, passport_number]
            );
            passengerId = pInsert.rows[0].passenger_id;
        }

        const cleanSerial = (serial_number && serial_number.trim() !== "") ? serial_number.trim() : null;
        const cleanBaggage = (req.body.baggage_id && req.body.baggage_id.trim() !== "") ? req.body.baggage_id.trim() : null;

        const iInsert = await client.query(
            `INSERT INTO item (item_name, description, serial_number, baggage_id, status, passenger_id, flight_number, category_id)
             VALUES ($1, $2, $3, $4, 'Lost', $5, $6, $7)
             RETURNING item_id`,
            [item_name, description, cleanSerial, cleanBaggage, passengerId, flight_number, category_id]
        );
        const itemId = iInsert.rows[0].item_id;

        const cInsert = await client.query(
            `INSERT INTO claim (passenger_id, item_id, status)
             VALUES ($1, $2, 'Pending')
             RETURNING claim_id`,
            [passengerId, itemId]
        );
        const claimId = cInsert.rows[0].claim_id;

        await client.query('COMMIT');
        res.json({ success: true, message: 'Report submitted successfully', claim_id: claimId, passenger_id: passengerId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Report Error:', error);
        if (error.code === '23505') {
            return res.json({ success: false, message: '⚠️ Duplicate Error: This item or serial number has already been reported.' });
        }
        res.json({ success: false, message: 'Server error: ' + error.message });
    } finally {
        client.release();
    }
});

// DASHBOARD STATS
app.get('/api/stats', async (req, res) => {
    try {
        const itemRows = await pool.query("SELECT COUNT(*) as count FROM item WHERE status = 'Found'");
        const claimRows = await pool.query("SELECT COUNT(*) as count FROM claim WHERE status = 'Pending'");
        const verifiedRows = await pool.query("SELECT COUNT(*) as count FROM claim WHERE status = 'Verified'");
        const flightRows = await pool.query("SELECT COUNT(*) as count FROM flight");

        res.json({
            success: true,
            totalFound: parseInt(itemRows.rows[0].count),
            pendingClaims: parseInt(claimRows.rows[0].count),
            verified: parseInt(verifiedRows.rows[0].count),
            flights: parseInt(flightRows.rows[0].count)
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// GET ALL CLAIMS
app.get('/api/claims', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.*, p.first_name, p.last_name, i.item_name, i.status as item_status,
                   l.terminal_code, l.zone_type, l.specific_spot
            FROM claim c
            JOIN passenger p ON c.passenger_id = p.passenger_id
            JOIN item i ON c.item_id = i.item_id
            LEFT JOIN location l ON i.location_id = l.location_id
            ORDER BY c.claim_date DESC
            LIMIT 50
        `);
        res.json({ success: true, claims: rows });
    } catch (error) {
        console.error('Get Claims Error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// PASSENGER LOGIN
app.post('/api/passenger-login', async (req, res) => {
    try {
        const { email, password_or_passport } = req.body;
        // Simple auth using passport number as password
        const { rows } = await pool.query('SELECT * FROM passenger WHERE email = $1 AND passport_number = $2', [email, password_or_passport]);
        if (rows.length > 0) {
            res.json({ success: true, passenger: rows[0] });
        } else {
            res.json({ success: false, message: 'Invalid email or passport number' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// PASSENGER ITEMS
app.get('/api/passenger-items/:passenger_id', async (req, res) => {
    try {
        const { passenger_id } = req.params;
        const { rows } = await pool.query(`
            SELECT i.*, c.category_name, f.airline_name, 
                   cl.claim_id, cl.status as claim_status
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN flight f ON i.flight_number = f.flight_number
            LEFT JOIN claim cl ON i.item_id = cl.item_id
            WHERE i.passenger_id = $1
            ORDER BY i.date_found DESC
        `, [passenger_id]);
        res.json({ success: true, items: rows });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
});
