// Update serial numbers in the database (PostgreSQL)
require('dotenv').config();
const { Client } = require('pg');

async function updateSerialNumbers() {
    const config = {
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'airtrace'}`,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    };

    const client = new Client(config);

    try {
        await client.connect();
        console.log('📊 Current items and serial numbers:\n');
        const { rows } = await client.query('SELECT item_id, item_name, serial_number FROM item');
        console.table(rows);

        const updates = [
            { item_id: 1, serial: 'SN-BA123-BLK-2026-001' },
            { item_id: 2, serial: 'SN-AA456-BLU-2026-002' },
            { item_id: 3, serial: 'SN-LH789-CAM-2026-003' },
            { item_id: 4, serial: 'SN-BA123-RED-2026-004' },
            { item_id: 5, serial: 'SN-AA456-LTH-2026-005' },
            { item_id: 6, serial: 'SN-LH789-SUN-2026-006' }
        ];

        console.log('🔄 Updating serial numbers with unique identifiers...\n');
        for (const update of updates) {
            try {
                await client.query(
                    'UPDATE item SET serial_number = $1 WHERE item_id = $2',
                    [update.serial, update.item_id]
                );
                console.log(`✅ Item ${update.item_id}: Updated to ${update.serial}`);
            } catch (error) {
                console.error(`❌ Error updating item ${update.item_id}:`, error.message);
            }
        }

        console.log('\n✅ Serial numbers updated successfully!');

        console.log('\n📊 Updated items:\n');
        const { rows: updatedRows } = await client.query('SELECT item_id, item_name, serial_number FROM item');
        console.table(updatedRows);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

updateSerialNumbers();
