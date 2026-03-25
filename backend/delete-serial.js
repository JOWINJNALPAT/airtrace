require('dotenv').config();
const { Client } = require('pg');

async function deleteSerialNumber() {
    const config = {
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'airtrace'}`,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    };

    const client = new Client(config);

    try {
        await client.connect();

        // Check if item with serial 2288 exists
        const { rows } = await client.query(
            'SELECT item_id, item_name, serial_number FROM item WHERE serial_number = $1',
            ['2288']
        );

        if (rows.length > 0) {
            console.log('Found item(s) with serial 2288:\n');
            console.table(rows);

            // Delete the row
            const result = await client.query(
                'DELETE FROM item WHERE serial_number = $1',
                ['2288']
            );

            console.log('\n✅ Successfully deleted ' + result.rowCount + ' row(s)');
        } else {
            console.log('⚠️ No items found with serial number "2288"\n');

            // Show all items
            const { rows: allItems } = await client.query(
                'SELECT item_id, item_name, serial_number FROM item'
            );
            console.log('Current items in database:\n');
            console.table(allItems);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

deleteSerialNumber();
