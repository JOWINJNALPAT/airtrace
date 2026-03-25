#!/usr/bin/env node
// Simple serial number updater for AirTrace database (PostgreSQL)
require('dotenv').config();
const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    const config = {
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'airtrace'}`,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    };

    const client = new Client(config);

    try {
        await client.connect();

        // Show current items
        const { rows: items } = await client.query(`
            SELECT item_id, item_name, serial_number FROM item ORDER BY item_id
        `);

        console.log('\n📦 Current Items:\n');
        items.forEach(item => {
            console.log(`  ${item.item_id}. ${item.item_name}`);
            console.log(`     Serial: ${item.serial_number || 'NULL'}\n`);
        });

        // Ask for update
        const itemId = await question('Enter Item ID to update: ');
        const newSerial = await question('Enter new serial number: ');

        if (!itemId || !newSerial) {
            console.log('❌ Item ID and serial number are required');
            await client.end();
            rl.close();
            return;
        }

        // Update
        const result = await client.query(
            'UPDATE item SET serial_number = $1 WHERE item_id = $2',
            [newSerial, parseInt(itemId)]
        );

        if (result.rowCount > 0) {
            console.log(`\n✅ Item ${itemId} updated successfully!`);

            // Show updated item
            const { rows: updated } = await client.query(
                'SELECT item_id, item_name, serial_number FROM item WHERE item_id = $1',
                [parseInt(itemId)]
            );
            console.table(updated);
        } else {
            console.log(`❌ Item ${itemId} not found`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        await client.end();
    }
}

function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

main();
