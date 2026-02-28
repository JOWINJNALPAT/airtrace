#!/usr/bin/env node
// Simple serial number updater for AirTrace database

const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '2288',
        database: 'airtrace'
    });

    try {
        // Show current items
        const [items] = await connection.query(`
            SELECT item_id, item_name, serial_number FROM item ORDER BY item_id
        `);

        console.log('\n📦 Current Items:\n');
        items.forEach(item => {
            console.log(`  ${item.item_id}. ${item.item_name}`);
            console.log(`     Serial: ${item.serial_number || 'NULL'}\n`);
        });

        // Ask for update
        const itemId = await question('Enter Item ID to update (1-6): ');
        const newSerial = await question('Enter new serial number: ');

        if (!itemId || !newSerial) {
            console.log('❌ Item ID and serial number are required');
            await connection.end();
            return;
        }

        // Update
        const result = await connection.query(
            'UPDATE item SET serial_number = ? WHERE item_id = ?',
            [newSerial, parseInt(itemId)]
        );

        if (result[0].affectedRows > 0) {
            console.log(`\n✅ Item ${itemId} updated successfully!`);
            
            // Show updated item
            const [updated] = await connection.query(
                'SELECT item_id, item_name, serial_number FROM item WHERE item_id = ?',
                [itemId]
            );
            console.table(updated);
        } else {
            console.log(`❌ Item ${itemId} not found`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        await connection.end();
    }
}

function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

main();
