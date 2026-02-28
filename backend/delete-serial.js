const mysql = require('mysql2/promise');

async function deleteSerialNumber() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '2288',
        database: 'airtrace'
    });

    try {
        // Check if item with serial 2288 exists
        const [rows] = await connection.query(
            'SELECT item_id, item_name, serial_number FROM item WHERE serial_number = ?',
            ['2288']
        );

        if (rows.length > 0) {
            console.log('Found item(s) with serial 2288:\n');
            console.table(rows);
            
            // Delete the row
            const [result] = await connection.query(
                'DELETE FROM item WHERE serial_number = ?',
                ['2288']
            );
            
            console.log('\n✅ Successfully deleted ' + result.affectedRows + ' row(s)');
        } else {
            console.log('⚠️ No items found with serial number "2288"\n');
            
            // Show all items
            const [allItems] = await connection.query(
                'SELECT item_id, item_name, serial_number FROM item'
            );
            console.log('Current items in database:\n');
            console.table(allItems);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

deleteSerialNumber();
