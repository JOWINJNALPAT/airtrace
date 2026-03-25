// Clean database initialization script for PostgreSQL
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function cleanInitializeDatabase() {
    const config = {
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'airtrace'}`,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    };

    const client = new Client(config);

    try {
        await client.connect();
        console.log('🔄 Connected to PostgreSQL. Initializing tables...');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('🔄 Executing schema file...');

        // pg supports multiple statements in query()
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
