// Clean database initialization script for PostgreSQL
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function cleanInitializeDatabase() {
    // Connect to the default postgres database just to drop/create if needed, 
    // or connect directly to the target DB using DATABASE_URL or environment variables.

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'airtrace',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();

        console.log('🔄 Connected to PostgreSQL. Initializing tables...');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('🔄 Executing schema file...');

        // postgres has robust support for executing multiple statements from one string
        await client.query(`
            DROP TABLE IF EXISTS claim CASCADE;
            DROP TABLE IF EXISTS item CASCADE;
            DROP TABLE IF EXISTS staff CASCADE;
            DROP TABLE IF EXISTS passenger CASCADE;
            DROP TABLE IF EXISTS flight CASCADE;
            DROP TABLE IF EXISTS category CASCADE;
            DROP TABLE IF EXISTS location CASCADE;
        `);

        await client.query(schema);

        console.log('\n✅ Database initialization completed successfully!');
        console.log('📊 All tables created and populated with sample data');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    } finally {
        await client.end();
    }
}

cleanInitializeDatabase();
