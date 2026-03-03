// Quick debug script to check is_special in database
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://medusa-starter:medusa-password@localhost:5432/medusa-starter'
})

async function checkTourSchema() {
  const client = await pool.connect()
  try {
    // Check table schema
    const schemaQuery = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'tour'
      ORDER BY ordinal_position;
    `)
    
    console.log('\n========== TOUR TABLE SCHEMA ==========')
    schemaQuery.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (default: ${row.column_default})`)
    })
    
    // Query actual tour data
    const dataQuery = await client.query(`
      SELECT id, destination, is_special, booking_min_days_ahead, max_capacity
      FROM tour
      WHERE deleted_at IS NULL
      LIMIT 3;
    `)
    
    console.log('\n========== SAMPLE TOUR DATA ==========')
    dataQuery.rows.forEach(tour => {
      console.log(JSON.stringify(tour, null, 2))
    })
    
  } finally {
    client.release()
    await pool.end()
  }
}

checkTourSchema().catch(console.error)
