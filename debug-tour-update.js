const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://medusa-starter:medusa-password@localhost:5432/medusa-starter'
})

async function checkTourUpdate(tourId) {
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT id, destination, is_special, booking_min_days_ahead, max_capacity, updated_at FROM tour WHERE id = $1',
      [tourId]
    )
    
    if (result.rows.length === 0) {
      console.log(`Tour ${tourId} not found`)
    } else {
      console.log('Current tour state:')
      console.log(JSON.stringify(result.rows[0], null, 2))
    }
  } finally {
    client.release()
    await pool.end()
  }
}

const tourId = process.argv[2] || '01KHPTQ29Q10RM75Z540DT3R07'
checkTourUpdate(tourId).catch(console.error)
