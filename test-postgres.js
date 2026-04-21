const { Client } = require('pg')

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('POSTGRES OK')
  } catch (err) {
    console.error('POSTGRES FAIL')
    console.error(err)
  } finally {
    await client.end().catch(() => {})
  }
}

run()
