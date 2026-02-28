// Update serial numbers in the database
const mysql = require('mysql2/promise');

async function updateSerialNumbers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '2288',
        database: 'airtrace'
    });

    try {
        console.log('📊 Current items and serial numbers:\n');
        const [rows] = await connection.query('SELECT item_id, item_name, serial_number FROM item');
        console.table(rows);

        console.log('\n\n💡 To update a serial number, modify the values below and run:');
        console.log('\nExample: Update item_id 1 with serial number "SN-BA123-001"');
        console.log('Command: UPDATE item SET serial_number = "SN-BA123-001" WHERE item_id = 1;\n');

        // Example updates with unique serial numbers
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
                await connection.query(
                    'UPDATE item SET serial_number = ? WHERE item_id = ?',
                    [update.serial, update.item_id]
                );
                console.log(`✅ Item ${update.item_id}: Updated to ${update.serial}`);
            } catch (error) {
                console.error(`❌ Error updating item ${update.item_id}:`, error.message);
            }
        }

        console.log('\n✅ Serial numbers updated successfully!');
        
        // Show updated items
        console.log('\n📊 Updated items:\n');
        const [updatedRows] = await connection.query('SELECT item_id, item_name, serial_number FROM item');
        console.table(updatedRows);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

updateSerialNumbers();
