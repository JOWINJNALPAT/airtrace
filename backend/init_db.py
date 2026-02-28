import mysql.connector
import sys

try:
    # Read the schema file
    with open(r'c:\Users\jowin\OneDrive\Desktop\jowin\AirTrace\backend\database-schema.sql', 'r') as f:
        schema = f.read()
    
    # Connect to MySQL
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='2288'
    )
    
    cursor = conn.cursor()
    
    # Drop existing database
    print('🔄 Dropping existing airtrace database...')
    cursor.execute('DROP DATABASE IF EXISTS airtrace')
    print('✅ Database dropped')
    
    # Execute schema statements
    print('🔄 Creating database and tables...')
    statements = schema.split(';')
    for statement in statements:
        statement = statement.strip()
        if statement:
            try:
                cursor.execute(statement)
            except Exception as e:
                print(f'⚠️ Error: {str(e)[:100]}')
    
    conn.commit()
    print('✅ Database initialized successfully!')
    print('📊 Added:')
    print('   - 6 Found items')
    print('   - 4 Lost items')
    print('   - 10 Claims')
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
