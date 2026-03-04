require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDatabase() {
  try {
    console.log('🔍 Checking PostgreSQL connection...');
    const client = await pool.connect();
    try {
      // Simple check: select a row from products
      const res = await client.query('SELECT id FROM products LIMIT 1');
      console.log('✅ Products table exists; sample rows:', res.rowCount);
    } catch (err) {
      console.error('❌ Query error (products table?):', err.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
