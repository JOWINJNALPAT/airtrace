// ============================================
// AIRTRACE BACKEND SERVER (MySQL)
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

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

// DATABASE CONNECTION (MySQL)
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

console.log('✅ MySQL pool created');

// TEST ROUTE 
app.get('/', (req, res) => {
    res.json({ message: '✈️ AirTrace Backend is Running on MySQL!' });
});

// SEARCH ITEMS
app.get('/api/search-items', async (req, res) => {
    try {
        const { flight_number, claim_id, passenger_id } = req.query;
        if (!flight_number && !claim_id && !passenger_id) {
            return res.json({ success: false, message: 'Required fields missing' });
        }

        const connection = await db.getConnection();
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
        if (flight_number) { query += ' AND i.flight_number = ?'; params.push(flight_number); }
        if (claim_id) { query += ' AND i.item_id IN (SELECT item_id FROM claim WHERE claim_id = ?)'; params.push(claim_id); }
        if (passenger_id) { query += ' AND i.item_id IN (SELECT item_id FROM claim WHERE passenger_id = ?)'; params.push(passenger_id); }

        const [rows] = await connection.query(query, params);
        connection.release();

        res.json({ success: true, count: rows.length, items: rows });
    } catch (error) {
        console.error('Search error:', error);
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// ADD ITEM
app.post('/api/add-item', async (req, res) => {
    try {
        const { flight_number, item_name, description, serial_number, category_id, location_id, status, date_found, registered_by_staff } = req.body;
        const connection = await db.getConnection();
        const [result] = await connection.query(
            `INSERT INTO item (flight_number, item_name, description, serial_number, category_id, location_id, status, date_found, registered_by_staff)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [flight_number, item_name, description, serial_number, category_id, location_id || null, status, date_found || new Date(), registered_by_staff || null]
        );
        connection.release();
        res.json({ success: true, message: 'Item added', id: result.insertId });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// CREATE CLAIM
app.post('/api/create-claim', async (req, res) => {
    try {
        const { passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date } = req.body;
        const connection = await db.getConnection();
        const [result] = await connection.query(
            `INSERT INTO claim (passenger_id, item_id, claim_date, status, proof_of_ownership, resolution_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [passenger_id, item_id, claim_date || new Date(), status || 'Pending', proof_of_ownership || null, resolution_date || null]
        );
        connection.release();
        res.json({ success: true, claim_id: result.insertId });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// UPDATE ITEM STATUS
app.put('/api/update-item/:item_id', async (req, res) => {
    try {
        const { status, location_id } = req.body;
        const item_id = req.params.item_id;
        const connection = await db.getConnection();
        let query = 'UPDATE item SET status = ?';
        let params = [status];
        if (location_id) { query += ', location_id = ?'; params.push(location_id); }
        query += ' WHERE item_id = ?';
        params.push(item_id);
        const [result] = await connection.query(query, params);
        connection.release();
        res.json({ success: result.affectedRows > 0 });
    } catch (error) {
        res.json({ success: false, message: 'Server error: ' + error.message });
    }
});

// STAFF LOGIN (Simplified for now)
app.post('/api/staff-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const connection = await db.getConnection();
        const [rows] = await connection.query('SELECT * FROM staff WHERE username = ? AND password = ?', [username, password]);
        connection.release();
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
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM category');
    connection.release();
    res.json({ success: true, categories: rows });
});
app.get('/api/flights', async (req, res) => {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM flight');
    connection.release();
    res.json({ success: true, flights: rows });
});
app.get('/api/locations', async (req, res) => {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM location');
    connection.release();
    res.json({ success: true, locations: rows });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
});
