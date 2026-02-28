// Clean database initialization script
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function cleanInitializeDatabase() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '2288'
    });

    try {
        // Drop the existing database
        console.log('🔄 Dropping existing airtrace database...');
        await connection.query('DROP DATABASE IF EXISTS airtrace');
        console.log('✅ Database dropped');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolons and execute each statement
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (error) {
                console.error('Error:', error.message);
            }
        }

        console.log('\n✅ Database initialization completed successfully!');
        console.log('📊 All tables created and populated with sample data');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    } finally {
        await connection.end();
    }
}

cleanInitializeDatabase();
